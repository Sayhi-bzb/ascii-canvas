import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import { enableMapSet } from "immer";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { toKey } from "../utils/math";
import type { Point, GridPoint, GridMap, ToolType } from "../types";

enableMapSet();

export interface CanvasState {
  offset: Point;
  zoom: number;
  grid: GridMap;
  scratchLayer: GridMap | null;
  tool: ToolType;
  brushChar: string;
  textCursor: Point | null;

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
        }),

      setTextCursor: (pos) =>
        set((state) => {
          state.textCursor = pos;
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
    })),
    {
      partialize: (state) => ({ grid: state.grid }),
      limit: 100,
    }
  )
);
