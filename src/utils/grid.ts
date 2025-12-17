import { isWideChar } from "./char";
import { toKey } from "./math";
import type { Point, GridMap } from "../types";

/**
 * 《宽体建筑施工规范》第一条：所有操作的起点必须对齐到建筑的左边界。
 * 这能防止在“宽体建筑”的中间开始施工，造成结构问题。
 */
export const snapToCharStart = (pos: Point, grid: GridMap): Point => {
  const charBefore = grid.get(toKey(pos.x - 1, pos.y));
  if (charBefore && isWideChar(charBefore)) {
    return { ...pos, x: pos.x - 1 };
  }
  return pos;
};
