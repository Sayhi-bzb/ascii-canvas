import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { z } from "zod";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, ySceneRoot } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { GridPointSchema } from "../../types";
import { getNearestValidContainer, findNodeById } from "../../utils/scene";

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
        const autoLayer = new Y.Map<unknown>();
        const layerId = crypto.randomUUID();
        autoLayer.set("id", layerId);
        autoLayer.set("type", "layer");
        autoLayer.set(
          "name",
          "Layer " +
            ((ySceneRoot.get("children") as Y.Array<Y.Map<unknown>>).length + 1)
        );
        autoLayer.set("x", 0);
        autoLayer.set("y", 0);
        autoLayer.set("isVisible", true);
        autoLayer.set("isLocked", false);
        autoLayer.set("content", new Y.Map<string>());
        autoLayer.set("children", new Y.Array<Y.Map<unknown>>());
        (ySceneRoot.get("children") as Y.Array<Y.Map<unknown>>).push([
          autoLayer,
        ]);
        container = autoLayer;
      }

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      scratchLayer.forEach((_, key) => {
        const { x, y } = GridManager.fromKey(key);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });

      const newNode = new Y.Map<unknown>();
      const id = crypto.randomUUID();
      newNode.set("id", id);
      newNode.set("isVisible", true);
      newNode.set("isLocked", false);
      newNode.set("children", new Y.Array<Y.Map<unknown>>());

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
        newNode.set("type", "shape-path");
        newNode.set("name", "Path");
        newNode.set("x", 0);
        newNode.set("y", 0);
        const pathDataMap = new Y.Map<string>();
        scratchLayer.forEach((v, k) => pathDataMap.set(k, v));
        newNode.set("pathData", pathDataMap);
      } else if (tool === "box") {
        newNode.set("type", "shape-box");
        newNode.set("name", "Box");
        newNode.set("x", minX);
        newNode.set("y", minY);
        newNode.set("width", maxX - minX + 1);
        newNode.set("height", maxY - minY + 1);
      } else if (tool === "circle") {
        newNode.set("type", "shape-circle");
        newNode.set("name", "Circle");
        newNode.set("x", minX);
        newNode.set("y", minY);
        newNode.set("width", maxX - minX + 1);
        newNode.set("height", maxY - minY + 1);
      } else if (tool === "line" || tool === "stepline") {
        newNode.set("type", "shape-path");
        newNode.set("name", tool === "line" ? "Line" : "Step Line");
        newNode.set("x", 0);
        newNode.set("y", 0);
        const pathDataMap = new Y.Map<string>();
        scratchLayer.forEach((v, k) => pathDataMap.set(k, v));
        newNode.set("pathData", pathDataMap);
      }

      (container.get("children") as Y.Array<Y.Map<unknown>>).push([newNode]);
      set({ activeNodeId: id });
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
