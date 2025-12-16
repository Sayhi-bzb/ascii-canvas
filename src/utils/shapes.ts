import type { Point, GridPoint } from "../types";

export function getLinePoints(start: Point, end: Point): Point[] {
  const points: Point[] = [];
  let { x: x0, y: y0 } = start;
  const { x: x1, y: y1 } = end;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}

export function getBoxPoints(start: Point, end: Point): GridPoint[] {
  const points: GridPoint[] = [];

  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);

  if (left === right || top === bottom) {
    if (left === right && top === bottom) return [{ ...start, char: "+" }];
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: left === right ? "│" : "─",
    }));
  }

  points.push({ x: left, y: top, char: "┌" });
  points.push({ x: right, y: top, char: "┐" });
  points.push({ x: left, y: bottom, char: "└" });
  points.push({ x: right, y: bottom, char: "┘" });

  for (let x = left + 1; x < right; x++) {
    points.push({ x, y: top, char: "─" });
    points.push({ x, y: bottom, char: "─" });
  }

  for (let y = top + 1; y < bottom; y++) {
    points.push({ x: left, y, char: "│" });
    points.push({ x: right, y, char: "│" });
  }

  return points;
}
