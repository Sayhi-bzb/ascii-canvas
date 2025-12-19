```src/utils/event.ts
export const isCtrlOrMeta = (event: { ctrlKey: boolean; metaKey: boolean }) => {
  return event.ctrlKey || event.metaKey;
};
```
---
```src/utils/export.ts
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
        if (width === 2) x++;
      } else {
        line += " ";
      }
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
};

export const exportToString = (grid: GridMap) => {
  if (grid.size === 0) return "";

  const { minX, maxX, minY, maxY } = GridManager.getGridBounds(grid);

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
```
---
```src/utils/grid.ts
import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";
import type { Point, GridMap } from "../types";

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

  getCharWidth(char: string): number {
    if (!char) return 1;
    const isWide =
      /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ue000-\uf8ff]/.test(char) ||
      /\p{Emoji_Presentation}/u.test(char);
    return isWide ? 2 : 1;
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
    if (grid.size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    grid.forEach((char, key) => {
      const { x, y } = this.fromKey(key);
      const width = this.getCharWidth(char);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width - 1);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    return { minX, maxX, minY, maxY };
  },
};
```
---
```src/utils/scene.ts
import * as Y from "yjs";
import { GridManager } from "./grid";
import { getBoxPoints, getCirclePoints } from "./shapes";
import type { CanvasNode, GridMap, GridPoint, NodeType } from "../types";

const traverseScene = (
  root: Y.Map<unknown>,
  predicate: (node: Y.Map<unknown>) => boolean
): { node: Y.Map<unknown>; parent: Y.Map<unknown> | null } | null => {
  if (predicate(root)) {
    return { node: root, parent: null };
  }

  const children = root.get("children");
  if (children instanceof Y.Array) {
    for (let i = 0; i < children.length; i++) {
      const child = children.get(i);
      if (child instanceof Y.Map) {
        if (predicate(child as Y.Map<unknown>)) {
          return { node: child as Y.Map<unknown>, parent: root };
        }

        const result = traverseScene(child as Y.Map<unknown>, predicate);

        if (result) {
          return result;
        }
      }
    }
  }
  return null;
};

export const findNodeById = (
  root: Y.Map<unknown>,
  id: string
): Y.Map<unknown> | null => {
  const result = traverseScene(root, (node) => node.get("id") === id);
  return result ? result.node : null;
};

export const findParentNodeById = (
  root: Y.Map<unknown>,
  targetId: string
): Y.Map<unknown> | null => {
  const result = traverseScene(root, (node) => node.get("id") === targetId);
  return result ? result.parent : null;
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

  const result = traverseScene(
    root,
    (node) => node.get("type") === "layer" && !(node.get("isLocked") as boolean)
  );

  return result ? result.node : root;
};

export const createYCanvasNode = (
  type: NodeType,
  name: string,
  props: Partial<CanvasNode> = {}
): Y.Map<unknown> => {
  const node = new Y.Map<unknown>();
  const id = props.id || crypto.randomUUID();

  node.set("id", id);
  node.set("type", type);
  node.set("name", name);
  node.set("x", props.x ?? 0);
  node.set("y", props.y ?? 0);
  node.set("isVisible", props.isVisible ?? true);
  node.set("isLocked", props.isLocked ?? false);
  node.set("isCollapsed", props.isCollapsed ?? false);
  node.set("children", new Y.Array<Y.Map<unknown>>());

  if (type === "layer") {
    node.set("content", new Y.Map<string>());
  }

  if (type.startsWith("shape-")) {
    if (props.width !== undefined) node.set("width", props.width);
    if (props.height !== undefined) node.set("height", props.height);
  }

  if (type === "shape-path") {
    const pathDataMap = new Y.Map<string>();
    if (props.pathData) {
      props.pathData.forEach((p) => {
        pathDataMap.set(GridManager.toKey(p.x, p.y), p.char);
      });
    }
    node.set("pathData", pathDataMap);
  }

  return node;
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
```
---
```src/utils/selection.ts
import type { SelectionArea } from "../types";

export const getSelectionBounds = (area: SelectionArea) => {
  const minX = Math.min(area.start.x, area.end.x);
  const maxX = Math.max(area.start.x, area.end.x);
  const minY = Math.min(area.start.y, area.end.y);
  const maxY = Math.max(area.start.y, area.end.y);
  return { minX, maxX, minY, maxY };
};

export const getSelectionsBoundingBox = (selections: SelectionArea[]) => {
  if (selections.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

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

  return { minX, maxX, minY, maxY };
};
```
---
```src/utils/shapes.ts
import { BOX_CHARS } from "../lib/constants";
import type { Point, GridPoint } from "../types";

function resolvePointChars(points: Point[]): GridPoint[] {
  return points.map((p, i) => {
    const prev = points[i - 1];
    const next = points[i + 1];

    if (!prev && !next) return { ...p, char: BOX_CHARS.CROSS };

    const dIn = prev ? `${p.x - prev.x},${p.y - prev.y}` : null;
    const dOut = next ? `${next.x - p.x},${next.y - p.y}` : null;

    const isH = (d: string | null) => d === "1,0" || d === "-1,0";
    const isV = (d: string | null) => d === "0,1" || d === "0,-1";

    if ((isH(dIn) || !dIn) && (isH(dOut) || !dOut)) {
      return { ...p, char: BOX_CHARS.HORIZONTAL };
    }
    if ((isV(dIn) || !dIn) && (isV(dOut) || !dOut)) {
      return { ...p, char: BOX_CHARS.VERTICAL };
    }

    const combined = `${dIn}|${dOut}`;
    let char = BOX_CHARS.CROSS;

    switch (combined) {
      case "0,-1|1,0":
      case "-1,0|0,1":
        char = BOX_CHARS.TOP_LEFT;
        break;

      case "0,-1|-1,0":
      case "1,0|0,1":
        char = BOX_CHARS.TOP_RIGHT;
        break;

      case "0,1|1,0":
      case "-1,0|0,-1":
        char = BOX_CHARS.BOTTOM_LEFT;
        break;
      case "0,1|-1,0":
      case "1,0|0,-1":
        char = BOX_CHARS.BOTTOM_RIGHT;
        break;
    }

    return { ...p, char };
  });
}

export function getLShapeLinePoints(
  start: Point,
  end: Point,
  isVerticalFirst: boolean
): GridPoint[] {
  const points: Point[] = [];
  const junction = isVerticalFirst
    ? { x: start.x, y: end.y }
    : { x: end.x, y: start.y };

  const drawLine = (p1: Point, p2: Point) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const stepX = dx === 0 ? 0 : dx / adx;
    const stepY = dy === 0 ? 0 : dy / ady;
    const steps = Math.max(adx, ady);

    for (let i = 0; i <= steps; i++) {
      points.push({ x: p1.x + i * stepX, y: p1.y + i * stepY });
    }
  };

  drawLine(start, junction);
  points.pop();
  drawLine(junction, end);

  const uniquePoints: Point[] = [];
  const seen = new Set();
  points.forEach((p) => {
    const key = `${p.x},${p.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePoints.push(p);
    }
  });

  return resolvePointChars(uniquePoints);
}

export function getStepLinePoints(start: Point, end: Point): GridPoint[] {
  const points: Point[] = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;

  points.push({ x, y });
  while (x !== end.x || y !== end.y) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
      points.push({ x, y });
    }
    if (x === end.x && y === end.y) break;
    if (e2 < dx) {
      err += dx;
      y += sy;
      points.push({ x, y });
    }
  }
  return resolvePointChars(points);
}

