import type { StateCreator } from "zustand";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import type { GridPoint } from "../../types";
import { placeCharInMap, placeCharInYMap } from "../utils";
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
    const { brushColor } = get();
    const layer = new Map();
    points.forEach((p) => {
      placeCharInMap(layer, p.x, p.y, p.char, p.color || brushColor);
    });
    set({ scratchLayer: layer });
  },

  addScratchPoints: (points) => {
    const { brushColor } = get();
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      points.forEach((p) => {
        placeCharInMap(layer, p.x, p.y, p.char, p.color || brushColor);
      });
      return { scratchLayer: layer };
    });
  },

  updateScratchForShape: (tool, start, end, options) => {
    let points: GridPoint[] = [];
    const color = get().brushColor;
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
    const coloredPoints = points.map((p) => ({ ...p, color }));
    get().setScratchLayer(coloredPoints);
  },

  commitScratch: () => {
    const { scratchLayer } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;
    transactWithHistory(() => {
      GridManager.iterate(scratchLayer, (cell, x, y) => {
        placeCharInYMap(yMainGrid, x, y, cell.char, cell.color);
      });
    });
    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),
  clearCanvas: () => transactWithHistory(() => yMainGrid.clear()),

  erasePoints: (points) => {
    transactWithHistory(() => {
      points.forEach((p) => {
        const key = GridManager.toKey(p.x, p.y);
        const cell = yMainGrid.get(key);
        if (!cell) {
          const leftKey = GridManager.toKey(p.x - 1, p.y);
          const leftCell = yMainGrid.get(leftKey) as any;
          if (leftCell && GridManager.isWideChar(leftCell.char)) {
            yMainGrid.delete(leftKey);
          }
        }
        yMainGrid.delete(key);
      });
    });
  },
});
