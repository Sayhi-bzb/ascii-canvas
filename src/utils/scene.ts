import * as Y from "yjs";
import { GridManager } from "./grid";
import type { CanvasNode, GridMap } from "../types";

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
  const currentGlobalX = globalOffsetX + localX;
  const currentGlobalY = globalOffsetY + localY;

  // 1. 渲染当前图层的笔触内容 (本层设施)
  const content = node.get("content") as Y.Map<string>;
  if (content) {
    content.forEach((char, key) => {
      const { x: localGridX, y: localGridY } = GridManager.fromKey(key);
      const worldX = currentGlobalX + localGridX;
      const worldY = currentGlobalY + localGridY;
      const worldKey = GridManager.toKey(worldX, worldY);
      resultGrid.set(worldKey, char);
    });
  }

  // 2. 递归渲染所有子图层 (下属区划设施)
  const children = node.get("children");
  if (children instanceof Y.Array) {
    children.forEach((childNode) => {
      if (childNode instanceof Y.Map) {
        composeScene(
          childNode as Y.Map<unknown>,
          currentGlobalX,
          currentGlobalY,
          resultGrid
        );
      }
    });
  }
};

export const parseSceneGraph = (node: Y.Map<unknown>): CanvasNode => {
  const id = node.get("id") as string;
  const type = node.get("type") as any;
  const name = node.get("name") as string;
  const x = node.get("x") as number;
  const y = node.get("y") as number;
  const isVisible = node.get("isVisible") as boolean;
  const isLocked = node.get("isLocked") as boolean;
  const isCollapsed = node.get("isCollapsed") as boolean;

  const childrenYArray = node.get("children");
  const children: CanvasNode[] = [];

  if (childrenYArray instanceof Y.Array) {
    childrenYArray.forEach((child) => {
      if (child instanceof Y.Map) {
        children.push(parseSceneGraph(child as Y.Map<unknown>));
      }
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
    isVisible,
    isLocked,
    isCollapsed,
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
