import * as Y from "yjs";
import { GridManager } from "../utils/grid";
import type { GridCell } from "../types";

export const placeCharInMap = (
  targetMap: {
    set(key: string, value: GridCell): void;
    delete(key: string): void;
    get(key: string): GridCell | undefined;
  },
  x: number,
  y: number,
  char: string,
  color: string
) => {
  if (!char) return;

  const leftKey = GridManager.toKey(x - 1, y);
  const leftCell = targetMap.get(leftKey);
  if (leftCell && GridManager.isWideChar(leftCell.char)) {
    targetMap.delete(leftKey);
  }

  targetMap.set(GridManager.toKey(x, y), { char, color });

  if (GridManager.isWideChar(char)) {
    const rightKey = GridManager.toKey(x + 1, y);
    targetMap.delete(rightKey);
  }
};

export const placeCharInYMap = (
  targetGrid: Y.Map<GridCell>,
  x: number,
  y: number,
  char: string,
  color: string
) => {
  if (!char) return;

  const leftKey = GridManager.toKey(x - 1, y);
  const leftCell = targetGrid.get(leftKey);
  if (leftCell && GridManager.isWideChar(leftCell.char)) {
    targetGrid.delete(leftKey);
  }

  targetGrid.set(GridManager.toKey(x, y), { char, color });

  if (GridManager.isWideChar(char)) {
    const rightKey = GridManager.toKey(x + 1, y);
    targetGrid.delete(rightKey);
  }
};
