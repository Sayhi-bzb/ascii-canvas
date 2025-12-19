import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";
import type { Point, GridMap, GridPoint } from "../types";

/**
 * 城市网格管理器
 * 负责地理坐标与地块编号之间的转换，以及批量的地政操作
 */
export const GridManager = {
  screenToGrid(
    screenX: number,
    screenY: number,
    offsetX: number,
    offsetY: number,
    zoom: number
  ): Point {
    return {
      x: Math.floor((screenX - offsetX) / (CELL_WIDTH * zoom)),
      y: Math.floor((screenY - offsetY) / (CELL_HEIGHT * zoom)),
    };
  },

  gridToScreen(
    gridX: number,
    gridY: number,
    offsetX: number,
    offsetY: number,
    zoom: number
  ): Point {
    return {
      x: gridX * CELL_WIDTH * zoom + offsetX,
      y: gridY * CELL_HEIGHT * zoom + offsetY,
    };
  },

  toKey(x: number, y: number): string {
    return `${x},${y}`;
  },

  fromKey(key: string): Point {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  },

  /**
   * 智能迭代器：支持原生 Map 和 Y.Map
   * 自动处理坐标转换，让业务逻辑只关注 x, y 坐标
   */
  iterate<T>(
    container: { forEach: (cb: (value: T, key: string) => void) => void },
    callback: (value: T, x: number, y: number) => void
  ): void {
    container.forEach((value, key) => {
      const { x, y } = this.fromKey(key);
      callback(value, x, y);
    });
  },

  /**
   * 批量录入地块信息
   */
  setPoints(
    target: { set: (key: string, value: string) => void },
    points: GridPoint[]
  ): void {
    points.forEach((p) => {
      target.set(this.toKey(p.x, p.y), p.char);
    });
  },

  /**
   * 坐标系转换：将绝对坐标点转换为相对于原点(originX, originY)的局部坐标点
   * 解决了代码中随处可见的 x - nodeX 冗余计算
   */
  toLocalPoints(
    points: GridPoint[],
    originX: number,
    originY: number
  ): GridPoint[] {
    return points.map((p) => ({
      ...p,
      x: p.x - originX,
      y: p.y - originY,
    }));
  },

  getCharWidth(char: string): number {
    if (!char) return 1;
    const isWide =
      /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ue000-\uf8ff]/.test(char) ||
      /\p{Emoji_Presentation}/u.test(char);
    return isWide ? 2 : 1;
  },

  isWideChar(char: string): boolean {
    return this.getCharWidth(char) === 2;
  },

  snapToCharStart(pos: Point, grid: GridMap): Point {
    const charBefore = grid.get(this.toKey(pos.x - 1, pos.y));
    if (charBefore && this.isWideChar(charBefore)) {
      return { ...pos, x: pos.x - 1 };
    }
    return pos;
  },

  getGridBounds(grid: GridMap) {
    if (grid.size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    this.iterate(grid, (char, x, y) => {
      const width = this.getCharWidth(char);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width - 1);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    return { minX, maxX, minY, maxY };
  },
};
