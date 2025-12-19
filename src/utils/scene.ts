import * as Y from "yjs";
import { GridManager } from "./grid";
import { getBoxPoints, getCirclePoints } from "./shapes";
import type { CanvasNode, GridMap, GridPoint } from "../types";

export const findParentNodeById = (
  root: Y.Map<unknown>,
  targetId: string
): Y.Map<unknown> | null => {
  const children = root.get("children");
  if (children instanceof Y.Array) {
    for (let i = 0; i < children.length; i++) {
      const child = children.get(i) as Y.Map<unknown>;
      if (child.get("id") === targetId) return root;
      const found = findParentNodeById(child, targetId);
      if (found) return found;
    }
  }
  return null;
};

export const getNearestValidContainer = (
  root: Y.Map<unknown>,
  activeId: string | null
): Y.Map<unknown> => {
  if (activeId) {
    const activeNode = findNodeById(root, activeId);
    if (activeNode) {
      const type = activeNode.get("type") as string;
      if (type === "layer" && !(activeNode.get("isLocked") as boolean))
        return activeNode;
      if (type.startsWith("shape-")) {
        const parent = findParentNodeById(root, activeId);
        if (
          parent &&
          parent.get("type") === "layer" &&
          !(parent.get("isLocked") as boolean)
        )
          return parent;
      }
    }
  }
  const findFirstLayer = (node: Y.Map<unknown>): Y.Map<unknown> | null => {
    if (node.get("type") === "layer" && !(node.get("isLocked") as boolean))
      return node;
    const children = node.get("children");
    if (children instanceof Y.Array) {
      for (let i = 0; i < children.length; i++) {
        const found = findFirstLayer(children.get(i));
        if (found) return found;
      }
    }
    return null;
  };
  return findFirstLayer(root) || root;
};

export const composeScene = (
  node: Y.Map<unknown>,
  globalOffsetX: number = 0,
  globalOffsetY: number = 0,
  resultGrid: GridMap
) => {
  const isVisible = node.get("isVisible") as boolean;
  if (isVisible === false) return;

  const localX = (node.get("x") as number) || 0;
  const localY = (node.get("y") as number) || 0;
  const type = node.get("type") as string;
  const currentGlobalX = globalOffsetX + localX;
  const currentGlobalY = globalOffsetY + localY;

  const content = node.get("content") as Y.Map<string>;
  if (content) {
    content.forEach((char, key) => {
      const { x, y } = GridManager.fromKey(key);
      resultGrid.set(
        GridManager.toKey(currentGlobalX + x, currentGlobalY + y),
        char
      );
    });
  }

  if (type === "shape-path") {
    const pathData = node.get("pathData") as Y.Map<string>;
    if (pathData) {
      pathData.forEach((char, key) => {
        const { x, y } = GridManager.fromKey(key);
        resultGrid.set(
          GridManager.toKey(currentGlobalX + x, currentGlobalY + y),
          char
        );
      });
    }
  }

  if (type === "shape-box") {
    const w = (node.get("width") as number) || 0;
    const h = (node.get("height") as number) || 0;
    const points = getBoxPoints({ x: 0, y: 0 }, { x: w - 1, y: h - 1 });
    points.forEach((p) => {
      resultGrid.set(
        GridManager.toKey(currentGlobalX + p.x, currentGlobalY + p.y),
        p.char
      );
    });
  }

  if (type === "shape-circle") {
    const w = (node.get("width") as number) || 0;
    const h = (node.get("height") as number) || 0;
    const center = { x: Math.floor(w / 2), y: Math.floor(h / 2) };
    const edge = { x: 0, y: center.y };
    const points = getCirclePoints(center, edge);
    points.forEach((p) => {
      resultGrid.set(
        GridManager.toKey(currentGlobalX + p.x, currentGlobalY + p.y),
        p.char
      );
    });
  }

  const children = node.get("children");
  if (children instanceof Y.Array) {
    children.forEach((childNode) => {
      if (childNode instanceof Y.Map)
        composeScene(
          childNode as Y.Map<unknown>,
          currentGlobalX,
          currentGlobalY,
          resultGrid
        );
    });
  }
};

export const parseSceneGraph = (node: Y.Map<unknown>): CanvasNode => {
  const id = node.get("id") as string;
  const type = node.get("type") as NodeType;
  const name = node.get("name") as string;
  const x = (node.get("x") as number) || 0;
  const y = (node.get("y") as number) || 0;
  const width = (node.get("width") as number) || 0;
  const height = (node.get("height") as number) || 0;
  const isVisible = node.get("isVisible") as boolean;
  const isLocked = node.get("isLocked") as boolean;
  const isCollapsed = node.get("isCollapsed") as boolean;

  let pathData: GridPoint[] | undefined = undefined;
  const rawPathData = node.get("pathData");
  if (rawPathData instanceof Y.Map) {
    pathData = [];
    rawPathData.forEach((char, key) => {
      const { x, y: py } = GridManager.fromKey(key);
      pathData?.push({ x, y: py, char });
    });
  }

  const children: CanvasNode[] = [];
  const childrenYArray = node.get("children");
  if (childrenYArray instanceof Y.Array) {
    childrenYArray.forEach((child) => {
      if (child instanceof Y.Map)
        children.push(parseSceneGraph(child as Y.Map<unknown>));
    });
  }

  return {
    id,
    type,
    name,
    parentId: null,
    children,
    x,
    y,
    width,
    height,
    isVisible,
    isLocked,
    isCollapsed,
    pathData,
  };
};

export const findNodeById = (
  root: Y.Map<unknown>,
  id: string
): Y.Map<unknown> | null => {
  if (root.get("id") === id) return root;
  const children = root.get("children");
  if (children instanceof Y.Array) {
    for (let i = 0; i < children.length; i++) {
      const child = children.get(i);
      if (child instanceof Y.Map) {
        const found = findNodeById(child as Y.Map<unknown>, id);
        if (found) return found;
      }
    }
  }
  return null;
};
