// src/store/canvasStore.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import { enableMapSet } from "immer";
import { MIN_ZOOM, MAX_ZOOM, UNDO_LIMIT } from "../lib/constants";
import { toKey } from "../utils/math";
import type {
  Point,
  GridPoint,
  GridMap,
  ToolType,
  SelectionArea,
} from "../types";

enableMapSet();

export interface CanvasState {
  offset: Point;
  zoom: number;
  grid: GridMap;
  scratchLayer: GridMap | null;
  tool: ToolType;
  brushChar: string;
  textCursor: Point | null;
  selections: SelectionArea[]; // 升级为数组，支持多选

  setOffset: (updater: (prev: Point) => Point) => void;
  setZoom: (updater: (prev: number) => number) => void;
  setTool: (tool: ToolType) => void;
  setBrushChar: (char: string) => void;
  setScratchLayer: (points: GridPoint[]) => void;
  addScratchPoints: (points: GridPoint[]) => void;
  commitScratch: () => void;
  clearScratch: () => void;
  clearCanvas: () => void;
  setTextCursor: (pos: Point | null) => void;
  writeTextChar: (char: string) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;

  // 选区相关新方法
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  fillSelections: () => void; // 油漆桶功能
}

export const useCanvasStore = create<CanvasState>()(
  temporal(
    immer((set) => ({
      offset: { x: 0, y: 0 },
      zoom: 1,
      grid: new Map(),
      scratchLayer: null,
      tool: "brush",
      brushChar: "#",
      textCursor: null,
      selections: [], // 初始化为空数组

      setOffset: (updater) =>
        set((state) => {
          state.offset = updater(state.offset);
        }),
      setZoom: (updater) =>
        set((state) => {
          state.zoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, updater(state.zoom))
          );
        }),
      // 切换工具时，如果不切到 fill，通常清除选区，但为了体验，保留选区直到用户主动清除或开始新选择
      setTool: (tool) => set({ tool, textCursor: null }),
      setBrushChar: (char) => set({ brushChar: char }),

      setScratchLayer: (points) =>
        set((state) => {
          state.scratchLayer = new Map();
          points.forEach((p) =>
            state.scratchLayer!.set(toKey(p.x, p.y), p.char)
          );
        }),

      addScratchPoints: (points) =>
        set((state) => {
          if (!state.scratchLayer) state.scratchLayer = new Map();
          points.forEach((p) =>
            state.scratchLayer!.set(toKey(p.x, p.y), p.char)
          );
        }),

      commitScratch: () =>
        set((state) => {
          if (state.scratchLayer) {
            state.scratchLayer.forEach((value, key) => {
              state.grid.set(key, value);
            });
            state.scratchLayer = null;
          }
        }),

      clearScratch: () =>
        set((state) => {
          state.scratchLayer = null;
        }),
      clearCanvas: () =>
        set((state) => {
          state.grid.clear();
          state.selections = []; // 清空画布时也清空选区
        }),

      setTextCursor: (pos) =>
        set((state) => {
          state.textCursor = pos;
          state.selections = []; // 进入打字模式时清空选区
        }),

      writeTextChar: (char) =>
        set((state) => {
          if (state.textCursor) {
            const { x, y } = state.textCursor;
            state.grid.set(toKey(x, y), char);
            state.textCursor.x += 1;
          }
        }),

      moveTextCursor: (dx, dy) =>
        set((state) => {
          if (state.textCursor) {
            state.textCursor.x += dx;
            state.textCursor.y += dy;
          }
        }),

      backspaceText: () =>
        set((state) => {
          if (state.textCursor) {
            state.textCursor.x -= 1;
            const { x, y } = state.textCursor;
            state.grid.delete(toKey(x, y));
          }
        }),

      newlineText: () =>
        set((state) => {
          if (state.textCursor) {
            state.textCursor.y += 1;
          }
        }),

      // 新增：添加一个选区
      addSelection: (area) =>
        set((state) => {
          state.selections.push(area);
        }),

      // 新增：清除所有选区
      clearSelections: () =>
        set((state) => {
          state.selections = [];
        }),

      // 新增：油漆桶 - 填充所有选区
      fillSelections: () =>
        set((state) => {
          if (state.selections.length === 0) return;

          state.selections.forEach((area) => {
            const minX = Math.min(area.start.x, area.end.x);
            const maxX = Math.max(area.start.x, area.end.x);
            const minY = Math.min(area.start.y, area.end.y);
            const maxY = Math.max(area.start.y, area.end.y);

            for (let x = minX; x <= maxX; x++) {
              for (let y = minY; y <= maxY; y++) {
                state.grid.set(toKey(x, y), state.brushChar);
              }
            }
          });
          // 填充后不一定要清除选区，方便用户换字符再填，但也可是清除。
          // 这里保留选区，符合大多数设计软件习惯。
        }),
    })),
    {
      partialize: (state) => ({ grid: state.grid }),
      limit: UNDO_LIMIT,
    }
  )
);
