import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { z } from "zod";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, ySceneRoot } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { GridPointSchema, type GridPoint } from "../../types";
import {
  getNearestValidContainer,
  findNodeById,
  createYCanvasNode,
  canMergeStrokeToNode,
  isNodeLocked,
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
    GridManager.setPoints(layer, points);
    set({ scratchLayer: layer });
  },

  addScratchPoints: (rawPoints) => {
    const points = z.array(GridPointSchema).parse(rawPoints);
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      GridManager.setPoints(layer, points);
      return { scratchLayer: layer };
    });
  },

  commitScratch: () => {
    const { scratchLayer, activeNodeId, tool } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;

    const points: GridPoint[] = [];
    GridManager.iterate(scratchLayer, (char, x, y) =>
      points.push({ x, y, char })
    );
    if (points.length === 0) return;

    transactWithHistory(() => {
      let container = getNearestValidContainer(ySceneRoot, activeNodeId);

      if (container.get("type") === "root") {
        const rootChildren = container.get("children") as Y.Array<
          Y.Map<unknown>
        >;
        const autoLayer = createYCanvasNode(
          "layer",
          `Layer ${rootChildren.length + 1}`
        );
        rootChildren.push([autoLayer]);
        container = autoLayer;
      }

      const activeNode = activeNodeId
        ? findNodeById(ySceneRoot, activeNodeId)
        : null;
      const isPathTool =
        tool === "brush" || tool === "line" || tool === "stepline";
      const shouldMerge = isPathTool && canMergeStrokeToNode(activeNode);

      if (shouldMerge && activeNode) {
        const targetMap = activeNode.get("pathData") as Y.Map<string>;
        const nodeX = (activeNode.get("x") as number) || 0;
        const nodeY = (activeNode.get("y") as number) || 0;

        const localPoints = GridManager.toLocalPoints(points, nodeX, nodeY);
        GridManager.setPoints(targetMap, localPoints);
      } else {
        const { minX, minY, maxX, maxY } =
          GridManager.getGridBounds(scratchLayer);
        let newNode: Y.Map<unknown> | null = null;

        if (isPathTool) {
          const localPoints = GridManager.toLocalPoints(points, minX, minY);
          newNode = createYCanvasNode(
            "shape-path",
            tool === "brush" ? "Path" : "Line",
            { x: minX, y: minY, pathData: localPoints }
          );
        } else if (tool === "box" || tool === "circle") {
          newNode = createYCanvasNode(
            tool === "box" ? "shape-box" : "shape-circle",
            tool === "box" ? "Box" : "Circle",
            {
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
            }
          );
        }

        if (newNode) {
          let children = container.get("children") as Y.Array<Y.Map<unknown>>;
          if (!children) {
            children = new Y.Array<Y.Map<unknown>>();
            container.set("children", children);
          }
          children.push([newNode]);
          set({ activeNodeId: newNode.get("id") as string });
        }
      }
    });

    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),

  clearCanvas: () => {
    const { activeNodeId } = get();
    const node = activeNodeId ? findNodeById(ySceneRoot, activeNodeId) : null;

    if (node && !isNodeLocked(node)) {
      transactWithHistory(() => {
        const type = node.get("type") as string;
        if (type === "shape-path") {
          (node.get("pathData") as Y.Map<string>).clear();
        } else {
          const content = node.get("content") as Y.Map<string>;
          if (content) content.clear();
        }
      });
    }
  },

  erasePoints: (points) => {
    const { activeNodeId } = get();
    const node = activeNodeId ? findNodeById(ySceneRoot, activeNodeId) : null;

    if (canMergeStrokeToNode(node)) {
      transactWithHistory(() => {
        const pathData = node!.get("pathData") as Y.Map<string>;
        const nodeX = (node!.get("x") as number) || 0;
        const nodeY = (node!.get("y") as number) || 0;

        points.forEach((p) =>
          pathData.delete(GridManager.toKey(p.x - nodeX, p.y - nodeY))
        );
      });
    }
  },
});
