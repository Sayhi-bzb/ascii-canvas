import * as Y from "yjs";
import { GridManager } from "./grid";
import { getBoxPoints, getCirclePoints } from "./shapes";
import type { CanvasNode, GridPoint, NodeType } from "../types";

const traverseScene = (
  root: Y.Map<unknown>,
  predicate: (node: Y.Map<unknown>) => boolean
): { node: Y.Map<unknown>; parent: Y.Map<unknown> | null } | null => {
  if (predicate(root)) return { node: root, parent: null };

  const children = root.get("children");
  if (children instanceof Y.Array) {
    for (let i = 0; i < children.length; i++) {
      const child = children.get(i);
      if (child instanceof Y.Map) {
        if (predicate(child as Y.Map<unknown>)) {
          return { node: child as Y.Map<unknown>, parent: root };
        }
        const result = traverseScene(child as Y.Map<unknown>, predicate);
        if (result) return result;
      }
    }
  }
  return null;
};

export const findNodeById = (root: Y.Map<unknown>, id: string) =>
  traverseScene(root, (node) => node.get("id") === id)?.node ?? null;

export const findParentNodeById = (root: Y.Map<unknown>, targetId: string) =>
  traverseScene(root, (node) => node.get("id") === targetId)?.parent ?? null;

export const isNodeLocked = (node: Y.Map<unknown> | null): boolean => {
  return !!node?.get("isLocked");
};

const isNodeVisible = (node: Y.Map<unknown> | null): boolean => {
  return node?.get("isVisible") !== false;
};

export const canMergeStrokeToNode = (node: Y.Map<unknown> | null): boolean => {
  if (!node) return false;
  return (
    node.get("type") === "shape-path" &&
    !isNodeLocked(node) &&
    isNodeVisible(node)
  );
};

export const getNearestValidContainer = (
  root: Y.Map<unknown>,
  activeId: string | null
): Y.Map<unknown> => {
  if (activeId) {
    const activeNode = findNodeById(root, activeId);
    if (activeNode) {
      const type = activeNode.get("type") as NodeType;

      if ((type === "layer" || type === "item") && !isNodeLocked(activeNode)) {
        return activeNode;
      }

      if (type.startsWith("shape-")) {
        const parent = findParentNodeById(root, activeId);
        if (parent && !isNodeLocked(parent)) return parent;
      }
    }
  }

  return (
    traverseScene(root, (node) => {
      const type = node.get("type") as NodeType;
      return (type === "layer" || type === "item") && !isNodeLocked(node);
    })?.node ?? root
  );
};

type CanvasNodeCreationProps = Omit<Partial<CanvasNode>, "pathData"> & {
  pathData?: GridPoint[];
};

export const createYCanvasNode = (
  type: NodeType,
  name: string,
  props: CanvasNodeCreationProps = {}
): Y.Map<unknown> => {
  const node = new Y.Map<unknown>();
  node.set("id", props.id || crypto.randomUUID());
  node.set("type", type);
  node.set("name", name);
  node.set("x", props.x ?? 0);
  node.set("y", props.y ?? 0);
  node.set("isVisible", props.isVisible ?? true);
  node.set("isLocked", props.isLocked ?? false);
  node.set("isCollapsed", props.isCollapsed ?? false);
  node.set("children", new Y.Array<Y.Map<unknown>>());

  if (type === "layer" || type === "item") {
    node.set("content", new Y.Map<string>());
  }
  if (type.startsWith("shape-")) {
    if (props.width !== undefined) node.set("width", props.width);
    if (props.height !== undefined) node.set("height", props.height);
  }
  if (type === "shape-path") {
    const pathDataMap = new Y.Map<string>();
    if (props.pathData) GridManager.setPoints(pathDataMap, props.pathData);
    node.set("pathData", pathDataMap);
  }
  if (type === "shape-text") {
    node.set("text", props.text || "");
  }
  return node;
};

