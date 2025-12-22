import * as Y from "yjs";
import { GridManager } from "../utils/grid";

export const placeCharInMap = (
  targetMap: {
    set(key: string, value: string): void;
    delete(key: string): void;
    get(key: string): string | undefined;
  },
  x: number,
  y: number,
  char: string
) => {
  if (!char) return;

  const leftKey = GridManager.toKey(x - 1, y);
  const leftChar = targetMap.get(leftKey);
  if (leftChar && GridManager.isWideChar(leftChar)) {
    targetMap.delete(leftKey);
  }

  targetMap.set(GridManager.toKey(x, y), char);

  if (GridManager.isWideChar(char)) {
    const rightKey = GridManager.toKey(x + 1, y);
    targetMap.delete(rightKey);
  }
};

export const placeCharInYMap = (
  targetGrid: Y.Map<string>,
  x: number,
  y: number,
  char: string
) => {
  placeCharInMap(targetGrid, x, y, char);
};
