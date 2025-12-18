```src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```
---
```src/hooks/use-mobile.ts
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
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

export const yGrid = yDoc.getMap<string>("grid");
export const ySceneRoot = yDoc.getMap<unknown>("scene-root");

export const initializeScene = () => {
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

export const getActiveGridYMap = (
  currentActiveId: string | null
): Y.Map<unknown> | null => {
  if (!currentActiveId) return null;
  const node = findNodeById(ySceneRoot, currentActiveId);
  if (!node || node.get("type") !== "item") return null;
  return node.get("content") as Y.Map<unknown>;
};
```
---
```src/store/slices/drawingSlice.ts
import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { toast } from "sonner";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { performTransaction, forceHistorySave } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getActiveGridYMap } from "../utils";

export const createDrawingSlice: StateCreator<
  CanvasState,
  [],
  [],
  DrawingSlice
> = (set, get) => ({
  scratchLayer: null,

  setScratchLayer: (points) => {
    const layer = new Map<string, string>();
    points.forEach((p) => layer.set(GridManager.toKey(p.x, p.y), p.char));
    set({ scratchLayer: layer });
  },

  addScratchPoints: (points) => {
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      points.forEach((p) => layer.set(GridManager.toKey(p.x, p.y), p.char));
      return { scratchLayer: layer };
    });
  },

  commitScratch: () => {
    const { scratchLayer, activeNodeId } = get();
    if (!scratchLayer) return;
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;

    if (!targetGrid) {
      toast.error("Invalid layer", {
        description: "Please select an Item to draw.",
      });
      return;
    }
    performTransaction(() => {
      scratchLayer.forEach((value, key) => {
        const { x, y } = GridManager.fromKey(key);
        const leftChar = targetGrid.get(GridManager.toKey(x - 1, y));
        if (leftChar && GridManager.isWideChar(leftChar))
          targetGrid.delete(GridManager.toKey(x - 1, y));
        if (value === " ") {
          targetGrid.delete(key);
        } else {
          targetGrid.set(key, value);
          if (GridManager.isWideChar(value))
            targetGrid.delete(GridManager.toKey(x + 1, y));
        }
      });
    });
    forceHistorySave();
    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),

  clearCanvas: () => {
    const targetGrid = getActiveGridYMap(
      get().activeNodeId
    ) as Y.Map<string> | null;
    if (targetGrid) {
      performTransaction(() => targetGrid.clear());
      forceHistorySave();
    }
  },

  erasePoints: (points) => {
    const { activeNodeId, grid } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;
    performTransaction(() => {
      points.forEach((p) => {
        const head = GridManager.snapToCharStart(p, grid);
        targetGrid.delete(GridManager.toKey(head.x, head.y));
      });
    });
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
import {
  ySceneRoot,
  performTransaction,
  forceHistorySave,
} from "../../lib/yjs-setup";
import { findNodeById } from "../../utils/scene";

export const createNodeSlice: StateCreator<CanvasState, [], [], NodeSlice> = (
  set
) => ({
  updateNode: (id, updates) => {
    const node = findNodeById(ySceneRoot, id);
    if (!node) return;
    performTransaction(() => {
      Object.entries(updates).forEach(([key, value]) => {
        if (key === "children" || key === "content" || key === "id") return;
        node.set(key, value);
      });
    });
    forceHistorySave();
  },

  addNode: (parentId, type, name) => {
    const parent = findNodeById(ySceneRoot, parentId);
    if (!parent) return;
    const children = parent.get("children") as Y.Array<Y.Map<unknown>>;

    performTransaction(() => {
      const newNode = new Y.Map<unknown>();
      const id = crypto.randomUUID();
      newNode.set("id", id);
      newNode.set("type", type);
      newNode.set("name", name);
      newNode.set("x", 0);
      newNode.set("y", 0);
      newNode.set("isVisible", true);
      newNode.set("isLocked", false);
      newNode.set("isCollapsed", false);

      if (type === "item") {
        newNode.set("content", new Y.Map<string>());
      } else {
        newNode.set("children", new Y.Array<Y.Map<unknown>>());
      }

      children.push([newNode]);
      set({ activeNodeId: id });
    });
    forceHistorySave();
  },

  deleteNode: (id) => {
    if (id === "root") return;

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

    performTransaction(() => {
      if (findAndRemove(ySceneRoot)) {
        set({ activeNodeId: "item-main" });
        toast.success("Node deleted");
      }
    });
    forceHistorySave();
  },
});
```
---
```src/store/slices/selectionSlice.ts
import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { toast } from "sonner";
import type { CanvasState, SelectionSlice } from "../interfaces";
import { performTransaction, forceHistorySave } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getSelectionBounds } from "../../utils/selection";
import { exportSelectionToString } from "../../utils/export";
import { getActiveGridYMap } from "../utils";

export const createSelectionSlice: StateCreator<
  CanvasState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selections: [],

  addSelection: (area) => set((s) => ({ selections: [...s.selections, area] })),

  clearSelections: () => set({ selections: [] }),

  deleteSelection: () => {
    const { selections, activeNodeId, grid } = get();
    const targetGrid = getActiveGridYMap(activeNodeId) as Y.Map<string> | null;
    if (!targetGrid) return;

    performTransaction(() => {
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
    forceHistorySave();
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
    performTransaction(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x += charWidth) {
            if (x > maxX) break;
            targetGrid.set(GridManager.toKey(x, y), char);
            if (charWidth === 2 && x + 1 <= maxX)
              targetGrid.delete(GridManager.toKey(x + 1, y));
          }
        }
      });
    });
    forceHistorySave();
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
import { performTransaction, forceHistorySave } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getActiveGridYMap } from "../utils";

export const createTextSlice: StateCreator<CanvasState, [], [], TextSlice> = (
  set,
  get
) => ({
  textCursor: null,

  setTextCursor: (pos) => set({ textCursor: pos, selections: [] }),

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
    performTransaction(() => {
      for (const char of str) {
        if (char === "\n") {
          cursor.y += 1;
          cursor.x = startX;
          continue;
        }
        const { x, y } = cursor;
        const leftChar = targetGrid.get(GridManager.toKey(x - 1, y));
        if (leftChar && GridManager.isWideChar(leftChar))
          targetGrid.delete(GridManager.toKey(x - 1, y));

        const charWidth = GridManager.getCharWidth(char);
        targetGrid.set(GridManager.toKey(x, y), char);
        if (charWidth === 2) {
          targetGrid.delete(GridManager.toKey(x + 1, y));
          cursor.x += 2;
        } else {
          cursor.x += 1;
        }
      }
    });
    if (str.length > 1) forceHistorySave();
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
    performTransaction(() => {
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

export const NodeTypeSchema = z.enum(["root", "layer", "group", "item"]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  x: number;
  y: number;
  isVisible: boolean;
  isLocked: boolean;
  isCollapsed: boolean;
  children: CanvasNode[];
  content?: Record<string, string>;
}

export const CanvasNodeSchema: z.ZodType<CanvasNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: NodeTypeSchema,
    name: z.string().min(1).max(50),
    parentId: z.string().nullable(),
    x: z.number().default(0),
    y: z.number().default(0),
    isVisible: z.boolean().default(true),
    isLocked: z.boolean().default(false),
    isCollapsed: z.boolean().default(false),
    children: z.array(CanvasNodeSchema),
    content: z.record(z.string(), z.string()).optional(),
  })
);

export type GridMap = Map<string, string>;
export type ToolType = "select" | "fill" | "brush" | "eraser" | "box" | "line";
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
};
```
---
```src/utils/scene.ts
import * as Y from "yjs";
import { GridManager } from "./grid";
import type { CanvasNode, GridMap, NodeType } from "../types";

export const composeScene = (
  node: Y.Map<unknown>,
  globalOffsetX: number = 0,
  globalOffsetY: number = 0,
  resultGrid: GridMap
) => {
  const type = node.get("type") as NodeType;
  const isVisible = node.get("isVisible") as boolean;

  if (isVisible === false) return;

  const localX = (node.get("x") as number) || 0;
  const localY = (node.get("y") as number) || 0;
  const currentGlobalX = globalOffsetX + localX;
  const currentGlobalY = globalOffsetY + localY;

  if (type === "item") {
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
  }

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
  const type = node.get("type") as NodeType;
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
import bresenham from "bresenham";
import { BOX_CHARS } from "../lib/constants";
import type { Point, GridPoint } from "../types";

function getLinePoints(start: Point, end: Point): Point[] {
  const points = bresenham(start.x, start.y, end.x, end.y);
  return points.map(({ x, y }) => ({ x, y }));
}

export function getOrthogonalLinePoints(
  start: Point,
  end: Point,
  isVerticalFirst: boolean
): GridPoint[] {
  const points: GridPoint[] = [];

  if (start.x === end.x) {
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: BOX_CHARS.VERTICAL,
    }));
  }
  if (start.y === end.y) {
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: BOX_CHARS.HORIZONTAL,
    }));
  }

  const junction: Point = isVerticalFirst
    ? { x: start.x, y: end.y }
    : { x: end.x, y: start.y };

  const segment1 = getLinePoints(start, junction);
  segment1.pop();
  points.push(
    ...segment1.map((p) => ({
      ...p,
      char: isVerticalFirst ? BOX_CHARS.VERTICAL : BOX_CHARS.HORIZONTAL,
    }))
  );

  const segment2 = getLinePoints(junction, end);
  segment2.shift();
  points.push(
    ...segment2.map((p) => ({
      ...p,
      char: isVerticalFirst ? BOX_CHARS.HORIZONTAL : BOX_CHARS.VERTICAL,
    }))
  );

  let cornerChar = "";
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (isVerticalFirst) {
    if (dy > 0) {
      cornerChar = dx > 0 ? BOX_CHARS.BOTTOM_LEFT : BOX_CHARS.BOTTOM_RIGHT;
    } else {
      cornerChar = dx > 0 ? BOX_CHARS.TOP_LEFT : BOX_CHARS.TOP_RIGHT;
    }
  } else {
    if (dx > 0) {
      cornerChar = dy > 0 ? BOX_CHARS.TOP_RIGHT : BOX_CHARS.BOTTOM_RIGHT;
    } else {
      cornerChar = dy > 0 ? BOX_CHARS.TOP_LEFT : BOX_CHARS.BOTTOM_LEFT;
    }
  }

  points.push({ ...junction, char: cornerChar });
  return points;
}

export function getBoxPoints(start: Point, end: Point): GridPoint[] {
  const points: GridPoint[] = [];

  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);

  if (left === right || top === bottom) {
    if (left === right && top === bottom)
      return [{ ...start, char: BOX_CHARS.CROSS }];
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: left === right ? BOX_CHARS.VERTICAL : BOX_CHARS.HORIZONTAL,
    }));
  }

  points.push({ x: left, y: top, char: BOX_CHARS.TOP_LEFT });
  points.push({ x: right, y: top, char: BOX_CHARS.TOP_RIGHT });
  points.push({ x: left, y: bottom, char: BOX_CHARS.BOTTOM_LEFT });
  points.push({ x: right, y: bottom, char: BOX_CHARS.BOTTOM_RIGHT });

  for (let x = left + 1; x < right; x++) {
    points.push({ x, y: top, char: BOX_CHARS.HORIZONTAL });
    points.push({ x, y: bottom, char: BOX_CHARS.HORIZONTAL });
  }

  for (let y = top + 1; y < bottom; y++) {
    points.push({ x: left, y, char: BOX_CHARS.VERTICAL });
    points.push({ x: right, y, char: BOX_CHARS.VERTICAL });
  }

  return points;
}
```
---
```src/app.tsx
import { useState } from "react";
import { toast } from "sonner";
import { useKeyPress } from "ahooks";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/ToolBar/dock";
import { undoManager } from "./lib/yjs-setup";
import { isCtrlOrMeta } from "./utils/event";

import { SidebarLeft } from "./components/ToolBar/sidebar-left";
import { SidebarRight } from "./components/ToolBar/sidebar-right";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";

function App() {
  const {
    tool,
    grid,
    setTool,
    fillSelectionsWithChar,
    copySelectionToClipboard,
    cutSelectionToClipboard,
  } = useCanvasStore();

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const handleUndo = () => {
    undoManager.undo();
    toast.dismiss();
  };

  const handleRedo = () => {
    undoManager.redo();
  };

  useKeyPress(["meta.z", "ctrl.z"], (e) => {
    e.preventDefault();
    handleUndo();
  });

  useKeyPress(["meta.shift.z", "ctrl.shift.z", "meta.y", "ctrl.y"], (e) => {
    e.preventDefault();
    handleRedo();
  });

  useKeyPress(["meta.c", "ctrl.c"], (e) => {
    e.preventDefault();
    copySelectionToClipboard();
  });

  useKeyPress(["meta.x", "ctrl.x"], (e) => {
    e.preventDefault();
    cutSelectionToClipboard();
  });

  useKeyPress(
    (event) => !isCtrlOrMeta(event) && !event.altKey && event.key.length === 1,
    (event) => {
      const { selections, textCursor } = useCanvasStore.getState();
      if (selections.length > 0 && !textCursor) {
        event.preventDefault();
        fillSelectionsWithChar(event.key);
      }
    },
    {
      events: ["keydown"],
    }
  );

  const handleExport = () => {
    const text = exportToString(grid);
    if (!text) {
      toast.warning("Canvas is empty!", {
        description: "Draw something before exporting.",
      });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!", {
        description: `${text.length} characters ready to paste.`,
      });
    });
  };

  return (
    <SidebarProvider className="flex h-full w-full overflow-hidden">
      <SidebarLeft />

      <SidebarInset className="relative flex flex-1 flex-col overflow-hidden">
        <AppLayout
          canvas={<AsciiCanvas onUndo={handleUndo} onRedo={handleRedo} />}
        >
          <Toolbar
            tool={tool}
            setTool={setTool}
            onUndo={handleUndo}
            onExport={handleExport}
          />
        </AppLayout>

        {/* 右侧侧边栏独立行政区 */}
        <div className="absolute top-0 right-0 h-full pointer-events-none z-50">
          <SidebarProvider
            open={isRightPanelOpen}
            onOpenChange={setIsRightPanelOpen}
            className="h-full items-end"
          >
            <SidebarRight />
          </SidebarProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
```
---
```src/index.css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

html,
body,
#root {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: "Maple Mono NF CN";
    font-weight: normal;
  }
}

[data-slot="sidebar-gap"] {
  width: 0 !important;
}

[data-slot="sidebar-container"] {
  position: absolute !important;
  height: 100% !important;
}
```
---
```src/layout.tsx
import React from "react";
import { Toaster } from "./components/ui/sonner";

interface AppLayoutProps {
  canvas: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout = ({ canvas, children }: AppLayoutProps) => {
  return (
    <div className="w-full h-full flex flex-col bg-gray-50 relative overflow-hidden">
      <main className="flex-1 relative z-0">{canvas}</main>
      <Toaster />
      {children}
    </div>
  );
};
```
---
```src/components/ToolBar/dock.tsx
"use client";

import {
  MousePointer2,
  Square,
  Minus,
  Pencil,
  Eraser,
  PaintBucket,
  Undo2,
  Download,
} from "lucide-react";
import { MenuDock, type MenuDockItem } from "@/components/ui/menu-dock";
import { cn } from "@/lib/utils";
import type { ToolType } from "@/types";

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
  onExport: () => void;
}

export function Toolbar({ tool, setTool, onUndo, onExport }: ToolbarProps) {
  const menuItems: MenuDockItem[] = [
    {
      id: "select",
      label: "Select",
      icon: MousePointer2,
      onClick: () => setTool("select"),
    },
    {
      id: "brush",
      label: "Brush",
      icon: Pencil,
      onClick: () => setTool("brush"),
    },
    {
      id: "box",
      label: "Rectangle",
      icon: Square,
      onClick: () => setTool("box"),
    },
    {
      id: "line",
      label: "Line",
      icon: Minus,
      onClick: () => setTool("line"),
    },
    {
      id: "fill",
      label: "Fill",
      icon: PaintBucket,
      onClick: () => setTool("fill"),
    },
    {
      id: "eraser",
      label: "Eraser",
      icon: Eraser,
      onClick: () => setTool("eraser"),
    },
    {
      id: "undo",
      label: "Undo",
      icon: Undo2,
      onClick: onUndo,
    },
    {
      id: "export",
      label: "Export",
      icon: Download,
      onClick: onExport,
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        <MenuDock
          items={menuItems}
          variant="default"
          showLabels={false}
          activeId={tool}
          className={cn(
            "shadow-2xl border-primary/10 bg-background/80 backdrop-blur-md",
            "rounded-2xl"
          )}
        />
      </div>
    </div>
  );
}
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
            onClick={() => addNode("root", "layer", "New Top Layer")}
          >
            <Plus className="mr-2 size-3.5" />
            New Top Layer
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
import {
  Layers,
  ChevronRight,
  Box,
  FileText,
  Folder,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
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

  const getIcon = () => {
    switch (node.type) {
      case "layer":
        return <Layers className="size-4 text-blue-500" />;
      case "group":
        return <Folder className="size-4 text-yellow-500" />;
      case "item":
        return <FileText className="size-4 text-gray-500" />;
      default:
        return <Box className="size-4" />;
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNode(node.id);
  };

  const hasChildren = node.children && node.children.length > 0;

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
            {getIcon()}
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
        {getIcon()}
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
          {node.isVisible ? (
            <Eye className="size-3" />
          ) : (
            <EyeOff className="size-3" />
          )}
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
          {node.isLocked ? (
            <Lock className="size-3" />
          ) : (
            <Unlock className="size-3" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>
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
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <Plus className="size-3.5" />
            <span>Add Child</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              onClick={() => addNode(node.id, "layer", "New Layer")}
            >
              Layer
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => addNode(node.id, "group", "New Group")}
            >
              Group
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => addNode(node.id, "item", "New Canvas")}
            >
              Canvas Item
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={node.id === "root"}
          onClick={() => deleteNode(node.id)}
          className="gap-2"
        >
          <Trash2 className="size-3.5" />
          <span>Delete Node</span>
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
import { Lock, Eye, EyeOff, Unlock } from "lucide-react";
import { SidebarSeparator } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CanvasNode } from "@/types";

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
          {node.isLocked ? (
            <Lock className="size-4 text-muted-foreground" />
          ) : (
            <Unlock className="size-4 text-muted-foreground" />
          )}
          {node.isVisible ? (
            <Eye className="size-4 text-muted-foreground" />
          ) : (
            <EyeOff className="size-4 text-muted-foreground" />
          )}
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
```src/components/ui/menu-dock.tsx
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Home, Briefcase, Calendar, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type IconComponentType = React.ElementType<{ className?: string }>;