export function getBoxPoints(start: Point, end: Point): GridPoint[] {
  const points: GridPoint[] = [];
  const x1 = Math.min(start.x, end.x);
  const x2 = Math.max(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const y2 = Math.max(start.y, end.y);

  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
      if (x === x1 || x === x2 || y === y1 || y === y2) {
        let char = "";
        if (x === x1 && y === y1) char = BOX_CHARS.TOP_LEFT;
        else if (x === x2 && y === y1) char = BOX_CHARS.TOP_RIGHT;
        else if (x === x1 && y === y2) char = BOX_CHARS.BOTTOM_LEFT;
        else if (x === x2 && y === y2) char = BOX_CHARS.BOTTOM_RIGHT;
        else if (y === y1 || y === y2) char = BOX_CHARS.HORIZONTAL;
        else char = BOX_CHARS.VERTICAL;
        points.push({ x, y, char });
      }
    }
  }
  return points;
}

export function getCirclePoints(center: Point, edge: Point): GridPoint[] {
  const dx = edge.x - center.x;
  const dy = edge.y - center.y;
  const radius = Math.sqrt(dx * dx + dy * 2 * (dy * 2)) * 2;

  if (radius < 1) return [{ x: center.x, y: center.y, char: "·" }];

  const result: GridPoint[] = [];
  const minX = Math.floor(center.x - radius / 2) - 1;
  const maxX = Math.ceil(center.x + radius / 2) + 1;
  const minY = Math.floor(center.y - radius / 4) - 1;
  const maxY = Math.ceil(center.y + radius / 4) + 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let brailleCode = 0;

      const dotMap = [
        [0, 0, 0x01],
        [0, 1, 0x02],
        [0, 2, 0x04],
        [1, 0, 0x08],
        [1, 1, 0x10],
        [1, 2, 0x20],
        [0, 3, 0x40],
        [1, 3, 0x80],
      ];

      dotMap.forEach(([dx_sub, dy_sub, bit]) => {
        const subX = x * 2 + dx_sub;
        const subY = y * 4 + dy_sub;
        const centerX_sub = center.x * 2;
        const centerY_sub = center.y * 4;

        const dist = Math.sqrt(
          Math.pow(subX - centerX_sub, 2) + Math.pow(subY - centerY_sub, 2)
        );

        if (Math.abs(dist - radius) < 0.8) {
          brailleCode |= bit;
        }
      });

      if (brailleCode > 0) {
        result.push({
          x,
          y,
          char: String.fromCharCode(0x2800 + brailleCode),
        });
      }
    }
  }

  return result;
}
```
---
```src/store/canvasStore.ts
import { create } from "zustand";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { composeScene, parseSceneGraph } from "../utils/scene";
import { ySceneRoot } from "../lib/yjs-setup";
import type { CanvasState } from "./interfaces";
import {
  createNodeSlice,
  createDrawingSlice,
  createTextSlice,
  createSelectionSlice,
} from "./slices";

export type { CanvasState };

export const useCanvasStore = create<CanvasState>((set, get, ...a) => {
  const render = () => {
    const compositeGrid = new Map<string, string>();
    composeScene(ySceneRoot, 0, 0, compositeGrid);
    const tree = parseSceneGraph(ySceneRoot);
    set({ grid: compositeGrid, sceneGraph: tree });
  };

  ySceneRoot.observeDeep(() => {
    render();
  });

  setTimeout(render, 0);

  return {
    offset: { x: 0, y: 0 },
    zoom: 1,
    grid: new Map(),
    sceneGraph: null,
    activeNodeId: "item-main",
    tool: "select",
    brushChar: "#",

    setOffset: (updater) => set((state) => ({ offset: updater(state.offset) })),
    setZoom: (updater) =>
      set((state) => ({
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
      })),
    setTool: (tool) => set({ tool, textCursor: null }),
    setBrushChar: (char) => set({ brushChar: char }),
    setActiveNode: (id) =>
      set({ activeNodeId: id, selections: [], textCursor: null }),

    ...createNodeSlice(set, get, ...a),
    ...createDrawingSlice(set, get, ...a),
    ...createTextSlice(set, get, ...a),
    ...createSelectionSlice(set, get, ...a),
  };
});
```
---
```src/store/interfaces.ts
import type {
  CanvasNode,
  GridMap,
  GridPoint,
  Point,
  SelectionArea,
  ToolType,
} from "../types";

export interface CommonState {
  offset: Point;
  zoom: number;
  tool: ToolType;
  brushChar: string;
  grid: GridMap;
  sceneGraph: CanvasNode | null;
  activeNodeId: string | null;

  setOffset: (updater: (prev: Point) => Point) => void;
  setZoom: (updater: (prev: number) => number) => void;
  setTool: (tool: ToolType) => void;
  setBrushChar: (char: string) => void;
  setActiveNode: (id: string | null) => void;
}

export interface NodeSlice {
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  addNode: (parentId: string, type: CanvasNode["type"], name: string) => void;
  deleteNode: (id: string) => void;
}

export interface DrawingSlice {
  scratchLayer: GridMap | null;
  setScratchLayer: (points: GridPoint[]) => void;
  addScratchPoints: (points: GridPoint[]) => void;
  commitScratch: () => void;
  clearScratch: () => void;
  clearCanvas: () => void;
  erasePoints: (points: Point[]) => void;
}

export interface TextSlice {
  textCursor: Point | null;
  setTextCursor: (pos: Point | null) => void;
  writeTextString: (str: string, startPos?: Point) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;
}

export interface SelectionSlice {
  selections: SelectionArea[];
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  deleteSelection: () => void;
  fillSelections: () => void;
  fillSelectionsWithChar: (char: string) => void;
  copySelectionToClipboard: () => void;
  cutSelectionToClipboard: () => void;
}

export type CanvasState = CommonState &
  NodeSlice &
  DrawingSlice &
  TextSlice &
  SelectionSlice;
```
---
```src/store/utils.ts
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
```
---
```src/store/slices/drawingSlice.ts
import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { z } from "zod";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, ySceneRoot } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { GridPointSchema } from "../../types";
import {
  getNearestValidContainer,
  findNodeById,
  createYCanvasNode,
} from "../../utils/scene";

export const createDrawingSlice: StateCreator<
  CanvasState,
  [],
  [],
  DrawingSlice
