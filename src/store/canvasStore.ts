import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { yMainGrid, transactWithHistory } from "../lib/yjs-setup";
import type { CanvasState } from "./interfaces";
import {
  createDrawingSlice,
  createTextSlice,
  createSelectionSlice,
} from "./slices";

export type { CanvasState };

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get, ...a) => {
      const syncPersistenceToYjs = (persistenceGrid: Map<string, string>) => {
        transactWithHistory(() => {
          yMainGrid.clear();
          persistenceGrid.forEach((char, key) => {
            yMainGrid.set(key, char);
          });
        }, false); 
      };

      yMainGrid.observe(() => {
        const compositeGrid = new Map<string, string>();
        for (const [key, value] of yMainGrid.entries()) {
          compositeGrid.set(key, value);
        }
        set({ grid: compositeGrid });
      });

      return {
        offset: { x: 0, y: 0 },
        zoom: 1,
        grid: new Map(),
        tool: "select",
        brushChar: "#",

        setOffset: (updater) =>
          set((state) => ({ offset: updater(state.offset) })),
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
    },
    {
      name: "ascii-canvas-persistence",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        offset: state.offset,
        zoom: state.zoom,
        brushChar: state.brushChar,
        grid: Array.from(state.grid.entries()),
      }),
      onRehydrateStorage: (state) => {
        return (hydratedState, error) => {
          if (error || !hydratedState) return;

          if (Array.isArray(hydratedState.grid)) {
            const recoveredMap = new Map<string, string>(
              hydratedState.grid as any
            );
            hydratedState.grid = recoveredMap;

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
