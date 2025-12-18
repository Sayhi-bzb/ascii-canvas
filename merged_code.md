```src/store/slices/drawingSlice.ts
import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { z } from "zod";
import { toast } from "sonner";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { performTransaction, forceHistorySave } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getActiveGridYMap } from "../utils";
import { GridPointSchema } from "../../types";

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
import { NodeTypeSchema } from "../../types";

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

  addNode: (parentId, rawType, name) => {
    const type = NodeTypeSchema.parse(rawType);

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
