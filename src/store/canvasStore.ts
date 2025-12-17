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

    moveTextCursor: (dx, dy) => {
      const { textCursor, grid } = get();
      if (!textCursor) return;

      let newX = textCursor.x;
      let newY = textCursor.y;

      if (dy !== 0) {
        newY += dy;
      }

      if (dx > 0) {
        const char = grid.get(toKey(newX, newY));
        newX += char && isWideChar(char) ? 2 : 1;
      } else if (dx < 0) {
        const char = grid.get(toKey(newX - 2, newY));
        newX -= char && isWideChar(char) ? 2 : 1;
      }

      set({ textCursor: { x: newX, y: newY } });
    },

    backspaceText: () => {
      const { textCursor, grid } = get();
      if (!textCursor) return;

      const targetX = textCursor.x;
      const charBefore = grid.get(toKey(targetX - 2, textCursor.y));

      const isPrevWide = charBefore && isWideChar(charBefore);
      const deleteFromX = isPrevWide ? targetX - 2 : targetX - 1;
      const newCursorX = deleteFromX;

      if (deleteFromX < textCursor.x) {
        performTransaction(() => {
          yGrid.delete(toKey(deleteFromX, textCursor.y));

          if (isPrevWide) {
            yGrid.delete(toKey(deleteFromX + 1, textCursor.y));
          }
        });
        set({ textCursor: { x: newCursorX, y: textCursor.y } });
      }
    },

    newlineText: () =>
      set((state) => {
        if (state.textCursor) {
          return {
            textCursor: { ...state.textCursor, y: state.textCursor.y + 1 },
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
      get().fillSelectionsWithChar(brushChar);
    },

    fillSelectionsWithChar: (char: string) => {
      const { selections } = get();
      if (selections.length === 0) return;

      const wide = isWideChar(char);

      performTransaction(() => {
        selections.forEach((area) => {
          const minX = Math.min(area.start.x, area.end.x);
          const maxX = Math.max(area.start.x, area.end.x);
          const minY = Math.min(area.start.y, area.end.y);
          const maxY = Math.max(area.start.y, area.end.y);

          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              yGrid.set(toKey(x, y), char);
              if (wide) {
                if (x + 1 <= maxX) {
                  yGrid.delete(toKey(x + 1, y));
                }
                x++;
              }
            }
          }
        });
      });
      forceHistorySave();
    },

    erasePoints: (points) => {
      performTransaction(() => {
        points.forEach((p) => {
          const char = yGrid.get(toKey(p.x, p.y));
          yGrid.delete(toKey(p.x, p.y));
          if (char && isWideChar(char)) {
            yGrid.delete(toKey(p.x + 1, p.y));
          }
        });
      });
    },
  };
});
