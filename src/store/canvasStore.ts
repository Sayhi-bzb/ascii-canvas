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
import { yGrid, performTransaction, forceHistorySave } from "../lib/yjs-setup"; // 👈 引入 forceHistorySave

interface CanvasState {
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
  erasePoints: (points: Point[]) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => {
  // 订阅 Y.js 数据变化
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
    tool: "brush",
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

    // 🔴 关键修改 1：绘图结束（松开鼠标）
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

      // ✨ 强制存档！告诉 UndoManager 这是一笔独立的画，别和下一笔合并
      forceHistorySave();

      set({ scratchLayer: null });
    },

    clearScratch: () => set({ scratchLayer: null }),

    clearCanvas: () => {
      performTransaction(() => {
        yGrid.clear();
      });
      // ✨ 清空也是个大动作，必须强制存档
      forceHistorySave();
      set({ selections: [] });
    },

    setTextCursor: (pos) => set({ textCursor: pos, selections: [] }),

    // 🔴 关键修改 2：文本输入 & 粘贴
    writeTextString: (str, startPos) => {
      const { textCursor } = get();
      const cursor = startPos
        ? { ...startPos }
        : textCursor
        ? { ...textCursor }
        : null;
      if (!cursor) return;

      const startX = cursor.x;
      const isPaste = str.length > 1; // 判断是否为粘贴（一次输入多个字符）

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

      // ✨ 如果是粘贴操作，强制存档！
      // 如果只是打字（str.length === 1），我们不强制存档，允许 UndoManager 把 continuous typing 合并
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
      // Backspace 不需要强制存档，让它利用超时机制合并连续删除

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
      // ✨ 删除选区是重要操作，强制存档
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
      // ✨ 填充是重要操作，强制存档
      forceHistorySave();
    },

    erasePoints: (points) => {
      performTransaction(() => {
        points.forEach((p) => {
          yGrid.delete(toKey(p.x, p.y));
        });
      });
      // 注意：如果 erasePoints 是在拖拽过程中每帧调用的，不要在这里加 forceHistorySave。
      // 应该在 onDragEnd 调用的地方处理，或者如果这是一个“单击擦除”操作，则可以加。
      // 根据之前的代码，erasePoints 在 dragging 中被 throttledDraw 调用，
      // 所以我们 **不在这里** 加 forceHistorySave，而应该依赖 useCanvasInteraction 里的 onDragEnd 逻辑？
      // 实际上，之前的 interaction hook 在 tool==='eraser' 时是实时调用的 erasePoints。
      // 这会导致撤销变成一个个像素点。

      // 💡 优化建议：橡皮擦逻辑应该像 brush 一样，先放到 scratchLayer 或者临时 buffer，
      // 然后在 onDragEnd 一次性提交。
      // 但既然我们现在没有 Eraser 的 ScratchLayer，我们暂时不改动架构，
      // 而是让 UndoManager 的 500ms timeout 来处理连续擦除的合并。
      // 或者，在 interaction hook 的 onDragEnd 里手动调用一次 forceHistorySave。
    },
  };
});
