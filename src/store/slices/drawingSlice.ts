import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { z } from "zod";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, ySceneRoot } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { GridPointSchema } from "../../types";
import {
  getNearestValidContainer,
  findNodeById,
  createYCanvasNode,
} from "../../utils/scene";

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
    const { scratchLayer, activeNodeId, tool } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;

    transactWithHistory(() => {
      let container = getNearestValidContainer(ySceneRoot, activeNodeId);

      if (container.get("type") === "root") {
        const currentLayers = ySceneRoot.get("children") as Y.Array<
          Y.Map<unknown>
        >;
        const autoLayer = createYCanvasNode(
          "layer",
          `Layer ${currentLayers.length + 1}`
        );
        currentLayers.push([autoLayer]);
        container = autoLayer;
      }

      const { minX, minY, maxX, maxY } =
        GridManager.getGridBounds(scratchLayer);

      const pathData = [] as { x: number; y: number; char: string }[];
      if (
        tool === "brush" ||
        tool === "line" ||
        tool === "stepline" ||
        tool === "eraser"
      ) {
        scratchLayer.forEach((char, key) => {
          const { x, y } = GridManager.fromKey(key);
          pathData.push({ x, y, char });
        });
      }

      let newNode: Y.Map<unknown> | null = null;

      if (tool === "brush") {
        const activeNode = activeNodeId
          ? findNodeById(ySceneRoot, activeNodeId)
          : null;
        if (
          activeNode &&
          activeNode.get("type") === "shape-path" &&
          !(activeNode.get("isLocked") as boolean)
        ) {
          const pathDataMap = activeNode.get("pathData") as Y.Map<string>;
          scratchLayer.forEach((char, key) => pathDataMap.set(key, char));
          set({ scratchLayer: null });
          return;
        }
        newNode = createYCanvasNode("shape-path", "Path", { pathData });
      } else if (tool === "box") {
        newNode = createYCanvasNode("shape-box", "Box", {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        });
      } else if (tool === "circle") {
        newNode = createYCanvasNode("shape-circle", "Circle", {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        });
      } else if (tool === "line" || tool === "stepline") {
        newNode = createYCanvasNode(
          "shape-path",
          tool === "line" ? "Line" : "Step Line",
          { pathData }
        );
      }

      if (newNode) {
        (container.get("children") as Y.Array<Y.Map<unknown>>).push([newNode]);
        set({ activeNodeId: newNode.get("id") as string });
      }
    });

    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),

  clearCanvas: () => {
    const { activeNodeId } = get();
    const node = activeNodeId ? findNodeById(ySceneRoot, activeNodeId) : null;
    if (node) {
      transactWithHistory(() => {
        const type = node.get("type") as string;
        if (type === "shape-path") {
          (node.get("pathData") as Y.Map<string>).clear();
        } else if (type === "layer") {
          const children = node.get("children") as Y.Array<Y.Map<unknown>>;
          if (children) children.delete(0, children.length);
          const content = node.get("content") as Y.Map<string>;
          if (content) content.clear();
        }
      });
    }
  },

  erasePoints: (points) => {
    const { activeNodeId } = get();
    const node = activeNodeId ? findNodeById(ySceneRoot, activeNodeId) : null;
    if (node && node.get("type") === "shape-path") {
      transactWithHistory(() => {
        const pathData = node.get("pathData") as Y.Map<string>;
        points.forEach((p) => pathData.delete(GridManager.toKey(p.x, p.y)));
      });
    }
  },
});
