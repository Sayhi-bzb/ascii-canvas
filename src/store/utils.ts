import * as Y from "yjs";
import { ySceneRoot } from "../lib/yjs-setup";
import { findNodeById } from "../utils/scene";
import { GridManager } from "../utils/grid";

export const getActiveGridYMap = (
  currentActiveId: string | null
): Y.Map<string> | null => {
  if (!currentActiveId) return null;
  const node = findNodeById(ySceneRoot, currentActiveId);
  if (!node) return null;

  const content = node.get("content");
  if (content instanceof Y.Map) {
    return content as Y.Map<string>;
  }

  const pathData = node.get("pathData");
  if (pathData instanceof Y.Map) {
    return pathData as Y.Map<string>;
  }

  return null;
};

export const placeCharInYMap = (
  targetGrid: Y.Map<string>,
  x: number,
  y: number,
  char: string
) => {
  if (!char) return;

  const leftKey = GridManager.toKey(x - 1, y);
  const leftChar = targetGrid.get(leftKey);
  if (leftChar && GridManager.isWideChar(leftChar)) {
    targetGrid.delete(leftKey);
  }

  targetGrid.set(GridManager.toKey(x, y), char);

  if (GridManager.isWideChar(char)) {
    targetGrid.delete(GridManager.toKey(x + 1, y));
  }
};
