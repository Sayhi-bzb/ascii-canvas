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
  setTextCursor: (pos) => set({ textCursor: pos, selections: [] }),

  writeTextString: (str, startPos) => {
    const { selections, fillSelectionsWithChar, textCursor, brushColor } =
      get();

    if (selections.length > 0) {
      const fillChar = str.charAt(0);
      if (fillChar) {
        fillSelectionsWithChar(fillChar);
        return;
      }
    }

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
        placeCharInYMap(yMainGrid, currentX, currentY, char, brushColor);
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
      const cell = grid.get(GridManager.toKey(newX, textCursor.y));
      newX += GridManager.getCharWidth(cell?.char || " ");
    } else if (dx < 0) {
      const leftKey = GridManager.toKey(newX - 1, textCursor.y);
      const leftCell = grid.get(leftKey);
      if (!leftCell) {
        const farLeftCell = grid.get(GridManager.toKey(newX - 2, textCursor.y));
        newX -= farLeftCell && GridManager.isWideChar(farLeftCell.char) ? 2 : 1;
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
      const cellAtMinus1 = grid.get(GridManager.toKey(x - 1, y));
      const cellAtMinus2 = grid.get(GridManager.toKey(x - 2, y));
      if (
        !cellAtMinus1 &&
        cellAtMinus2 &&
        GridManager.isWideChar(cellAtMinus2.char)
      ) {
        deletePos = { x: x - 2, y };
      }
      yMainGrid.delete(GridManager.toKey(deletePos.x, deletePos.y));
      set({ textCursor: deletePos });
    });
  },

  newlineText: () => {
    const { textCursor, grid } = get();
    if (!textCursor) return;

    const currentY = textCursor.y;
    const currentX = textCursor.x;

    let minLineX = currentX;
    grid.forEach((_, key) => {
      const { x, y } = GridManager.fromKey(key);
      if (y === currentY) {
        minLineX = Math.min(minLineX, x);
      }
    });

    let leadingSpaces = 0;
    for (let x = minLineX; x < currentX; x++) {
      const cell = grid.get(GridManager.toKey(x, currentY));
      if (!cell || cell.char === " ") {
        leadingSpaces++;
      } else {
        break;
      }
    }
    const targetX = minLineX + leadingSpaces;
    set({ textCursor: { x: targetX, y: currentY + 1 } });
  },

  indentText: () => {
    const { textCursor } = get();
    if (!textCursor) return;
    set({ textCursor: { x: textCursor.x + 2, y: textCursor.y } });
  },
});
