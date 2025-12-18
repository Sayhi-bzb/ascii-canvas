import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";
import type { Point, GridMap } from "../types";

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

  // 统一的乐高尺寸检测：1 = 1x1, 2 = 1x2
  getCharWidth(char: string): number {
    if (!char) return 1;
    // 涵盖：CJK、全角符号、Emoji、Nerd Font(PUA区)
    const isWide =
      /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ue000-\uf8ff]/.test(char) ||
      /\p{Emoji_Presentation}/u.test(char);
    return isWide ? 2 : 1;
  },

  isWideChar(char: string): boolean {
    return this.getCharWidth(char) === 2;
  },

  // 核心逻辑：寻找坐标点的“法定房东”
  // 如果点击了 1x2 建筑的右半部分，返回左半部分的坐标
  snapToCharStart(pos: Point, grid: GridMap): Point {
    const charLeft = grid.get(this.toKey(pos.x - 1, pos.y));
    if (charLeft && this.isWideChar(charLeft)) {
      return { ...pos, x: pos.x - 1 };
    }
    return pos;
  },
};
