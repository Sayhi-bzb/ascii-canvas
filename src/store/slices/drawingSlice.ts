import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { z } from "zod";
import { toast } from "sonner";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { performTransaction, forceHistorySave } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getActiveGridYMap } from "../utils";
import { GridPointSchema } from "../../types";

export const createDrawingSlice: StateCreator<
  CanvasState,
  [],
  [],
  DrawingSlice
> = (set, get) => ({
  scratchLayer: null,

  setScratchLayer: (rawPoints) => {
    const points = z.array(GridPointSchema).parse(rawPoints);

    const layer = new Map<string, string>();
    points.forEach((p) => layer.set(GridManager.toKey(p.x, p.y), p.char));
    set({ scratchLayer: layer });
  },

  addScratchPoints: (rawPoints) => {
    const points = z.array(GridPointSchema).parse(rawPoints);

    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      points.forEach((p) => layer.set(GridManager.toKey(p.x, p.y), p.char));
      return { scratchLayer: layer };
    });
  },

  commitScratch: () => {
    const { scratchLayer, activeNodeId } = get();
    if (!scratchLayer) return;
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;

    if (!targetGrid) {
      toast.error("Invalid layer", {
        description: "Please select an Item to draw.",
      });
      return;
    }
    performTransaction(() => {
      scratchLayer.forEach((value, key) => {
        const { x, y } = GridManager.fromKey(key);
        const leftChar = targetGrid.get(GridManager.toKey(x - 1, y));
        if (leftChar && GridManager.isWideChar(leftChar))
          targetGrid.delete(GridManager.toKey(x - 1, y));
        if (value === " ") {
          targetGrid.delete(key);
        } else {
          targetGrid.set(key, value);
          if (GridManager.isWideChar(value))
            targetGrid.delete(GridManager.toKey(x + 1, y));
        }
      });
    });
    forceHistorySave();
    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),

  clearCanvas: () => {
    const targetGrid = getActiveGridYMap(
      get().activeNodeId
    ) as Y.Map<string> | null;
    if (targetGrid) {
      performTransaction(() => targetGrid.clear());
      forceHistorySave();
    }
  },

  erasePoints: (points) => {
    const { activeNodeId, grid } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;
    performTransaction(() => {
      points.forEach((p) => {
        const head = GridManager.snapToCharStart(p, grid);
        targetGrid.delete(GridManager.toKey(head.x, head.y));
      });
    });
  },
});
