import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";

/**
 * 将屏幕位置转换为网格坐标
 */
export const screenToGrid = (
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
) => {
  const gridX = Math.floor((screenX - offsetX) / (CELL_WIDTH * zoom));
  const gridY = Math.floor((screenY - offsetY) / (CELL_HEIGHT * zoom));
  return { x: gridX, y: gridY };
};

/**
 * 将网格坐标转换为屏幕位置
 */
export const gridToScreen = (
  gridX: number,
  gridY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
) => {
  return {
    x: gridX * CELL_WIDTH * zoom + offsetX,
    y: gridY * CELL_HEIGHT * zoom + offsetY,
  };
};

/**
 * 户籍 Key 生成：确保格式统一
 */
export const toKey = (x: number, y: number) => `${x},${y}`;

/**
 * 户籍 Key 解析
 */
export const fromKey = (key: string) => {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
};
