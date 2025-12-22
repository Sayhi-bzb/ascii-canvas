import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MIN_ZOOM, MAX_ZOOM, COLOR_PRIMARY_TEXT } from "../lib/constants";
import { yMainGrid, transactWithHistory } from "../lib/yjs-setup";
import type { CanvasState } from "./interfaces";
import type { GridCell } from "../types";
import {
  createDrawingSlice,
  createTextSlice,
  createSelectionSlice,
} from "./slices";

export type { CanvasState };

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get, ...a) => {
      yMainGrid.observe(() => {
        const compositeGrid = new Map<string, GridCell>();
        yMainGrid.forEach((value, key) => {
          compositeGrid.set(key, value as GridCell);
        });
        set({ grid: compositeGrid });
      });

      return {
        offset: { x: 0, y: 0 },
        zoom: 1,
        grid: new Map(),
        tool: "select",
        brushChar: "#",
        brushColor: COLOR_PRIMARY_TEXT,
        showGrid: true,
        exportShowGrid: false,
        hoveredGrid: null,

        setOffset: (updater) =>
          set((state) => ({ offset: updater(state.offset) })),
        setZoom: (updater) =>
          set((state) => ({
            zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
          })),
        setTool: (tool) => set({ tool, textCursor: null, hoveredGrid: null }),
        setBrushChar: (char) => set({ brushChar: char }),
        setBrushColor: (color) => set({ brushColor: color }),
        setShowGrid: (show) => set({ showGrid: show }),
        setExportShowGrid: (show) => set({ exportShowGrid: show }),
        setHoveredGrid: (pos) => set({ hoveredGrid: pos }),

        ...createDrawingSlice(set, get, ...a),
        ...createTextSlice(set, get, ...a),
        ...createSelectionSlice(set, get, ...a),
      };
    },
    {
      name: "ascii-canvas-persistence",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        offset: state.offset,
        zoom: state.zoom,
        brushChar: state.brushChar,
        brushColor: state.brushColor,
        showGrid: state.showGrid,
        exportShowGrid: state.exportShowGrid,
        grid: Array.from(state.grid.entries()),
      }),
      onRehydrateStorage: () => {
        return (hydratedState, error) => {
          if (error || !hydratedState) return;
          const hState = hydratedState as CanvasState;
          if (Array.isArray(hState.grid)) {
            const recoveredMap = new Map<string, GridCell>(
              hState.grid as unknown as [string, GridCell][]
            );
            hState.grid = recoveredMap;
            transactWithHistory(() => {
              yMainGrid.clear();
              recoveredMap.forEach((val, key) => yMainGrid.set(key, val));
            }, false);
          }
        };
      },
    }
  )
);
