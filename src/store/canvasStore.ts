import { create, type StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import { enableMapSet } from "immer";
import { MIN_ZOOM, MAX_ZOOM, UNDO_LIMIT } from "../lib/constants";
import { toKey } from "../utils/math";
import {
  PointSchema,
  GridMapSchema,
  ToolTypeSchema,
  SelectionAreaSchema,
} from "../types";
import type { Point, GridPoint, ToolType, SelectionArea } from "../types";
import { z } from "zod";

enableMapSet();

const CanvasStateSchema = z.object({
  offset: PointSchema,
  zoom: z.number(),
  grid: GridMapSchema,
  scratchLayer: GridMapSchema.nullable(),
  tool: ToolTypeSchema,
  brushChar: z.string().max(1),
  textCursor: PointSchema.nullable(),
  selections: z.array(SelectionAreaSchema),
});

type CanvasStateData = z.infer<typeof CanvasStateSchema>;

export interface CanvasState extends CanvasStateData {
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
  writeTextString: (str: string) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  fillSelections: () => void;
  erasePoints: (points: Point[]) => void;
}

const zodValidator =
  <TState extends object>(
    config: StateCreator<TState, [["zustand/immer", never]], []>,
    schema: z.ZodSchema<Partial<TState>>
  ): StateCreator<TState, [["zustand/immer", never]], []> =>
  (set, get, api) =>
    config(
      (args) => {
        set(args);
        const result = schema.safeParse(get());
        if (!result.success) {
          console.error(
            "Zod validation failed!",
            result.error.flatten().fieldErrors
          );
        }
      },
      get,
      api
    );

const creator: StateCreator<CanvasState, [["zustand/immer", never]], []> = (
  set
) => ({
  offset: { x: 0, y: 0 },
  zoom: 1,
  grid: new Map(),
  scratchLayer: null,
  tool: "brush",
  brushChar: "#",
  textCursor: null,
  selections: [],

  setOffset: (updater) =>
    set((state) => {
      state.offset = updater(state.offset);
    }),
  setZoom: (updater) =>
    set((state) => {
      state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom)));
    }),

  setTool: (tool) =>
    set((state) => {
      state.tool = tool;
      state.textCursor = null;
    }),
  setBrushChar: (char) => set({ brushChar: char }),

  setScratchLayer: (points) =>
    set((state) => {
      state.scratchLayer = new Map();
      points.forEach((p) => state.scratchLayer!.set(toKey(p.x, p.y), p.char));
    }),

  addScratchPoints: (points) =>
    set((state) => {
      if (!state.scratchLayer) state.scratchLayer = new Map();
      points.forEach((p) => state.scratchLayer!.set(toKey(p.x, p.y), p.char));
    }),

  commitScratch: () =>
    set((state) => {
      if (state.scratchLayer) {
        state.scratchLayer.forEach((value, key) => {
          if (value === " ") {
            state.grid.delete(key);
          } else {
            state.grid.set(key, value);
          }
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
      state.selections = [];
    }),

  setTextCursor: (pos) =>
    set((state) => {
      state.textCursor = pos;
      state.selections = [];
    }),

  writeTextChar: (char) =>
    set((state) => {
      if (state.textCursor) {
        const { x, y } = state.textCursor;
        state.grid.set(toKey(x, y), char);
        state.textCursor.x += 1;
      }
    }),

  writeTextString: (str) =>
    set((state) => {
      if (state.textCursor) {
        for (const char of str) {
          const { x, y } = state.textCursor;
          state.grid.set(toKey(x, y), char);
          state.textCursor.x += 1;
        }
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

  addSelection: (area) =>
    set((state) => {
      state.selections.push(area);
    }),

  clearSelections: () =>
    set((state) => {
      state.selections = [];
    }),

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
    }),

  erasePoints: (points) =>
    set((state) => {
      points.forEach((p) => {
        state.grid.delete(toKey(p.x, p.y));
      });
    }),
});

export const useCanvasStore = create<CanvasState>()(
  temporal(immer(zodValidator(creator, CanvasStateSchema)), {
    partialize: (state) => ({ grid: state.grid }),
    limit: UNDO_LIMIT,
  })
);
