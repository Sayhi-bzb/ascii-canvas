import { isWideChar } from "./char";
import { toKey } from "./math";
import type { Point, GridMap } from "../types";

export const snapToCharStart = (pos: Point, grid: GridMap): Point => {
  const charBefore = grid.get(toKey(pos.x - 1, pos.y));
  if (charBefore && isWideChar(charBefore)) {
    return { ...pos, x: pos.x - 1 };
  }
  return pos;
};
