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
    const layer = new Map<string, string>();
    // 所有点均通过统一的占地逻辑进行物理模拟
    points.forEach((p) => {
      placeCharInMap(layer, p.x, p.y, p.char);
    });
    set({ scratchLayer: layer });
  },

  addScratchPoints: (points) => {
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      // 增量更新时同样确保宽字符物理冲突得到处理
      points.forEach((p) => {
        placeCharInMap(layer, p.x, p.y, p.char);
      });
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
    // 形状生成后，统一通过 setScratchLayer 进行物理碰撞检测
    get().setScratchLayer(points);
  },

  commitScratch: () => {
    const { scratchLayer } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;

    transactWithHistory(() => {
      // 提交到正式图层时，再次确保宽字符确权
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
        // 橡皮擦逻辑升级：如果你擦到了宽字符的右侧半身，必须连左侧本体一起擦除
        if (!char) {
          const leftKey = GridManager.toKey(p.x - 1, p.y);
          const leftChar = yMainGrid.get(leftKey);
          if (leftChar && GridManager.isWideChar(leftChar)) {
            yMainGrid.delete(leftKey);
          }
        }
        yMainGrid.delete(key);
      });
    });
  },
});
