import { EXPORT_PADDING } from "../lib/constants";
import type { GridMap, SelectionArea } from "../types";
import { fromKey, toKey } from "./math";

export const exportToString = (grid: Map<string, string>) => {
  if (grid.size === 0) return "";

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  grid.forEach((_, key) => {
    const { x, y } = fromKey(key);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const padding = EXPORT_PADDING;
  const width = maxX - minX + 1 + padding * 2;
  const height = maxY - minY + 1 + padding * 2;

  const lines: string[] = [];
  for (let y = 0; y < height; y++) {
    lines.push(" ".repeat(width));
  }

  grid.forEach((char, key) => {
    const { x, y } = fromKey(key);
    const localX = x - minX + padding;
    const localY = y - minY + padding;

    const line = lines[localY];
    lines[localY] =
      line.substring(0, localX) + char + line.substring(localX + 1);
  });

  return lines.join("\n");
};

export const exportSelectionToString = (
  grid: GridMap,
  selections: SelectionArea[]
) => {
  if (selections.length === 0) return "";

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  selections.forEach((area) => {
    minX = Math.min(minX, area.start.x, area.end.x);
    maxX = Math.max(maxX, area.start.x, area.end.x);
    minY = Math.min(minY, area.start.y, area.end.y);
    maxY = Math.max(maxY, area.start.y, area.end.y);
  });

  const lines: string[] = [];
  for (let y = minY; y <= maxY; y++) {
    let line = "";
    for (let x = minX; x <= maxX; x++) {
      line += grid.get(toKey(x, y)) || " ";
    }
    lines.push(line);
  }

  return lines.join("\n");
};