> = (set, get) => ({
  scratchLayer: null,

  setScratchLayer: (rawPoints) => {
    const points = z.array(GridPointSchema).parse(rawPoints);
    const layer = new Map<string, string>();
    points.forEach((p) => layer.set(GridManager.toKey(p.x, p.y), p.char));
    set({ scratchLayer: layer });
  },

  addScratchPoints: (rawPoints) => {
    const points = z.array(GridPointSchema).parse(rawPoints);
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      points.forEach((p) => layer.set(GridManager.toKey(p.x, p.y), p.char));
      return { scratchLayer: layer };
    });
  },

  commitScratch: () => {
    const { scratchLayer, activeNodeId, tool } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;

    transactWithHistory(() => {
      let container = getNearestValidContainer(ySceneRoot, activeNodeId);

      if (container.get("type") === "root") {
        const currentLayers = ySceneRoot.get("children") as Y.Array<
          Y.Map<unknown>
        >;
        const autoLayer = createYCanvasNode(
          "layer",
          `Layer ${currentLayers.length + 1}`
        );
        currentLayers.push([autoLayer]);
        container = autoLayer;
      }

      const { minX, minY, maxX, maxY } =
        GridManager.getGridBounds(scratchLayer);

      const pathData = [] as { x: number; y: number; char: string }[];
      if (
        tool === "brush" ||
        tool === "line" ||
        tool === "stepline" ||
        tool === "eraser"
      ) {
        scratchLayer.forEach((char, key) => {
          const { x, y } = GridManager.fromKey(key);
          pathData.push({ x, y, char });
        });
      }

      let newNode: Y.Map<unknown> | null = null;

      if (tool === "brush") {
        const activeNode = activeNodeId
          ? findNodeById(ySceneRoot, activeNodeId)
          : null;
        if (
          activeNode &&
          activeNode.get("type") === "shape-path" &&
          !(activeNode.get("isLocked") as boolean)
        ) {
          const pathDataMap = activeNode.get("pathData") as Y.Map<string>;
          scratchLayer.forEach((char, key) => pathDataMap.set(key, char));
          set({ scratchLayer: null });
          return;
        }
        newNode = createYCanvasNode("shape-path", "Path", { pathData });
      } else if (tool === "box") {
        newNode = createYCanvasNode("shape-box", "Box", {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        });
      } else if (tool === "circle") {
        newNode = createYCanvasNode("shape-circle", "Circle", {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        });
      } else if (tool === "line" || tool === "stepline") {
        newNode = createYCanvasNode(
          "shape-path",
          tool === "line" ? "Line" : "Step Line",
          { pathData }
        );
      }

      if (newNode) {
        (container.get("children") as Y.Array<Y.Map<unknown>>).push([newNode]);
        set({ activeNodeId: newNode.get("id") as string });
      }
    });

    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),

  clearCanvas: () => {
    const { activeNodeId } = get();
    const node = activeNodeId ? findNodeById(ySceneRoot, activeNodeId) : null;
    if (node) {
      transactWithHistory(() => {
        const type = node.get("type") as string;
        if (type === "shape-path") {
          (node.get("pathData") as Y.Map<string>).clear();
        } else if (type === "layer") {
          const children = node.get("children") as Y.Array<Y.Map<unknown>>;
          if (children) children.delete(0, children.length);
          const content = node.get("content") as Y.Map<string>;
          if (content) content.clear();
        }
      });
    }
  },

  erasePoints: (points) => {
    const { activeNodeId } = get();
    const node = activeNodeId ? findNodeById(ySceneRoot, activeNodeId) : null;
    if (node && node.get("type") === "shape-path") {
      transactWithHistory(() => {
        const pathData = node.get("pathData") as Y.Map<string>;
        points.forEach((p) => pathData.delete(GridManager.toKey(p.x, p.y)));
      });
    }
  },
});
```
---
```src/store/slices/index.ts
export { createNodeSlice } from "./nodeSlice";
export { createDrawingSlice } from "./drawingSlice";
export { createTextSlice } from "./textSlice";
export { createSelectionSlice } from "./selectionSlice";
```
---
```src/store/slices/nodeSlice.ts
import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { toast } from "sonner";
import type { CanvasState, NodeSlice } from "../interfaces";
import { ySceneRoot, transactWithHistory } from "../../lib/yjs-setup";
import {
  findNodeById,
  findParentNodeById,
  createYCanvasNode,
} from "../../utils/scene";

export const createNodeSlice: StateCreator<CanvasState, [], [], NodeSlice> = (
  set
) => ({
  updateNode: (id, updates) => {
    const node = findNodeById(ySceneRoot, id);
    if (!node) return;

    transactWithHistory(() => {
      Object.entries(updates).forEach(([key, value]) => {
        if (key === "children" || key === "content" || key === "id") return;
        node.set(key, value);
      });
    });
  },

  addNode: (parentId, type, name) => {
    let parent = findNodeById(ySceneRoot, parentId);

    if (parent && (parent.get("type") as string).startsWith("shape-")) {
      const realParent = findParentNodeById(ySceneRoot, parentId);
      if (realParent) parent = realParent;
    }

    if (!parent) return;
    const children = parent.get("children") as Y.Array<Y.Map<unknown>>;

    transactWithHistory(() => {
      const newNode = createYCanvasNode(type, name, {
        width: type.startsWith("shape-") ? 10 : undefined,
        height: type.startsWith("shape-") ? 5 : undefined,
      });

      children.push([newNode]);
      set({ activeNodeId: newNode.get("id") as string });
    });
  },

  deleteNode: (id) => {
    if (id === "root" || id === "item-main") return;

    const findAndRemove = (current: Y.Map<unknown>): boolean => {
      const children = current.get("children") as Y.Array<Y.Map<unknown>>;
      if (!children) return false;

      for (let i = 0; i < children.length; i++) {
        const child = children.get(i);
        if (child.get("id") === id) {
          children.delete(i, 1);
          return true;
        }
        if (findAndRemove(child)) return true;
      }
      return false;
    };

    transactWithHistory(() => {
      if (findAndRemove(ySceneRoot)) {
        set({ activeNodeId: "item-main" });
        toast.success("Node deleted");
      }
    });
  },
});
```
---
```src/store/slices/selectionSlice.ts
import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { toast } from "sonner";
import type { CanvasState, SelectionSlice } from "../interfaces";
import { transactWithHistory } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getSelectionBounds } from "../../utils/selection";
import { exportSelectionToString } from "../../utils/export";
import { getActiveGridYMap, placeCharInYMap } from "../utils";
import { SelectionAreaSchema } from "../../types";

export const createSelectionSlice: StateCreator<
  CanvasState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selections: [],

  addSelection: (rawArea) => {
    const area = SelectionAreaSchema.parse(rawArea);
    set((s) => ({ selections: [...s.selections, area] }));
  },

  clearSelections: () => set({ selections: [] }),

  deleteSelection: () => {
    const { selections, activeNodeId, grid } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;

    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const head = GridManager.snapToCharStart({ x, y }, grid);
            targetGrid.delete(GridManager.toKey(head.x, head.y));
          }
        }
      });
    });
  },

  fillSelections: () => {
    const { selections, brushChar } = get();
    if (selections.length > 0) get().fillSelectionsWithChar(brushChar);
  },

  fillSelectionsWithChar: (char: string) => {
    const { selections, activeNodeId } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;

    const charWidth = GridManager.getCharWidth(char);
    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x += charWidth) {
            if (x + charWidth - 1 > maxX) break;

            placeCharInYMap(targetGrid, x, y, char);
          }
        }
      });
    });
  },

  copySelectionToClipboard: () => {
    const { grid, selections } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  },

  cutSelectionToClipboard: () => {
    const { grid, selections, deleteSelection } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => {
      deleteSelection();
      toast.success("Cut!");
    });
  },
});
```
---
```src/store/slices/textSlice.ts
import type { StateCreator } from "zustand";
import * as Y from "yjs";
import type { CanvasState, TextSlice } from "../interfaces";
import { transactWithHistory } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getActiveGridYMap, placeCharInYMap } from "../utils";
import { PointSchema } from "../../types";

