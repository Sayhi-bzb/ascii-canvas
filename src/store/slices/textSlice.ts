import type { StateCreator } from "zustand";
import * as Y from "yjs";
import type { CanvasState, TextSlice } from "../interfaces";
import { performTransaction, forceHistorySave } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getActiveGridYMap } from "../utils";
import { PointSchema } from "../../types";

export const createTextSlice: StateCreator<CanvasState, [], [], TextSlice> = (
  set,
  get
) => ({
  textCursor: null,

  setTextCursor: (rawPos) => {
    const pos = rawPos ? PointSchema.parse(rawPos) : null;
    set({ textCursor: pos, selections: [] });
  },

  writeTextString: (str, rawStartPos) => {
    const { textCursor, activeNodeId } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;

    const startPos = rawStartPos ? PointSchema.parse(rawStartPos) : undefined;

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
        const leftChar = targetGrid.get(GridManager.toKey(x - 1, y));
        if (leftChar && GridManager.isWideChar(leftChar))
          targetGrid.delete(GridManager.toKey(x - 1, y));

        const charWidth = GridManager.getCharWidth(char);
        targetGrid.set(GridManager.toKey(x, y), char);
        if (charWidth === 2) {
          targetGrid.delete(GridManager.toKey(x + 1, y));
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
        const farLeftChar = grid.get(GridManager.toKey(newX - 2, textCursor.y));
        newX -= farLeftChar && GridManager.isWideChar(farLeftChar) ? 2 : 1;
      } else {
        newX -= 1;
      }
    }
    set({ textCursor: { x: newX, y: newY } });
  },

  backspaceText: () => {
    const { textCursor, grid, activeNodeId } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!textCursor || !targetGrid) return;

    const { x, y } = textCursor;
    let deletePos = { x: x - 1, y };
    const charAtMinus1 = grid.get(GridManager.toKey(x - 1, y));
    const charAtMinus2 = grid.get(GridManager.toKey(x - 2, y));

    if (!charAtMinus1 && charAtMinus2 && GridManager.isWideChar(charAtMinus2)) {
      deletePos = { x: x - 2, y };
    }
    performTransaction(() => {
      targetGrid.delete(GridManager.toKey(deletePos.x, deletePos.y));
    });
    set({ textCursor: deletePos });
  },

  newlineText: () =>
    set((s) =>
      s.textCursor
        ? { textCursor: { ...s.textCursor, y: s.textCursor.y + 1 } }
        : {}
    ),
});
