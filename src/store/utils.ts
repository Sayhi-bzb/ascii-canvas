import * as Y from "yjs";
import { GridManager } from "../utils/grid";

/**
 * 城市土地确权统一逻辑：
 * 自动处理宽字符（巨型建筑）与其邻里地块的物理冲突
 */
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

  // 1. 检查落笔点左侧：如果左边是一个宽字符，落笔点会踩到它的“右半身”，必须拆除左侧本体
  const leftKey = GridManager.toKey(x - 1, y);
  const leftChar = targetMap.get(leftKey);
  if (leftChar && GridManager.isWideChar(leftChar)) {
    targetMap.delete(leftKey);
  }

  // 2. 正式落笔确权
  targetMap.set(GridManager.toKey(x, y), char);

  // 3. 检查落笔点右侧：如果新落笔的是宽字符，它会强占右侧地块，必须强拆右侧任何建筑
  if (GridManager.isWideChar(char)) {
    const rightKey = GridManager.toKey(x + 1, y);
    targetMap.delete(rightKey);
  }
};

/**
 * 专门针对 Yjs 共享数据的包装器
 */
export const placeCharInYMap = (
  targetGrid: Y.Map<string>,
  x: number,
  y: number,
  char: string
) => {
  placeCharInMap(targetGrid, x, y, char);
};
