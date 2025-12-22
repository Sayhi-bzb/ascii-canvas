import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";
import type { Point, GridMap, GridPoint } from "../types";

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

  iterate<T>(
    container: { forEach: (cb: (value: T, key: string) => void) => void },
    callback: (value: T, x: number, y: number) => void
  ): void {
    container.forEach((value, key) => {
      const { x, y } = this.fromKey(key);
      callback(value, x, y);
    });
  },

  setPoints(
    target: { set: (key: string, value: string) => void },
    points: GridPoint[]
  ): void {
    // 警告：此方法现在应谨慎使用，建议优先使用 store/utils 中的 placeCharInMap
    points.forEach((p) => {
      target.set(this.toKey(p.x, p.y), p.char);
    });
  },

  /**
   * 测绘核心：精准判定字符占地宽度
   */
  getCharWidth(char: string): number {
    if (!char) return 1;

    // 1. 判定 CJK (中日韩) 字符及全角符号
    const isCJK = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char);
    if (isCJK) return 2;

    // 2. 判定 Emoji 表情符号
    const isEmoji = /\p{Emoji_Presentation}/u.test(char);
    if (isEmoji) return 2;

    // 3. 判定 Nerd Fonts / PUA (私有区) 图标
    const codePoint = char.codePointAt(0) || 0;
    const isPrivateUseArea = codePoint >= 0xe000 && codePoint <= 0xf8ff;
    if (isPrivateUseArea) return 2;

    return 1;
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
    if (grid.size === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

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
