import { EXPORT_PADDING } from "../lib/constants";
import type { GridMap, SelectionArea } from "../types";
import { GridManager } from "./grid";
import { getSelectionsBoundingBox } from "./selection";

const generateStringFromBounds = (
  grid: GridMap,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): string => {
  const lines: string[] = [];

  for (let y = minY; y <= maxY; y++) {
    let line = "";
    for (let x = minX; x <= maxX; x++) {
      const char = grid.get(GridManager.toKey(x, y));
      if (char) {
        line += char;
        const width = GridManager.getCharWidth(char);
        if (width === 2) x++; // 跳过占用的影子地块
      } else {
        line += " ";
      }
    }
    // 移除行尾无用的“空地”
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
};

export const exportToString = (grid: GridMap) => {
  if (grid.size === 0) return "";
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  grid.forEach((_char, key) => {
    const { x, y } = GridManager.fromKey(key);
    const width = GridManager.getCharWidth(_char);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width - 1);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  return generateStringFromBounds(
    grid,
    minX - EXPORT_PADDING,
    maxX + EXPORT_PADDING,
    minY - EXPORT_PADDING,
    maxY + EXPORT_PADDING
  );
};

export const exportSelectionToString = (
  grid: GridMap,
  selections: SelectionArea[]
) => {
  if (selections.length === 0) return "";
  const { minX, maxX, minY, maxY } = getSelectionsBoundingBox(selections);
  return generateStringFromBounds(grid, minX, maxX, minY, maxY);
};