export const createTextSlice: StateCreator<CanvasState, [], [], TextSlice> = (
  set,
  get
) => ({
  textCursor: null,

  setTextCursor: (rawPos) => {
    const pos = rawPos ? PointSchema.parse(rawPos) : null;
    set({ textCursor: pos, selections: [] });
  },

  writeTextString: (str, rawStartPos) => {
    const { textCursor, activeNodeId } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;

    const startPos = rawStartPos ? PointSchema.parse(rawStartPos) : undefined;
    const cursor = startPos
      ? { ...startPos }
      : textCursor
      ? { ...textCursor }
      : null;
    if (!cursor) return;

    const startX = cursor.x;
    transactWithHistory(() => {
      for (const char of str) {
        if (char === "\n") {
          cursor.y += 1;
          cursor.x = startX;
          continue;
        }

        placeCharInYMap(targetGrid, cursor.x, cursor.y, char);

        cursor.x += GridManager.getCharWidth(char);
      }
    }, str.length > 1);

    if (get().textCursor) set({ textCursor: { x: cursor.x, y: cursor.y } });
  },

  moveTextCursor: (dx, dy) => {
    const { textCursor, grid } = get();
    if (!textCursor) return;
    let newX = textCursor.x;
    const newY = textCursor.y + dy;

    if (dx > 0) {
      const char = grid.get(GridManager.toKey(newX, textCursor.y));
      newX += GridManager.getCharWidth(char || " ");
    } else if (dx < 0) {
      const leftKey = GridManager.toKey(newX - 1, textCursor.y);
      const leftChar = grid.get(leftKey);
      if (!leftChar) {
        const farLeftChar = grid.get(GridManager.toKey(newX - 2, textCursor.y));
        newX -= farLeftChar && GridManager.isWideChar(farLeftChar) ? 2 : 1;
      } else {
        newX -= 1;
      }
    }
    set({ textCursor: { x: newX, y: newY } });
  },

  backspaceText: () => {
    const { textCursor, grid, activeNodeId } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!textCursor || !targetGrid) return;

    const { x, y } = textCursor;
    let deletePos = { x: x - 1, y };
    const charAtMinus1 = grid.get(GridManager.toKey(x - 1, y));
    const charAtMinus2 = grid.get(GridManager.toKey(x - 2, y));

    if (!charAtMinus1 && charAtMinus2 && GridManager.isWideChar(charAtMinus2)) {
      deletePos = { x: x - 2, y };
    }
    transactWithHistory(() => {
      targetGrid.delete(GridManager.toKey(deletePos.x, deletePos.y));
    });
    set({ textCursor: deletePos });
  },

  newlineText: () =>
    set((s) =>
      s.textCursor
        ? { textCursor: { ...s.textCursor, y: s.textCursor.y + 1 } }
        : {}
    ),
});
```
---
```src/types/index.ts
import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof PointSchema>;

export const GridPointSchema = PointSchema.extend({
  char: z.string().length(1),
});

export type GridPoint = z.infer<typeof GridPointSchema>;

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export type SelectionArea = z.infer<typeof SelectionAreaSchema>;

export const NodeTypeSchema = z.enum([
  "root",
  "layer",
  "shape-box",
  "shape-line",
  "shape-path",
  "shape-text",
  "shape-circle",
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  x: number;
  y: number;
  width?: number;
  height?: number;
  isVisible: boolean;
  isLocked: boolean;
  isCollapsed: boolean;
  pathData?: GridPoint[];
  props?: Record<string, unknown>;
  children: CanvasNode[];
}

export const CanvasNodeSchema: z.ZodType<CanvasNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: NodeTypeSchema,
    name: z.string().min(1).max(50),
    parentId: z.string().nullable(),
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().optional(),
    height: z.number().optional(),
    isVisible: z.boolean().default(true),
    isLocked: z.boolean().default(false),
    isCollapsed: z.boolean().default(false),
    pathData: z.array(GridPointSchema).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    children: z.array(CanvasNodeSchema),
  })
);

export type GridMap = Map<string, string>;

export type ToolType =
  | "select"
  | "fill"
  | "brush"
  | "eraser"
  | "box"
  | "line"
  | "stepline"
  | "circle"
  | "text";
```
---
```src/lib/constants.ts
export const CELL_WIDTH = 10;
export const CELL_HEIGHT = 20;

export const GRID_COLOR = "#e5e7eb";
export const BACKGROUND_COLOR = "#ffffff";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

export const FONT_SIZE = 15;
export const COLOR_PRIMARY_TEXT = "#000000";
export const COLOR_SCRATCH_LAYER = "#3b82f6";
export const COLOR_TEXT_CURSOR_BG = "rgba(0, 0, 0, 0.5)";
export const COLOR_TEXT_CURSOR_FG = "#ffffff";
export const COLOR_ORIGIN_MARKER = "red";

export const COLOR_SELECTION_BG = "rgba(0, 0, 0, 0.2)";
export const COLOR_SELECTION_BORDER = "transparent";

export const EXPORT_PADDING = 1;

