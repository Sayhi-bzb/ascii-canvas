import { create } from "zustand";
import { toast } from "sonner";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { GridManager } from "../utils/grid";
import type {
  Point,
  GridPoint,
  ToolType,
  SelectionArea,
  GridMap,
} from "../types";
import { yGrid, performTransaction, forceHistorySave } from "../lib/yjs-setup";
import { getSelectionBounds } from "../utils/selection";
import { exportSelectionToString } from "../utils/export";

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
  copySelectionToClipboard: () => void;
  cutSelectionToClipboard: () => void;
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
      points.forEach((p) => layer.set(GridManager.toKey(p.x, p.y), p.char));
      set({ scratchLayer: layer });
    },

    addScratchPoints: (points) => {
      set((state) => {
        const layer = new Map(state.scratchLayer || []);
        points.forEach((p) => layer.set(GridManager.toKey(p.x, p.y), p.char));
        return { scratchLayer: layer };
      });
    },

    commitScratch: () => {
      const { scratchLayer } = get();
      if (!scratchLayer) return;
      performTransaction(() => {
        scratchLayer.forEach((value, key) => {
          const { x, y } = GridManager.fromKey(key);
          // 放置前：清理左侧可能存在的 1x2 影子
          const leftChar = yGrid.get(GridManager.toKey(x - 1, y));
          if (leftChar && GridManager.isWideChar(leftChar))
            yGrid.delete(GridManager.toKey(x - 1, y));

          if (value === " ") {
            yGrid.delete(key);
          } else {
            yGrid.set(key, value);
            // 放置后：如果是 1x2，强制清理右侧地块
            if (GridManager.isWideChar(value))
              yGrid.delete(GridManager.toKey(x + 1, y));
          }
        });
      });
      forceHistorySave();
      set({ scratchLayer: null });
    },

    clearScratch: () => set({ scratchLayer: null }),
    clearCanvas: () => {
      performTransaction(() => yGrid.clear());
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

      performTransaction(() => {
        for (const char of str) {
          if (char === "\n") {
            cursor.y += 1;
            cursor.x = startX;
            continue;
          }
          const { x, y } = cursor;
          // 统一清理逻辑：覆盖老建筑
          const leftChar = yGrid.get(GridManager.toKey(x - 1, y));
          if (leftChar && GridManager.isWideChar(leftChar))
            yGrid.delete(GridManager.toKey(x - 1, y));

          const charWidth = GridManager.getCharWidth(char);
          yGrid.set(GridManager.toKey(x, y), char);

          if (charWidth === 2) {
            yGrid.delete(GridManager.toKey(x + 1, y));
            cursor.x += 2;
          } else {
            cursor.x += 1;
          }
        }
      });
      if (str.length > 1) forceHistorySave();
      if (get().textCursor) set({ textCursor: { x: cursor.x, y: cursor.y } });
    },

    moveTextCursor: (dx, dy) => {
      const { textCursor, grid } = get();
      if (!textCursor) return;
      let newX = textCursor.x;
      const newY = textCursor.y + dy;

      if (dx > 0) {
        const char = grid.get(GridManager.toKey(newX, textCursor.y));
        newX += GridManager.getCharWidth(char || " ");
      } else if (dx < 0) {
        const leftKey = GridManager.toKey(newX - 1, textCursor.y);
        const leftChar = grid.get(leftKey);
        if (!leftChar) {
          const farLeftChar = grid.get(
            GridManager.toKey(newX - 2, textCursor.y)
          );
          newX -= farLeftChar && GridManager.isWideChar(farLeftChar) ? 2 : 1;
        } else {
          newX -= 1;
        }
      }
      set({ textCursor: { x: newX, y: newY } });
    },

    backspaceText: () => {
      const { textCursor, grid } = get();
      if (!textCursor) return;
      const { x, y } = textCursor;

      let deletePos = { x: x - 1, y };
      const charAtMinus1 = grid.get(GridManager.toKey(x - 1, y));
      const charAtMinus2 = grid.get(GridManager.toKey(x - 2, y));

      if (
        !charAtMinus1 &&
        charAtMinus2 &&
        GridManager.isWideChar(charAtMinus2)
      ) {
        deletePos = { x: x - 2, y };
      }

      performTransaction(() => {
        yGrid.delete(GridManager.toKey(deletePos.x, deletePos.y));
      });
      set({ textCursor: deletePos });
    },

    newlineText: () =>
      set((s) =>
        s.textCursor
          ? { textCursor: { ...s.textCursor, y: s.textCursor.y + 1 } }
          : {}
      ),
    addSelection: (area) =>
      set((s) => ({ selections: [...s.selections, area] })),
    clearSelections: () => set({ selections: [] }),

    deleteSelection: () => {
      const { selections } = get();
      performTransaction(() => {
        selections.forEach((area) => {
          const { minX, maxX, minY, maxY } = getSelectionBounds(area);
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              // 删除逻辑：如果删到了宽字符的影子，也要把本体删了
              const head = GridManager.snapToCharStart({ x, y }, get().grid);
              yGrid.delete(GridManager.toKey(head.x, head.y));
            }
          }
        });
      });
      forceHistorySave();
    },

    fillSelections: () => {
      const { selections, brushChar } = get();
      if (selections.length > 0) get().fillSelectionsWithChar(brushChar);
    },

    fillSelectionsWithChar: (char: string) => {
      const { selections } = get();
      const charWidth = GridManager.getCharWidth(char);
      performTransaction(() => {
        selections.forEach((area) => {
          const { minX, maxX, minY, maxY } = getSelectionBounds(area);
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x += charWidth) {
              if (x > maxX) break;
              yGrid.set(GridManager.toKey(x, y), char);
              if (charWidth === 2 && x + 1 <= maxX)
                yGrid.delete(GridManager.toKey(x + 1, y));
            }
          }
        });
      });
      forceHistorySave();
    },

    erasePoints: (points) => {
      performTransaction(() => {
        points.forEach((p) => {
          const head = GridManager.snapToCharStart(p, get().grid);
          yGrid.delete(GridManager.toKey(head.x, head.y));
        });
      });
    },

    copySelectionToClipboard: () => {
      const { grid, selections } = get();
      if (selections.length === 0) return;
      const text = exportSelectionToString(grid, selections);
      navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
    },

    cutSelectionToClipboard: () => {
      const { grid, selections, deleteSelection } = get();
      if (selections.length === 0) return;
      const text = exportSelectionToString(grid, selections);
      navigator.clipboard.writeText(text).then(() => {
        deleteSelection();
        toast.success("Cut!");
      });
    },
  };
});
