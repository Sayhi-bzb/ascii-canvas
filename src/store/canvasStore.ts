import { create } from "zustand";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { yMainGrid } from "../lib/yjs-setup";
import type { CanvasState } from "./interfaces";
import {
  createDrawingSlice,
  createTextSlice,
  createSelectionSlice,
} from "./slices";

export type { CanvasState };

export const useCanvasStore = create<CanvasState>((set, get, ...a) => {
  const syncFromYjs = () => {
    const compositeGrid = new Map<string, string>();
    for (const [key, value] of yMainGrid.entries()) {
      compositeGrid.set(key, value);
    }
    set({ grid: compositeGrid });
  };

  yMainGrid.observe(() => {
    syncFromYjs();
  });

  setTimeout(syncFromYjs, 0);

  return {
    offset: { x: 0, y: 0 },
    zoom: 1,
    grid: new Map(),
    tool: "select",
    brushChar: "#",

    setOffset: (updater) => set((state) => ({ offset: updater(state.offset) })),
    setZoom: (updater) =>
      set((state) => ({
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
      })),
    setTool: (tool) => set({ tool, textCursor: null }),
    setBrushChar: (char) => set({ brushChar: char }),

    ...createDrawingSlice(set, get, ...a),
    ...createTextSlice(set, get, ...a),
    ...createSelectionSlice(set, get, ...a),
  };
});