export const BOX_CHARS = {
  TOP_LEFT: "╭",
  TOP_RIGHT: "╮",
  BOTTOM_LEFT: "╰",
  BOTTOM_RIGHT: "╯",
  HORIZONTAL: "─",
  VERTICAL: "│",
  CROSS: "┼",
};
```
---
```src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
---
```src/lib/yjs-setup.ts
import * as Y from "yjs";

const yDoc = new Y.Doc();

export const ySceneRoot = yDoc.getMap<unknown>("scene-root");

const initializeScene = () => {
  yDoc.transact(() => {
    if (ySceneRoot.has("id")) return;

    ySceneRoot.set("id", "root");
    ySceneRoot.set("type", "root");
    ySceneRoot.set("name", "City Root");
    ySceneRoot.set("x", 0);
    ySceneRoot.set("y", 0);

    const rootChildren = new Y.Array<Y.Map<unknown>>();
    ySceneRoot.set("children", rootChildren);

    const defaultLayer = new Y.Map<unknown>();
    rootChildren.push([defaultLayer]);

    defaultLayer.set("id", "layer-default");
    defaultLayer.set("type", "layer");
    defaultLayer.set("name", "Layer 1");
    defaultLayer.set("x", 0);
    defaultLayer.set("y", 0);
    defaultLayer.set("isVisible", true);
    defaultLayer.set("isLocked", false);

    const layerChildren = new Y.Array<Y.Map<unknown>>();
    defaultLayer.set("children", layerChildren);

    const defaultItem = new Y.Map<unknown>();
    layerChildren.push([defaultItem]);

    defaultItem.set("id", "item-main");
    defaultItem.set("type", "item");
    defaultItem.set("name", "Main Grid");
    defaultItem.set("x", 0);
    defaultItem.set("y", 0);
    defaultItem.set("isVisible", true);
    defaultItem.set("isLocked", false);
    defaultItem.set("content", new Y.Map<string>());
  });
};

initializeScene();

export const undoManager = new Y.UndoManager([ySceneRoot], {
  captureTimeout: 500,
  trackedOrigins: new Set([null]),
});

export const performTransaction = (fn: () => void) => {
  yDoc.transact(() => {
    fn();
  });
};

export const forceHistorySave = () => {
  undoManager.stopCapturing();
};

export const transactWithHistory = (
  fn: () => void,
  shouldSaveHistory = true
) => {
  performTransaction(fn);
  if (shouldSaveHistory) {
    forceHistorySave();
  }
};
```
---
```src/components/ToolBar/dock.tsx
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  MousePointer2,
  Square,
  Minus,
  Pencil,
  Eraser,
  PaintBucket,
  Undo2,
  Download,
  LineSquiggle,
  Circle as CircleIcon,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolType } from "@/types";
import { useCanvasStore } from "@/store/canvasStore";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
  onExport: () => void;
}

export function Toolbar({ tool, setTool, onUndo, onExport }: ToolbarProps) {
  const { brushChar, setBrushChar } = useCanvasStore();
  const [lastUsedShape, setLastUsedShape] = useState<ToolType>("box");
  const [openSubMenuId, setOpenSubMenuId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const materialPresets = ["*", ".", "@", "▒"];
  const [customChar, setCustomChar] = useState(() =>
    materialPresets.includes(brushChar) ? "" : brushChar
  );

  const shapeTools: ToolType[] = ["box", "circle", "line", "stepline"];
  const isShapeGroupActive = shapeTools.includes(tool);

  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const getToolMeta = (type: ToolType) => {
    switch (type) {
      case "box":
        return { icon: Square, label: "Rectangle", shortcut: "R" };
      case "circle":
        return { icon: CircleIcon, label: "Circle", shortcut: "O" };
      case "line":
        return { icon: Minus, label: "Line", shortcut: "L" };
      case "stepline":
        return { icon: LineSquiggle, label: "Curve", shortcut: "S" };
      default:
        return { icon: Square, label: "Shape", shortcut: "" };
    }
  };

  const activeShapeMeta = getToolMeta(
    isShapeGroupActive ? tool : lastUsedShape
  );

  const navItems = [
    {
      id: "select",
      label: "Select (V)",
      icon: MousePointer2,
      onClick: () => setTool("select"),
    },
    {
      id: "brush",
      label: `Brush (${brushChar})`,
      icon: Pencil,
      onClick: () => setTool("brush"),
      hasSub: true,
    },
    {
      id: "shape-group",
      label: activeShapeMeta.label,
      icon: activeShapeMeta.icon,
      onClick: () => setTool(isShapeGroupActive ? tool : lastUsedShape),
      hasSub: true,
    },
    {
      id: "fill",
      label: "Fill (G)",
      icon: PaintBucket,
      onClick: () => setTool("fill"),
    },
    {
      id: "eraser",
      label: "Eraser (E)",
      icon: Eraser,
      onClick: () => setTool("eraser"),
    },
    { id: "undo", label: "Undo", icon: Undo2, onClick: onUndo },
    { id: "export", label: "Export", icon: Download, onClick: onExport },
  ];

  const activeIndex = useMemo(() => {
    const currentId = isShapeGroupActive ? "shape-group" : tool;
    const idx = navItems.findIndex((item) => item.id === currentId);
    return idx !== -1 ? idx : 0;
  }, [tool, isShapeGroupActive]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = itemRefs.current[activeIndex];
      const container = activeEl?.closest("nav");
      if (activeEl && container) {
        const rect = activeEl.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        const width = 20;
        const left = rect.left - contRect.left + (rect.width - width) / 2;
        setIndicatorStyle({ width, left });
      }
    };
    updateIndicator();
    const timer = setTimeout(updateIndicator, 16);
    window.addEventListener("resize", updateIndicator);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      clearTimeout(timer);
    };
  }, [activeIndex]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <nav className="relative flex items-center gap-1 p-1.5 rounded-2xl bg-background/80 backdrop-blur-md border border-primary/10 shadow-2xl pointer-events-auto">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className={cn(
                  "relative flex items-center rounded-lg transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      onClick={item.onClick}
                      className={cn(
                        "flex items-center justify-center h-9 px-3 outline-none rounded-l-lg transition-colors",
                        !item.hasSub && "rounded-lg",
                        !isActive && "hover:bg-muted/50"
                      )}
                    >
                      <Icon className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>

                {item.hasSub && (
                  <Popover
                    open={openSubMenuId === item.id}
                    onOpenChange={(o) => setOpenSubMenuId(o ? item.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center justify-center h-9 px-1 border-l border-transparent hover:border-border/40 outline-none rounded-r-lg opacity-30 hover:opacity-100 transition-all",
                          openSubMenuId === item.id && "bg-muted/50 opacity-100"
                        )}
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      sideOffset={12}
                      className="w-auto p-1 flex flex-col gap-0.5 rounded-xl bg-popover/95 backdrop-blur-md border shadow-xl z-50 overflow-hidden min-w-[100px]"
                    >
                      {item.id === "brush" ? (
                        <>
                          <button
                            onClick={() => {
                              setBrushChar(customChar);
                              setTool("brush");
                              inputRef.current?.focus();
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 h-9 px-2 rounded-md transition-all outline-none shrink-0",
                              brushChar === customChar && customChar !== ""
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <div className="size-3.5 flex items-center justify-center shrink-0">
                              {brushChar === customChar &&
                                customChar !== "" && (
                                  <Check className="size-3.5 stroke-[3]" />
                                )}
                            </div>
                            <div className="flex-1 px-1">
                              <Input
                                ref={inputRef}
                                className="h-6 w-14 text-center p-0 font-mono text-base font-bold border-none shadow-none ring-0 focus-visible:ring-0 bg-muted/40 hover:bg-muted/60 rounded-sm text-inherit placeholder:text-muted-foreground/50 placeholder:text-[10px] placeholder:font-sans"
                                placeholder="Custom"
                                maxLength={2}
                                value={customChar}
                                onChange={(e) => {
                                  setCustomChar(e.target.value);
                                  setBrushChar(e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </button>
                          {materialPresets.map((char) => (
                            <button
                              key={char}
                              onClick={() => {
                                setBrushChar(char);
                                setTool("brush");
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 h-9 px-2 rounded-md transition-all outline-none shrink-0",
                                brushChar === char
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <div className="size-3.5 flex items-center justify-center shrink-0">
                                {brushChar === char && (
                                  <Check className="size-3.5 stroke-[3]" />
                                )}
                              </div>
                              <span className="flex-1 font-mono font-bold text-lg text-center leading-none">
                                {char}
                              </span>
                            </button>
                          ))}
                        </>
                      ) : (
                        shapeTools.map((st) => {
                          const meta = getToolMeta(st);
                          const isSubActive = tool === st;
                          return (
                            <button
                              key={st}
                              onClick={() => {
                                setTool(st);
                                setLastUsedShape(st);
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 h-9 px-2 rounded-md transition-all outline-none shrink-0",
                                isSubActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <div className="size-3.5 flex items-center justify-center shrink-0">
                                {isSubActive && (
                                  <Check className="size-3.5 stroke-[3]" />
                                )}
                              </div>
                              <meta.icon className="size-4 shrink-0" />
                              <span className="flex-1 text-left text-sm font-medium pr-4 whitespace-nowrap ml-1">
                                {meta.label}
                              </span>
                              <span className="text-[10px] opacity-40 font-mono">
                                {meta.shortcut}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}

          <div
            className="absolute bottom-1 left-0 bg-primary rounded-full transition-all duration-300 ease-out pointer-events-none"
            style={{
              width: `${indicatorStyle.width}px`,
              transform: `translateX(${indicatorStyle.left}px)`,
              height: "2px",
            }}
          />
        </nav>
      </div>
    </TooltipProvider>
  );
}
```
---
```src/components/ToolBar/node-status.tsx
import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusIconProps {
  active: boolean;
  className?: string;
}

export const VisibilityIcon = ({ active, className }: StatusIconProps) => {
  const Icon = active ? Eye : EyeOff;
  return <Icon className={cn("shrink-0", className)} />;
};

export const LockIcon = ({ active, className }: StatusIconProps) => {
  const Icon = active ? Lock : Unlock;
  return <Icon className={cn("shrink-0", className)} />;
};
```
---
```src/components/ToolBar/sidebar-left.tsx
"use client";

import * as React from "react";
import { Plus, MoreHorizontal, Settings2 } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarStandard,
} from "@/components/ui/sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { Logo } from "./left-sidebar/logo";
import { SceneTreeNode } from "./left-sidebar/sidebar-node";

export function SidebarLeft() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { sceneGraph, addNode } = useCanvasStore();

  const footer = (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Canvas Settings">
          <Settings2 className="size-4" />
          {!isCollapsed && <span>Settings</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="More options">
          <MoreHorizontal className="size-4" />
          {!isCollapsed && <span>Management</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );

  return (
    <SidebarStandard
      variant="floating"
      icon={<Logo className="h-8 w-8" />}
      title="ASCII Studio"
      footer={footer}
    >
      <ContextMenu>
        <ContextMenuTrigger className="flex-1 overflow-hidden h-full">
          <div className="flex flex-col gap-1">
            {!isCollapsed && (
              <div className="px-2 mb-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">
                  Scene Graph
                </span>
              </div>
            )}

            <div
              className={cn(
                "flex flex-col gap-0.5",
                isCollapsed && "items-center"
              )}
            >
              {sceneGraph ? (
                sceneGraph.children.map((child) => (
                  <SceneTreeNode
                    key={child.id}
                    node={child}
                    isSidebarCollapsed={isCollapsed}
                  />
                ))
              ) : (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  Loading...
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => addNode("root", "layer", "New Layer")}
          >
            <Plus className="mr-2 size-3.5" />
            New Layer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarStandard>
  );
}
```
---
```src/components/ToolBar/sidebar-right.tsx
"use client";

import * as React from "react";
import { Trash2, Share2, Settings2 } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarStandard,
} from "@/components/ui/sidebar";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasNode } from "@/types";
import { NodeProperties } from "./right-sidebar/node-properties";
import { EmptyState } from "./right-sidebar/empty-state";

const findNodeInTree = (node: CanvasNode, id: string): CanvasNode | null => {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }
  return null;
};

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof SidebarStandard>) {
  const { activeNodeId, sceneGraph, deleteNode } = useCanvasStore();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const activeNode = React.useMemo(() => {
    if (!activeNodeId || !sceneGraph) return null;
    return findNodeInTree(sceneGraph, activeNodeId);
  }, [activeNodeId, sceneGraph]);

  const footer = (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Delete Selected"
          disabled={!activeNode || activeNode.id === "root"}
          onClick={() => activeNode && deleteNode(activeNode.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          {!isCollapsed && <span>Delete Object</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Share Component" disabled={!activeNode}>
          <Share2 className="size-4" />
          {!isCollapsed && <span>Export Selection</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );

  return (
    <SidebarStandard
      variant="floating"
      side="right"
      title="Properties"
      className="pointer-events-auto"
      icon={
        <div className="flex items-center justify-center rounded-lg bg-accent p-1.5 shrink-0">
          <Settings2 className="size-4 text-accent-foreground" />
        </div>
      }
      footer={footer}
      {...props}
    >
      <div className="p-2 overflow-x-hidden">
        {activeNode ? (
          <NodeProperties node={activeNode} isCollapsed={isCollapsed} />
        ) : (
          <EmptyState />
        )}
      </div>
    </SidebarStandard>
  );
}
```
---
```src/components/ToolBar/left-sidebar/logo.tsx
import { Box } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-primary p-1 ${className}`}
    >
      <Box className="size-5 text-primary-foreground" />
    </div>
  );
}
```
---
```src/components/ToolBar/left-sidebar/sidebar-node.tsx
import * as React from "react";
import { Layers, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasNode } from "@/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VisibilityIcon, LockIcon } from "../node-status";

