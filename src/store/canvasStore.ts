import { create } from "zustand";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { toKey } from "../utils/math";
import { isWideChar } from "../utils/char";
import type {
  Point,
  GridPoint,
  ToolType,
  SelectionArea,
  GridMap,
} from "../types";
import { yGrid, performTransaction, forceHistorySave } from "../lib/yjs-setup";

// ✨ 修正：公开 CanvasState 蓝图，以便全局引用
export interface CanvasState {
  offset: Point;
  zoom: number;
  tool: ToolType;
  brushChar: string;
  textCursor: Point | null;
  selections: SelectionArea[];
  scratchLayer: GridMap | null;
  grid: GridMap;

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
  writeTextString: (str: string, startPos?: Point) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  deleteSelection: () => void;
  fillSelections: () => void;
  fillSelectionsWithChar: (char: string) => void;
  erasePoints: (points: Point[]) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => {
  yGrid.observe(() => {
    const newGrid = new Map<string, string>();
    yGrid.forEach((value, key) => {
      newGrid.set(key, value);
    });
    set({ grid: newGrid });
  });

  return {
    offset: { x: 0, y: 0 },
    zoom: 1,
    grid: new Map(),
    scratchLayer: null,
    tool: "select",
    brushChar: "#",
    textCursor: null,
    selections: [],

    setOffset: (updater) => set((state) => ({ offset: updater(state.offset) })),
    setZoom: (updater) =>
      set((state) => ({
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
      })),
    setTool: (tool) => set({ tool, textCursor: null }),
    setBrushChar: (char) => set({ brushChar: char }),
    setScratchLayer: (points) => {
      const layer = new Map<string, string>();
      points.forEach((p) => layer.set(toKey(p.x, p.y), p.char));
      set({ scratchLayer: layer });
    },
    addScratchPoints: (points) => {
      set((state) => {
        const layer = new Map(state.scratchLayer || []);
        points.forEach((p) => layer.set(toKey(p.x, p.y), p.char));
        return { scratchLayer: layer };
      });
    },

    commitScratch: () => {
      const { scratchLayer } = get();
      if (!scratchLayer) return;

      performTransaction(() => {
        scratchLayer.forEach((value, key) => {
          if (value === " ") {
            yGrid.delete(key);
          } else {
            yGrid.set(key, value);
          }
        });
      });

      forceHistorySave();
      set({ scratchLayer: null });
    },

    clearScratch: () => set({ scratchLayer: null }),

    clearCanvas: () => {
      performTransaction(() => {
        yGrid.clear();
      });
      forceHistorySave();
      set({ selections: [] });
    },

    setTextCursor: (pos) => set({ textCursor: pos, selections: [] }),

    writeTextString: (str, startPos) => {
      const { textCursor } = get();
      const cursor = startPos
        ? { ...startPos }
        : textCursor
        ? { ...textCursor }
        : null;
      if (!cursor) return;

      const startX = cursor.x;
      const isPaste = str.length > 1;

      performTransaction(() => {
        for (const char of str) {
          if (char === "\n") {
            cursor.y += 1;
            cursor.x = startX;
            continue;
          }

          const { x, y } = cursor;
          const wide = isWideChar(char);

          yGrid.set(toKey(x, y), char);

          if (wide) {
            yGrid.delete(toKey(x + 1, y));
            cursor.x += 2;
          } else {
            cursor.x += 1;
          }
        }
      });

      if (isPaste) {
        forceHistorySave();
      }

      if (get().textCursor) {
        set({ textCursor: { x: cursor.x, y: cursor.y } });
      }
    },

    moveTextCursor: (dx, dy) =>
      set((state) => {
        if (state.textCursor) {
          return {
            textCursor: {
              x: state.textCursor.x + dx,
              y: state.textCursor.y + dy,
            },
          };
        }
        return {};
      }),

    backspaceText: () => {
      const { textCursor } = get();
      if (!textCursor) return;
      const { x, y } = textCursor;
      const prevKey = toKey(x - 1, y);
      const prevChar = yGrid.get(prevKey);

      performTransaction(() => {
        if (prevChar) {
          yGrid.delete(prevKey);
        } else {
          const prevPrevKey = toKey(x - 2, y);
          const prevPrevChar = yGrid.get(prevPrevKey);
          if (prevPrevChar && isWideChar(prevPrevChar)) {
            yGrid.delete(prevPrevKey);
          }
        }
      });

      set((state) => {
        if (!state.textCursor) return {};
        const { x, y } = state.textCursor;
        const newX = prevChar
          ? x - 1
          : x - (isWideChar(yGrid.get(toKey(x - 2, y)) || "") ? 2 : 1);
        return { textCursor: { x: newX, y } };
      });
    },

    newlineText: () =>
      set((state) => {
        if (state.textCursor) {
          return {
            textCursor: { x: state.textCursor.x, y: state.textCursor.y + 1 },
          };
        }
        return {};
      }),

    addSelection: (area) =>
      set((state) => ({ selections: [...state.selections, area] })),
    clearSelections: () => set({ selections: [] }),

    deleteSelection: () => {
      const { selections } = get();
      if (selections.length === 0) return;

      performTransaction(() => {
        selections.forEach((area) => {
          const minX = Math.min(area.start.x, area.end.x);
          const maxX = Math.max(area.start.x, area.end.x);
          const minY = Math.min(area.start.y, area.end.y);
          const maxY = Math.max(area.start.y, area.end.y);

          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              yGrid.delete(toKey(x, y));
            }
          }
        });
      });
      forceHistorySave();
    },

    fillSelections: () => {
      const { selections, brushChar } = get();
      if (selections.length === 0) return;

      performTransaction(() => {
        selections.forEach((area) => {
          const minX = Math.min(area.start.x, area.end.x);
          const maxX = Math.max(area.start.x, area.end.x);
          const minY = Math.min(area.start.y, area.end.y);
          const maxY = Math.max(area.start.y, area.end.y);

          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              yGrid.set(toKey(x, y), brushChar);
            }
          }
        });
      });
      forceHistorySave();
    },

    fillSelectionsWithChar: (char: string) => {
      const { selections } = get();
      if (selections.length === 0) return;

      performTransaction(() => {
        selections.forEach((area) => {
          const minX = Math.min(area.start.x, area.end.x);
          const maxX = Math.max(area.start.x, area.end.x);
          const minY = Math.min(area.start.y, area.end.y);
          const maxY = Math.max(area.start.y, area.end.y);

          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              yGrid.set(toKey(x, y), char);
            }
          }
        });
      });
      forceHistorySave();
    },

    erasePoints: (points) => {
      performTransaction(() => {
        points.forEach((p) => {
          yGrid.delete(toKey(p.x, p.y));
        });
      });
    },
  };
});
