import type { StateCreator } from "zustand";
import type { CanvasState, TextSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { placeCharInYMap } from "../utils";

export const createTextSlice: StateCreator<CanvasState, [], [], TextSlice> = (
  set,
  get
) => ({
  textCursor: null,

  setTextCursor: (pos) => {
    set({ textCursor: pos, selections: [] });
  },

  writeTextString: (str, startPos) => {
    const { textCursor } = get();
    const cursor = startPos || textCursor;
    if (!cursor) return;

    let currentX = cursor.x;
    let currentY = cursor.y;
    const startX = cursor.x;

    transactWithHistory(() => {
      for (const char of str) {
        if (char === "\n") {
          currentY++;
          currentX = startX;
          continue;
        }

        placeCharInYMap(yMainGrid, currentX, currentY, char);
        currentX += GridManager.getCharWidth(char);
      }
    });

    set({ textCursor: { x: currentX, y: currentY } });
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
    const { textCursor, grid } = get();
    if (!textCursor) return;

    transactWithHistory(() => {
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

      yMainGrid.delete(GridManager.toKey(deletePos.x, deletePos.y));
      set({ textCursor: deletePos });
    });
  },

  newlineText: () => {
    const { textCursor } = get();
    if (!textCursor) return;
    set({ textCursor: { x: textCursor.x, y: textCursor.y + 1 } });
  },
});