export interface MenuDockItem {
  label: string;
  icon: IconComponentType;
  onClick?: () => void;
  id?: string;
}

export interface MenuDockProps {
  items?: MenuDockItem[];
  className?: string;
  variant?: "default" | "compact" | "large";
  orientation?: "horizontal" | "vertical";
  showLabels?: boolean;
  animated?: boolean;
  activeId?: string;
}

const defaultItems: MenuDockItem[] = [
  { label: "home", icon: Home },
  { label: "work", icon: Briefcase },
  { label: "calendar", icon: Calendar },
  { label: "security", icon: Shield },
  { label: "settings", icon: Settings },
];

export const MenuDock: React.FC<MenuDockProps> = ({
  items,
  className,
  variant = "default",
  orientation = "horizontal",
  showLabels = true,
  activeId,
}) => {
  const finalItems = useMemo(() => {
    const isValid =
      items && Array.isArray(items) && items.length >= 2 && items.length <= 8;
    return isValid ? items : defaultItems;
  }, [items]);

  const [internalActiveIndex, setInternalActiveIndex] = useState(0);

  const activeIndex = useMemo(() => {
    if (activeId !== undefined) {
      const index = finalItems.findIndex(
        (item) => (item.id || item.label) === activeId
      );
      return index !== -1 ? index : 0;
    }
    return internalActiveIndex;
  }, [activeId, finalItems, internalActiveIndex]);

  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    left: 0,
    top: 0,
    height: 0,
  });

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeButton = itemRefs.current[activeIndex];
      const container = activeButton?.parentElement;

      if (activeButton && container) {
        const btnRect = activeButton.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (orientation === "horizontal") {
          const width = showLabels ? btnRect.width * 0.6 : 24;
          const left =
            btnRect.left - containerRect.left + (btnRect.width - width) / 2;

          setIndicatorStyle({
            width,
            left,
            top: 0,
            height: 2,
          });
        } else {
          const height = 24;
          const top =
            btnRect.top - containerRect.top + (btnRect.height - height) / 2;
          setIndicatorStyle({
            width: 4,
            left: 4,
            top,
            height,
          });
        }
      }
    };

    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      clearTimeout(timer);
    };
  }, [activeIndex, finalItems, showLabels, orientation]);

  const getVariantStyles = () => {
    switch (variant) {
      case "compact":
        return {
          container: "p-1",
          item: "p-2 min-w-10",
          icon: "h-4 w-4",
          text: "text-xs",
        };
      case "large":
        return {
          container: "p-3",
          item: "p-3 min-w-16",
          icon: "h-6 w-6",
          text: "text-base",
        };
      default:
        return {
          container: "p-2",
          item: "p-2 min-w-14",
          icon: "h-5 w-5",
          text: "text-sm",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <TooltipProvider delayDuration={200}>
      <nav
        className={cn(
          "relative inline-flex items-center rounded-xl bg-card border shadow-sm transition-all duration-300",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          styles.container,
          className
        )}
        role="navigation"
      >
        {finalItems.map((item, index) => {
          const isActive = index === activeIndex;
          const IconComponent = item.icon;

          return (
            <Tooltip key={`${item.label}-${index}`}>
              <TooltipTrigger asChild>
                <button
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg transition-all duration-200",
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    styles.item,
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    setInternalActiveIndex(index);
                    item.onClick?.();
                  }}
                  aria-label={item.label}
                  type="button"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center",
                      orientation === "horizontal" && showLabels ? "mb-1" : ""
                    )}
                  >
                    <IconComponent className={cn(styles.icon)} />
                  </div>

                  {showLabels && (
                    <span
                      className={cn(
                        "font-medium capitalize whitespace-nowrap",
                        styles.text
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side={orientation === "horizontal" ? "top" : "right"}
                className="capitalize"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* 统一的物理定位下划线/指示器 */}
        <div
          className={cn(
            "absolute bg-primary rounded-full transition-all duration-300 ease-out pointer-events-none",
            orientation === "horizontal" ? "bottom-1" : "left-1"
          )}
          style={{
            width: `${indicatorStyle.width}px`,
            height: `${indicatorStyle.height}px`,
            left:
              orientation === "horizontal"
                ? `${indicatorStyle.left}px`
                : undefined,
            top:
              orientation === "vertical"
                ? `${indicatorStyle.top}px`
                : undefined,
          }}
        />
      </nav>
    </TooltipProvider>
  );
};
```