interface SceneTreeNodeProps {
  node: CanvasNode;
  depth?: number;
  isSidebarCollapsed?: boolean;
}

export const SceneTreeNode = ({
  node,
  depth = 0,
  isSidebarCollapsed,
}: SceneTreeNodeProps) => {
  const { activeNodeId, setActiveNode, addNode, deleteNode, updateNode } =
    useCanvasStore();

  const isActive = activeNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNode(node.id);
  };

  if (isSidebarCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center size-9 rounded-md cursor-pointer transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted/50",
              !node.isVisible && "opacity-50"
            )}
            onClick={handleSelect}
          >
            <Layers
              className={cn(
                "size-4",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{node.name}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const nodeContent = (
    <div
      className={cn(
        "flex w-full items-center gap-2 p-1.5 cursor-pointer rounded-md transition-all text-sm group select-none relative",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
        !node.isVisible && "opacity-50"
      )}
      onClick={handleSelect}
    >
      <div
        className="flex items-center gap-2 flex-1 min-w-0"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {hasChildren && (
          <div className="size-4 flex items-center justify-center">
            <ChevronRight
              className={cn(
                "size-3 transition-transform text-muted-foreground",
                "group-data-[state=open]:rotate-90"
              )}
            />
          </div>
        )}
        {!hasChildren && <div className="size-4" />}
        <Layers
          className={cn(
            "size-4",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span
          className={cn("truncate", isActive ? "font-semibold" : "font-normal")}
        >
          {node.name}
        </span>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 h-6 w-6 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            updateNode(node.id, { isVisible: !node.isVisible });
          }}
        >
          <VisibilityIcon active={node.isVisible} className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 h-6 w-6 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            updateNode(node.id, { isLocked: !node.isLocked });
          }}
        >
          <LockIcon active={node.isLocked} className="size-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger className="w-full">
        {hasChildren ? (
          <Collapsible defaultOpen className="w-full">
            <CollapsibleTrigger asChild>{nodeContent}</CollapsibleTrigger>
            <CollapsibleContent>
              {node.children.map((child) => (
                <SceneTreeNode key={child.id} node={child} depth={depth + 1} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          nodeContent
        )}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem
          className="gap-2"
          onClick={() => addNode(node.id, "layer", "New Layer")}
        >
          <Plus className="size-3.5" />
          <span>Add Layer</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={node.id === "root"}
          onClick={() => deleteNode(node.id)}
          className="gap-2"
        >
          <Trash2 className="size-3.5" />
          <span>Delete Layer</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
```
---
```src/components/ToolBar/right-sidebar/empty-state.tsx
export const EmptyState = () => {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-2 text-muted-foreground/60">
      <div className="p-3 border-2 border-dashed rounded-lg">
        <div className="size-8 rounded bg-muted/50" />
      </div>
      <p className="text-xs font-medium">Select an object</p>
    </div>
  );
};
```
---
```src/components/ToolBar/right-sidebar/node-properties.tsx
import { SidebarSeparator } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CanvasNode } from "@/types";
import { VisibilityIcon, LockIcon } from "../node-status";

interface NodePropertiesProps {
  node: CanvasNode;
  isCollapsed?: boolean;
}

export const NodeProperties = ({ node, isCollapsed }: NodePropertiesProps) => {
  const isRoot = node.type === "root";

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <div
          className="size-2 rounded-full bg-blue-500 animate-pulse"
          title="Object Selected"
        />
        <SidebarSeparator />
        <div className="flex flex-col gap-2">
          <LockIcon
            active={node.isLocked}
            className="size-4 text-muted-foreground"
          />
          <VisibilityIcon
            active={node.isVisible}
            className="size-4 text-muted-foreground"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold truncate max-w-35">
          {node.name}
        </span>
      </div>

      <SidebarSeparator className="mx-0" />

      <div className="grid gap-4">
        <div className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">
          Transform {isRoot && "(Fixed)"}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label
              htmlFor="pos-x"
              className="text-[10px] text-muted-foreground uppercase font-bold"
            >
              X
            </Label>
            <Input
              id="pos-x"
              value={node.x}
              disabled
              className="h-8 text-xs bg-muted/30"
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="pos-y"
              className="text-[10px] text-muted-foreground uppercase font-bold"
            >
              Y
            </Label>
            <Input
              id="pos-y"
              value={node.y}
              disabled
              className="h-8 text-xs bg-muted/30"
            />
          </div>
        </div>
      </div>

      <SidebarSeparator className="mx-0" />

      <div className="grid gap-4">
        <div className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">
          Hierarchy
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs items-center">
            <span className="text-muted-foreground">Type</span>
            <span className="capitalize font-medium px-2 py-0.5 bg-secondary rounded text-[10px]">
              {node.type}
            </span>
          </div>
          <div className="flex justify-between text-xs items-center">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-[10px] text-muted-foreground/60 truncate max-w-25">
              {node.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```
---
```src/components/AsciiCanvas/index.tsx
import { useRef, useMemo, useEffect } from "react";
import { useSize, useEventListener } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { GridManager } from "../../utils/grid";
import { toast } from "sonner";
import { isCtrlOrMeta } from "../../utils/event";

interface AsciiCanvasProps {
  onUndo: () => void;
  onRedo: () => void;
}

export const AsciiCanvas = ({ onUndo, onRedo }: AsciiCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposing = useRef(false);

  const size = useSize(containerRef);
  const store = useCanvasStore();
  const {
    textCursor,
    writeTextString,
    backspaceText,
    newlineText,
    moveTextCursor,
    setTextCursor,
    selections,
    deleteSelection,
    grid,
    erasePoints,
    copySelectionToClipboard,
    cutSelectionToClipboard,
  } = store;

  const { draggingSelection } = useCanvasInteraction(store, containerRef);
  useCanvasRenderer(canvasRef, size, store, draggingSelection);

  useEffect(() => {
    if (textCursor && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } else if (textareaRef.current) {
      textareaRef.current.blur();
    }
  }, [textCursor]);

  const handleCopy = (e: ClipboardEvent) => {
    if (selections.length > 0) {
      e.preventDefault();
      copySelectionToClipboard();
      return;
    }

    if (textCursor) {
      e.preventDefault();
      const key = GridManager.toKey(textCursor.x, textCursor.y);
      const char = grid.get(key) || " ";
      navigator.clipboard.writeText(char).then(() => {
        toast.success("Copied Char!", {
          description: `Character '${char}' copied.`,
        });
      });
    }
  };
  useEventListener("copy", handleCopy);

  const handleCut = (e: ClipboardEvent) => {
    if (selections.length > 0) {
      e.preventDefault();
      cutSelectionToClipboard();
      return;
    }

    if (textCursor) {
      e.preventDefault();
      const key = GridManager.toKey(textCursor.x, textCursor.y);
      const char = grid.get(key) || " ";
      navigator.clipboard.writeText(char).then(() => {
        erasePoints([textCursor]);
        toast.success("Cut Char!", {
          description: "Character moved to clipboard.",
        });
      });
    }
  };
  useEventListener("cut", handleCut);

  const handlePaste = (e: ClipboardEvent) => {
    if (isComposing.current) return;

    e.preventDefault();
    const text = e.clipboardData?.getData("text");
    if (!text) return;

    let pasteStartPos = textCursor;

    if (!pasteStartPos && selections.length > 0) {
      const firstSelection = selections[0];
      pasteStartPos = {
        x: Math.min(firstSelection.start.x, firstSelection.end.x),
        y: Math.min(firstSelection.start.y, firstSelection.end.y),
      };
    }

    if (pasteStartPos) {
      writeTextString(text, pasteStartPos);
      toast.success("Pasted!", {
        description: "Content inserted from clipboard.",
      });
    } else {
      toast.warning("Where to paste?", {
        description: "Please select an area or click to place cursor first.",
      });
    }
  };
  useEventListener("paste", handlePaste);

  const textareaStyle: React.CSSProperties = useMemo(() => {
    if (!textCursor || !size) return { display: "none" };

    const { x, y } = GridManager.gridToScreen(
      textCursor.x,
      textCursor.y,
      store.offset.x,
      store.offset.y,
      store.zoom
    );

    return {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: "1px",
      height: "1px",
      opacity: 0,
      pointerEvents: "none",
      zIndex: -1,
    };
  }, [textCursor, store.offset, store.zoom, size]);

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>
  ) => {
    isComposing.current = false;
    const value = e.data;
    if (value) {
      writeTextString(value);
      if (textareaRef.current) textareaRef.current.value = "";
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing.current) return;
    const textarea = e.currentTarget;
    const value = textarea.value;
    if (value) {
      writeTextString(value);
      textarea.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (isComposing.current) return;

    const isUndo =
      isCtrlOrMeta(e) && !e.shiftKey && e.key.toLowerCase() === "z";
    const isRedo =
      (isCtrlOrMeta(e) && e.shiftKey && e.key.toLowerCase() === "z") ||
      (isCtrlOrMeta(e) && e.key.toLowerCase() === "y");

    if (isUndo) {
      e.preventDefault();
      onUndo();
      return;
    }
    if (isRedo) {
      e.preventDefault();
      onRedo();
      return;
    }

    if (e.key === "Delete") {
      if (selections.length > 0) {
        e.preventDefault();
        deleteSelection();
        return;
      }
    }

    if (e.key === "Backspace") {
      if (selections.length > 0 && !textCursor) {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if (textCursor) {
        e.preventDefault();
        backspaceText();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      newlineText();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveTextCursor(0, -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveTextCursor(0, 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveTextCursor(-1, 0);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moveTextCursor(1, 0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTextCursor(null);
    }
  };

  useEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag !== "input" &&
        activeTag !== "textarea" &&
        selections.length > 0
      ) {
        e.preventDefault();
        deleteSelection();
      }
    }
  });

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className="w-full h-full overflow-hidden bg-gray-50 touch-none select-none cursor-default"
    >
      <canvas ref={canvasRef} />
      <textarea
        ref={textareaRef}
        style={textareaStyle}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
    </div>
  );
};
```
---
```src/components/AsciiCanvas/hooks/useCanvasInteraction.ts
import { useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { useCreation, useThrottleFn } from "ahooks";
import { GridManager } from "../../../utils/grid";
import {
  getBoxPoints,
  getLShapeLinePoints,
  getStepLinePoints,
  getCirclePoints,
} from "../../../utils/shapes";
import type { Point, SelectionArea } from "../../../types";
import { type CanvasState } from "../../../store/canvasStore";
import { forceHistorySave } from "../../../lib/yjs-setup";
import bresenham from "bresenham";
import { isCtrlOrMeta } from "../../../utils/event";

export const useCanvasInteraction = (
  store: CanvasState,
  containerRef: React.RefObject<HTMLDivElement | null>
) => {
  const {
    tool,
    brushChar,
    setOffset,
    setZoom,
    setScratchLayer,
    addScratchPoints,
    commitScratch,
    setTextCursor,
    addSelection,
    clearSelections,
    erasePoints,
    offset,
    zoom,
    grid,
  } = store;

  const dragStartGrid = useRef<Point | null>(null);
  const lastGrid = useRef<Point | null>(null);
  const isPanningRef = useRef(false);
  const lineAxisRef = useRef<"vertical" | "horizontal" | null>(null);
  const [draggingSelection, setDraggingSelection] =
    useState<SelectionArea | null>(null);

  const handleDrawing = useCreation(
    () => (currentGrid: Point) => {
      if (
        !lastGrid.current ||
        (currentGrid.x === lastGrid.current.x &&
          currentGrid.y === lastGrid.current.y)
      )
        return;

      const points = bresenham(
        lastGrid.current.x,
        lastGrid.current.y,
        currentGrid.x,
        currentGrid.y
      );

      if (tool === "brush") {
        addScratchPoints(points.map((p) => ({ ...p, char: brushChar })));
      } else if (tool === "eraser") {
        erasePoints(points);
      }
      lastGrid.current = currentGrid;
    },
    [tool, brushChar, addScratchPoints, erasePoints]
  );

  const { run: throttledDraw } = useThrottleFn(handleDrawing, {
    wait: 8,
    trailing: true,
  });

  const bind = useGesture(
    {
      onDragStart: ({ xy: [x, y], event }) => {
        const mouseEvent = event as MouseEvent;
        if (mouseEvent.button === 1 || isCtrlOrMeta(mouseEvent)) {
          isPanningRef.current = true;
          document.body.style.cursor = "grabbing";
          return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (mouseEvent.button === 0 && rect) {
          const raw = GridManager.screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );
          const start = GridManager.snapToCharStart(raw, grid);

          if (tool === "select") {
            if (!mouseEvent.shiftKey) clearSelections();
            setDraggingSelection({ start, end: start });
            dragStartGrid.current = start;
            setTextCursor(null);
            return;
          }

          clearSelections();
          setTextCursor(null);
          dragStartGrid.current = start;
          lastGrid.current = start;
          lineAxisRef.current = null;

          if (tool === "brush")
            addScratchPoints([{ ...start, char: brushChar }]);
          else if (tool === "eraser") erasePoints([start]);
        }
      },
      onDrag: ({ xy: [x, y], delta: [dx, dy] }) => {
        if (isPanningRef.current) {
          setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
          return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && dragStartGrid.current) {
          const raw = GridManager.screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );
          const currentGrid = GridManager.snapToCharStart(raw, grid);

          if (tool === "select") {
            setDraggingSelection({
              start: dragStartGrid.current,
              end: currentGrid,
            });
          } else if (tool === "brush" || tool === "eraser") {
            throttledDraw(currentGrid);
          } else if (tool === "box") {
            setScratchLayer(getBoxPoints(dragStartGrid.current, currentGrid));
          } else if (tool === "circle") {
            setScratchLayer(
              getCirclePoints(dragStartGrid.current, currentGrid)
            );
          } else if (tool === "line") {
            if (!lineAxisRef.current) {
              const adx = Math.abs(currentGrid.x - dragStartGrid.current.x);
              const ady = Math.abs(currentGrid.y - dragStartGrid.current.y);
              if (adx > 0 || ady > 0) {
                lineAxisRef.current = ady > adx ? "vertical" : "horizontal";
              }
            }
            setScratchLayer(
              getLShapeLinePoints(
                dragStartGrid.current,
                currentGrid,
                lineAxisRef.current === "vertical"
              )
            );
          } else if (tool === "stepline") {
            setScratchLayer(
              getStepLinePoints(dragStartGrid.current, currentGrid)
            );
          }
        }
      },
      onDragEnd: ({ event }) => {
        if (isPanningRef.current) {
          isPanningRef.current = false;
          document.body.style.cursor = "auto";
          return;
        }
        if ((event as MouseEvent).button === 0) {
          if (tool === "select" && draggingSelection) {
            if (
              draggingSelection.start.x === draggingSelection.end.x &&
              draggingSelection.start.y === draggingSelection.end.y
            ) {
              setTextCursor(draggingSelection.start);
            } else {
              addSelection(draggingSelection);
            }
            setDraggingSelection(null);
          } else if (
            tool === "brush" ||
            tool === "box" ||
            tool === "circle" ||
            tool === "line" ||
            tool === "stepline"
          ) {
            commitScratch();
          } else if (tool === "eraser") {
            forceHistorySave();
          }
          dragStartGrid.current = null;
          lastGrid.current = null;
          lineAxisRef.current = null;
        }
        document.body.style.cursor = "auto";
      },
      onWheel: ({ delta: [, dy], event }) => {
        if (isCtrlOrMeta(event)) {
          event.preventDefault();
          setZoom((p) => p * (1 - dy * 0.002));
        } else {
          setOffset((p) => ({
            x: p.x - (event as WheelEvent).deltaX,
            y: p.y - (event as WheelEvent).deltaY,
          }));
        }
      },
    },
    { target: containerRef, eventOptions: { passive: false } }
  );

  return { bind, draggingSelection };
};
```
---
```src/components/AsciiCanvas/hooks/useCanvasRenderer.ts
import { useEffect } from "react";
import {
  BACKGROUND_COLOR,
  CELL_HEIGHT,
  CELL_WIDTH,
  COLOR_ORIGIN_MARKER,
  COLOR_PRIMARY_TEXT,
  COLOR_SCRATCH_LAYER,
  COLOR_SELECTION_BG,
  COLOR_SELECTION_BORDER,
  COLOR_TEXT_CURSOR_BG,
  COLOR_TEXT_CURSOR_FG,
  FONT_SIZE,
  GRID_COLOR,
} from "../../../lib/constants";
import { type CanvasState } from "../../../store/canvasStore";
import { GridManager } from "../../../utils/grid";
import type { SelectionArea, GridMap } from "../../../types";
import { getSelectionBounds } from "../../../utils/selection";

export const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  size: { width: number; height: number } | undefined,
  store: CanvasState,
  draggingSelection: SelectionArea | null
) => {
  const { offset, zoom, grid, scratchLayer, textCursor, selections } = store;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !size || size.width === 0 || size.height === 0)
      return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, size.width, size.height);

    const sw = CELL_WIDTH * zoom;
    const sh = CELL_HEIGHT * zoom;

    const startX = Math.floor(-offset.x / sw);
    const endX = Math.ceil((size.width - offset.x) / sw);
    const startY = Math.floor(-offset.y / sh);
    const endY = Math.ceil((size.height - offset.y) / sh);

    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x++) {
      const posX = Math.round(x * sw + offset.x);
      ctx.moveTo(posX, 0);
      ctx.lineTo(posX, size.height);
    }

    for (let y = startY; y <= endY; y++) {
      const posY = Math.round(y * sh + offset.y);
      ctx.moveTo(0, posY);
      ctx.lineTo(size.width, posY);
    }
    ctx.stroke();

    ctx.font = `${FONT_SIZE * zoom}px 'Maple Mono NF CN', monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const renderLayer = (layer: GridMap, color: string) => {
      ctx.fillStyle = color;

      for (const [key, char] of layer.entries()) {
        if (!char || char === " ") continue;
        const { x, y } = GridManager.fromKey(key);

        if (x < startX || x > endX || y < startY || y > endY) continue;

        const pos = GridManager.gridToScreen(x, y, offset.x, offset.y, zoom);
        const wide = GridManager.isWideChar(char);

        const centerX = Math.round(pos.x + (wide ? sw : sw / 2));
        const centerY = Math.round(pos.y + sh / 2);

        ctx.fillText(char, centerX, centerY);
      }
    };

    renderLayer(grid, COLOR_PRIMARY_TEXT);
    if (scratchLayer) renderLayer(scratchLayer, COLOR_SCRATCH_LAYER);

    const drawSel = (area: SelectionArea) => {
      const { minX, minY, maxX, maxY } = getSelectionBounds(area);
      const pos = GridManager.gridToScreen(
        minX,
        minY,
        offset.x,
        offset.y,
        zoom
      );
      const w = (maxX - minX + 1) * sw;
      const h = (maxY - minY + 1) * sh;

      ctx.fillStyle = COLOR_SELECTION_BG;
      ctx.fillRect(
        Math.round(pos.x),
        Math.round(pos.y),
        Math.round(w),
        Math.round(h)
      );

      if (COLOR_SELECTION_BORDER !== "transparent") {
        ctx.strokeStyle = COLOR_SELECTION_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          Math.round(pos.x),
          Math.round(pos.y),
          Math.round(w),
          Math.round(h)
        );
      }
    };

    selections.forEach(drawSel);
    if (draggingSelection) drawSel(draggingSelection);

    if (textCursor) {
      const pos = GridManager.gridToScreen(
        textCursor.x,
        textCursor.y,
        offset.x,
        offset.y,
        zoom
      );
      const char = grid.get(GridManager.toKey(textCursor.x, textCursor.y));
      const wide = char ? GridManager.isWideChar(char) : false;
      const cursorWidth = wide ? sw * 2 : sw;

      ctx.fillStyle = COLOR_TEXT_CURSOR_BG;
      ctx.fillRect(
        Math.round(pos.x),
        Math.round(pos.y),
        Math.round(cursorWidth),
        Math.round(sh)
      );

      if (char) {
        ctx.fillStyle = COLOR_TEXT_CURSOR_FG;
        const centerX = Math.round(pos.x + (wide ? sw : sw / 2));
        ctx.fillText(char, centerX, Math.round(pos.y + sh / 2));
      }
    }

    ctx.fillStyle = COLOR_ORIGIN_MARKER;
    const originX = Math.round(offset.x);
    const originY = Math.round(offset.y);
    ctx.fillRect(originX - 1, originY - 10, 2, 20);
    ctx.fillRect(originX - 10, originY - 1, 20, 2);
  }, [
    offset,
    zoom,
    size,
    grid,
    scratchLayer,
    textCursor,
    selections,
    draggingSelection,
    canvasRef,
  ]);
};
```
