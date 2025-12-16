import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";

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

export const toKey = (x: number, y: number) => `${x},${y}`;

export const fromKey = (key: string) => {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
};
