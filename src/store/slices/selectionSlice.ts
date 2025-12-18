import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { toast } from "sonner";
import type { CanvasState, SelectionSlice } from "../interfaces";
import { performTransaction, forceHistorySave } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getSelectionBounds } from "../../utils/selection";
import { exportSelectionToString } from "../../utils/export";
import { getActiveGridYMap } from "../utils";
import { SelectionAreaSchema } from "../../types";

export const createSelectionSlice: StateCreator<
  CanvasState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selections: [],

  addSelection: (rawArea) => {
    const area = SelectionAreaSchema.parse(rawArea);
    set((s) => ({ selections: [...s.selections, area] }));
  },

  clearSelections: () => set({ selections: [] }),

  deleteSelection: () => {
    const { selections, activeNodeId, grid } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;

    performTransaction(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const head = GridManager.snapToCharStart({ x, y }, grid);
            targetGrid.delete(GridManager.toKey(head.x, head.y));
          }
        }
      });
    });
    forceHistorySave();
  },

  fillSelections: () => {
    const { selections, brushChar } = get();
    if (selections.length > 0) get().fillSelectionsWithChar(brushChar);
  },

  fillSelectionsWithChar: (char: string) => {
    const { selections, activeNodeId } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;

    const charWidth = GridManager.getCharWidth(char);
    performTransaction(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x += charWidth) {
            if (x > maxX) break;
            targetGrid.set(GridManager.toKey(x, y), char);
            if (charWidth === 2 && x + 1 <= maxX)
              targetGrid.delete(GridManager.toKey(x + 1, y));
          }
        }
      });
    });
    forceHistorySave();
  },

  copySelectionToClipboard: () => {
    const { grid, selections } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  },

  cutSelectionToClipboard: () => {
    const { grid, selections, deleteSelection } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => {
      deleteSelection();
      toast.success("Cut!");
    });
  },
});