export const composeScene = (
  node: Y.Map<unknown>,
  globalOffsetX: number = 0,
  globalOffsetY: number = 0,
  resultGrid: Map<string, string>
) => {
  if (!isNodeVisible(node)) return;

  const currentGlobalX = globalOffsetX + ((node.get("x") as number) || 0);
  const currentGlobalY = globalOffsetY + ((node.get("y") as number) || 0);
  const type = node.get("type") as NodeType;

  const content = node.get("content") as Y.Map<string>;
  if (content) {
    GridManager.iterate(content, (char, x, y) => {
      resultGrid.set(
        GridManager.toKey(currentGlobalX + x, currentGlobalY + y),
        char
      );
    });
  }

  if (type === "shape-path") {
    const pathData = node.get("pathData") as Y.Map<string>;
    if (pathData) {
      GridManager.iterate(pathData, (char, x, y) => {
        resultGrid.set(
          GridManager.toKey(currentGlobalX + x, currentGlobalY + y),
          char
        );
      });
    }
  }

  if (type === "shape-box" || type === "shape-circle") {
    const w = (node.get("width") as number) || 0;
    const h = (node.get("height") as number) || 0;
    const points =
      type === "shape-box"
        ? getBoxPoints({ x: 0, y: 0 }, { x: w - 1, y: h - 1 })
        : getCirclePoints(
            { x: Math.floor(w / 2), y: Math.floor(h / 2) },
            { x: 0, y: Math.floor(h / 2) }
          );

    points.forEach((p) => {
      resultGrid.set(
        GridManager.toKey(currentGlobalX + p.x, currentGlobalY + p.y),
        p.char
      );
    });
  }

  if (type === "shape-text") {
    const text = (node.get("text") as string) || "";
    let lineIdx = 0;
    let charIdx = 0;

    for (const char of text) {
      if (char === "\n") {
        lineIdx++;
        charIdx = 0;
        continue;
      }

      const targetX = currentGlobalX + charIdx;
      const targetY = currentGlobalY + lineIdx;

      resultGrid.set(GridManager.toKey(targetX, targetY), char);

      charIdx += GridManager.getCharWidth(char);
    }
  }

  const children = node.get("children");
  if (children instanceof Y.Array) {
    children.forEach((child) => {
      if (child instanceof Y.Map)
        composeScene(child, currentGlobalX, currentGlobalY, resultGrid);
    });
  }
};

const yMapToGridMap = (yMap: Y.Map<string>): Map<string, string> => {
  const gridMap = new Map<string, string>();
  for (const [key, value] of yMap.entries()) {
    gridMap.set(key, value);
  }
  return gridMap;
};

export const parseSceneGraph = (node: Y.Map<unknown>): CanvasNode => {
  let content: Map<string, string> | undefined = undefined;
  const rawContent = node.get("content");
  if (rawContent instanceof Y.Map) {
    content = yMapToGridMap(rawContent as Y.Map<string>);
  }

  let pathData: Map<string, string> | undefined = undefined;
  const rawPathData = node.get("pathData");
  if (rawPathData instanceof Y.Map) {
    pathData = yMapToGridMap(rawPathData as Y.Map<string>);
  }

  const children: CanvasNode[] = [];
  const childrenYArray = node.get("children");
  if (childrenYArray instanceof Y.Array) {
    childrenYArray.forEach((child) => {
      if (child instanceof Y.Map) children.push(parseSceneGraph(child));
    });
  }

  return {
    id: node.get("id") as string,
    type: node.get("type") as NodeType,
    name: node.get("name") as string,
    parentId: null,
    children,
    x: (node.get("x") as number) || 0,
    y: (node.get("y") as number) || 0,
    width: node.get("width") as number,
    height: node.get("height") as number,
    isVisible: isNodeVisible(node),
    isLocked: isNodeLocked(node),
    isCollapsed: node.get("isCollapsed") === true,
    content,
    pathData,
    text: node.get("text") as string | undefined,
  };
};
