import { EXPORT_PADDING } from "../lib/constants";
import type { GridMap, SelectionArea } from "../types";
import { isWideChar } from "./char";
import { fromKey, toKey } from "./math";
import { getSelectionsBoundingBox } from "./selection";

export const exportToString = (grid: Map<string, string>) => {
  if (grid.size === 0) return "";

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  grid.forEach((_char, key) => {
    const { x, y } = fromKey(key);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  const lines: string[] = [];

  for (let y = minY - EXPORT_PADDING; y <= maxY + EXPORT_PADDING; y++) {
    let line = "";
    for (let x = minX - EXPORT_PADDING; x <= maxX + EXPORT_PADDING; x++) {
      const char = grid.get(toKey(x, y));
      if (char) {
        line += char;

        if (isWideChar(char)) {
          x++;
        }
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
};

export const exportSelectionToString = (
  grid: GridMap,
  selections: SelectionArea[]
) => {
  if (selections.length === 0) return "";

  const { minX, maxX, minY, maxY } = getSelectionsBoundingBox(selections);

  const lines: string[] = [];

  for (let y = minY; y <= maxY; y++) {
    let line = "";
    for (let x = minX; x <= maxX; x++) {
      const char = grid.get(toKey(x, y));
      if (char) {
        line += char;

        if (isWideChar(char)) {
          x++;
        }
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
};
