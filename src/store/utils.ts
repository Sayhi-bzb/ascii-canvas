import * as Y from "yjs";
import { GridManager } from "../utils/grid";

export const placeCharInYMap = (
  targetGrid: Y.Map<string>,
  x: number,
  y: number,
  char: string
) => {
  if (!char) return;

  const leftKey = GridManager.toKey(x - 1, y);
  const leftChar = targetGrid.get(leftKey);
  if (leftChar && GridManager.isWideChar(leftChar)) {
    targetGrid.delete(leftKey);
  }

  targetGrid.set(GridManager.toKey(x, y), char);

  if (GridManager.isWideChar(char)) {
    targetGrid.delete(GridManager.toKey(x + 1, y));
  }
};
