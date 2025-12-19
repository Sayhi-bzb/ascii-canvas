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
  updateScratchForShape: (
    tool: ToolType,
    start: Point,
    end: Point,
    options?: { axis?: "vertical" | "horizontal" | null }
  ) => void;
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

export type CanvasState = {
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
} & NodeSlice &
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
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, ySceneRoot } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import type { GridPoint } from "../../types";
import {
  getNearestValidContainer,
  findNodeById,
  createYCanvasNode,
  canMergeStrokeToNode,
  isNodeLocked,
} from "../../utils/scene";
import {
  getBoxPoints,
  getCirclePoints,
  getLShapeLinePoints,
  getStepLinePoints,
} from "../../utils/shapes";

export const createDrawingSlice: StateCreator<
  CanvasState,
  [],
  [],
  DrawingSlice
> = (set, get) => ({
  scratchLayer: null,

  setScratchLayer: (points) => {
    const layer = new Map<string, string>();
    GridManager.setPoints(layer, points);
    set({ scratchLayer: layer });
  },

  addScratchPoints: (points) => {
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      GridManager.setPoints(layer, points);
      return { scratchLayer: layer };
    });
  },

  updateScratchForShape: (tool, start, end, options) => {
    let points: GridPoint[] = [];
    switch (tool) {
      case "box":
        points = getBoxPoints(start, end);
        break;
      case "circle":
        points = getCirclePoints(start, end);
        break;
      case "stepline":
        points = getStepLinePoints(start, end);
        break;
      case "line": {
        const isVerticalFirst = options?.axis === "vertical";
        points = getLShapeLinePoints(start, end, isVerticalFirst);
        break;
      }
    }
    get().setScratchLayer(points);
  },

  commitScratch: () => {
    const { scratchLayer, activeNodeId, tool } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;

    const points: GridPoint[] = [];
    GridManager.iterate(scratchLayer, (char, x, y) =>
      points.push({ x, y, char })
    );
    if (points.length === 0) return;

    transactWithHistory(() => {
      let container = getNearestValidContainer(ySceneRoot, activeNodeId);

      if (container.get("type") === "root") {
        const rootChildren = container.get("children") as Y.Array<
          Y.Map<unknown>
        >;
        const autoLayer = createYCanvasNode(
          "layer",
          `Layer ${rootChildren.length + 1}`
        );
        rootChildren.push([autoLayer]);
        container = autoLayer;
      }

      const activeNode = activeNodeId
        ? findNodeById(ySceneRoot, activeNodeId)
        : null;
      const isPathTool =
        tool === "brush" || tool === "line" || tool === "stepline";
      const shouldMerge = isPathTool && canMergeStrokeToNode(activeNode);

      if (shouldMerge && activeNode) {
        const targetMap = activeNode.get("pathData") as Y.Map<string>;
        const nodeX = (activeNode.get("x") as number) || 0;
        const nodeY = (activeNode.get("y") as number) || 0;

        const localPoints = GridManager.toLocalPoints(points, nodeX, nodeY);
        GridManager.setPoints(targetMap, localPoints);
      } else {
        const { minX, minY, maxX, maxY } =
          GridManager.getGridBounds(scratchLayer);
        let newNode: Y.Map<unknown> | null = null;

        if (isPathTool) {
          const localPoints = GridManager.toLocalPoints(points, minX, minY);
          newNode = createYCanvasNode(
            "shape-path",
            tool === "brush" ? "Path" : "Line",
            { x: minX, y: minY, pathData: localPoints }
          );
        } else if (tool === "box" || tool === "circle") {
          newNode = createYCanvasNode(
            tool === "box" ? "shape-box" : "shape-circle",
            tool === "box" ? "Box" : "Circle",
            {
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
            }
          );
        }

        if (newNode) {
          let children = container.get("children") as Y.Array<Y.Map<unknown>>;
          if (!children) {
            children = new Y.Array<Y.Map<unknown>>();
            container.set("children", children);
          }
          children.push([newNode]);
          set({ activeNodeId: newNode.get("id") as string });
        }
      }
    });

    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),

  clearCanvas: () => {
    const { activeNodeId } = get();
    const node = activeNodeId ? findNodeById(ySceneRoot, activeNodeId) : null;

    if (node && !isNodeLocked(node)) {
      transactWithHistory(() => {
        const type = node.get("type") as string;
        if (type === "shape-path") {
          (node.get("pathData") as Y.Map<string>).clear();
        } else {
          const content = node.get("content") as Y.Map<string>;
          if (content) content.clear();
        }
      });
    }
  },

  erasePoints: (points) => {
    const { activeNodeId } = get();
    const node = activeNodeId ? findNodeById(ySceneRoot, activeNodeId) : null;

    if (canMergeStrokeToNode(node)) {
      transactWithHistory(() => {
        const pathData = node!.get("pathData") as Y.Map<string>;
        const nodeX = (node!.get("x") as number) || 0;
        const nodeY = (node!.get("y") as number) || 0;

        points.forEach((p) =>
          pathData.delete(GridManager.toKey(p.x - nodeX, p.y - nodeY))
        );
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

export const createSelectionSlice: StateCreator<
  CanvasState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selections: [],

  addSelection: (area) => {
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

export const createTextSlice: StateCreator<CanvasState, [], [], TextSlice> = (
  set,
  get
) => ({
  textCursor: null,

  setTextCursor: (pos) => {
    set({ textCursor: pos, selections: [] });
  },

  writeTextString: (str, startPos) => {
    const { textCursor, activeNodeId } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;

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
  char: z.string(),
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
  "item",
  "shape-box",
  "shape-line",
  "shape-path",
  "shape-text",
  "shape-circle",
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export type GridMap = Map<string, string>;

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
  content?: GridMap;
  pathData?: GridMap;
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
    content: z.instanceof(Map).optional() as z.ZodType<GridMap | undefined>,
    pathData: z.instanceof(Map).optional() as z.ZodType<GridMap | undefined>,
    props: z.record(z.string(), z.unknown()).optional(),
    children: z.array(CanvasNodeSchema),
  })
);

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
        if (GridManager.getCharWidth(char) === 2) x++;
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
import type { Point, GridMap, GridPoint } from "../types";

/**
 * 城市网格管理器
 * 负责地理坐标与地块编号之间的转换，以及批量的地政操作
 */
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

  /**
   * 智能迭代器：支持原生 Map 和 Y.Map
   * 自动处理坐标转换，让业务逻辑只关注 x, y 坐标
   */
  iterate<T>(
    container: { forEach: (cb: (value: T, key: string) => void) => void },
    callback: (value: T, x: number, y: number) => void
  ): void {
    container.forEach((value, key) => {
      const { x, y } = this.fromKey(key);
      callback(value, x, y);
    });
  },

  /**
   * 批量录入地块信息
   */
  setPoints(
    target: { set: (key: string, value: string) => void },
    points: GridPoint[]
  ): void {
    points.forEach((p) => {
      target.set(this.toKey(p.x, p.y), p.char);
    });
  },

  /**
   * 坐标系转换：将绝对坐标点转换为相对于原点(originX, originY)的局部坐标点
   * 解决了代码中随处可见的 x - nodeX 冗余计算
   */
  toLocalPoints(
    points: GridPoint[],
    originX: number,
    originY: number
  ): GridPoint[] {
    return points.map((p) => ({
      ...p,
      x: p.x - originX,
      y: p.y - originY,
    }));
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

    this.iterate(grid, (char, x, y) => {
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

/**
 * 城市基础建设初始化
 * 确保核心行政区（Root）和主功能区（item-main）拥有合法的建筑槽位（children）
 */
const initializeScene = () => {
  yDoc.transact(() => {
    if (ySceneRoot.has("id")) return;

    ySceneRoot.set("id", "root");
    ySceneRoot.set("type", "root");
    ySceneRoot.set("name", "City Root");
    ySceneRoot.set("x", 0);
    ySceneRoot.set("y", 0);
    ySceneRoot.set("isVisible", true);

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
    defaultLayer.set("content", new Y.Map<string>());

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

    const itemChildren = new Y.Array<Y.Map<unknown>>();
    defaultItem.set("children", itemChildren);
  });
};

initializeScene();

export const undoManager = new Y.UndoManager([ySceneRoot], {
  captureTimeout: 500,
  trackedOrigins: new Set([null]),
});

const performTransaction = (fn: () => void) => {
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
