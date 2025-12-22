import type { StateCreator } from "zustand";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import type { GridPoint } from "../../types";
import { placeCharInYMap } from "../utils";
import {
  getBoxPoints,
  getCirclePoints,
  getLShapeLinePoints,
  getStepLinePoints,
} from "../../utils/shapes";

export const createDrawingSlice: StateCreator<
  CanvasState,
  [],
  [],
  DrawingSlice
> = (set, get) => ({
  scratchLayer: null,

  setScratchLayer: (points) => {
    const layer = new Map<string, string>();
    GridManager.setPoints(layer, points);
    set({ scratchLayer: layer });
  },

  addScratchPoints: (points) => {
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      GridManager.setPoints(layer, points);
      return { scratchLayer: layer };
    });
  },

  updateScratchForShape: (tool, start, end, options) => {
    let points: GridPoint[] = [];
    switch (tool) {
      case "box":
        points = getBoxPoints(start, end);
        break;
      case "circle":
        points = getCirclePoints(start, end);
        break;
      case "stepline":
        points = getStepLinePoints(start, end);
        break;
      case "line": {
        const isVerticalFirst = options?.axis === "vertical";
        points = getLShapeLinePoints(start, end, isVerticalFirst);
        break;
      }
    }
    get().setScratchLayer(points);
  },

  commitScratch: () => {
    const { scratchLayer } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;

    transactWithHistory(() => {
      GridManager.iterate(scratchLayer, (char, x, y) => {
        placeCharInYMap(yMainGrid, x, y, char);
      });
    });

    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),

  clearCanvas: () => {
    transactWithHistory(() => {
      yMainGrid.clear();
    });
  },

  erasePoints: (points) => {
    transactWithHistory(() => {
      points.forEach((p) => {
        const key = GridManager.toKey(p.x, p.y);
        const char = yMainGrid.get(key);
        if (!char) {
          const leftChar = yMainGrid.get(GridManager.toKey(p.x - 1, p.y));
          if (leftChar && GridManager.isWideChar(leftChar)) {
            yMainGrid.delete(GridManager.toKey(p.x - 1, p.y));
          }
        }
        yMainGrid.delete(key);
      });
    });
  },
});
