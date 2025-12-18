import { create } from "zustand";
import { toast } from "sonner";
import * as Y from "yjs";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { GridManager } from "../utils/grid";
import { composeScene, parseSceneGraph, findNodeById } from "../utils/scene";
import type {
  Point,
  GridPoint,
  ToolType,
  SelectionArea,
  GridMap,
  CanvasNode,
} from "../types";
import {
  ySceneRoot,
  performTransaction,
  forceHistorySave,
} from "../lib/yjs-setup";
import { getSelectionBounds } from "../utils/selection";
import { exportSelectionToString } from "../utils/export";

const getActiveGridYMap = (
  currentActiveId: string | null
): Y.Map<unknown> | null => {
  if (!currentActiveId) return null;
  const node = findNodeById(ySceneRoot, currentActiveId);
  if (!node || node.get("type") !== "item") return null;
  return node.get("content") as Y.Map<unknown>;
};

export interface CanvasState {
  offset: Point;
  zoom: number;
  tool: ToolType;
  brushChar: string;
  textCursor: Point | null;
  selections: SelectionArea[];
  scratchLayer: GridMap | null;
  grid: GridMap;
  sceneGraph: CanvasNode | null;
  activeNodeId: string | null;

  setOffset: (updater: (prev: Point) => Point) => void;
  setZoom: (updater: (prev: number) => number) => void;
  setTool: (tool: ToolType) => void;
  setBrushChar: (char: string) => void;
  setActiveNode: (id: string | null) => void;

  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  addNode: (parentId: string, type: CanvasNode["type"], name: string) => void;
  deleteNode: (id: string) => void;

  setScratchLayer: (points: GridPoint[]) => void;
  addScratchPoints: (points: GridPoint[]) => void;
  commitScratch: () => void;
  clearScratch: () => void;
  clearCanvas: () => void;
  setTextCursor: (pos: Point | null) => void;
  writeTextString: (str: string, startPos?: Point) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  deleteSelection: () => void;
  fillSelections: () => void;
  fillSelectionsWithChar: (char: string) => void;
  erasePoints: (points: Point[]) => void;
  copySelectionToClipboard: () => void;
  cutSelectionToClipboard: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => {
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
    scratchLayer: null,
    tool: "select",
    brushChar: "#",
    textCursor: null,
    selections: [],

    setOffset: (updater) => set((state) => ({ offset: updater(state.offset) })),
    setZoom: (updater) =>
      set((state) => ({
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
      })),
    setTool: (tool) => set({ tool, textCursor: null }),
    setBrushChar: (char) => set({ brushChar: char }),
    setActiveNode: (id) =>
      set({ activeNodeId: id, selections: [], textCursor: null }),

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
      const targetGrid = getActiveGridYMap(
        activeNodeId
      ) as Y.Map<string> | null;
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

    setTextCursor: (pos) => set({ textCursor: pos, selections: [] }),

    writeTextString: (str, startPos) => {
      const { textCursor, activeNodeId } = get();
      const targetGrid = getActiveGridYMap(
        activeNodeId
      ) as Y.Map<string> | null;
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
          const farLeftChar = grid.get(
            GridManager.toKey(newX - 2, textCursor.y)
          );
          newX -= farLeftChar && GridManager.isWideChar(farLeftChar) ? 2 : 1;
        } else {
          newX -= 1;
        }
      }
      set({ textCursor: { x: newX, y: newY } });
    },

    backspaceText: () => {
      const { textCursor, grid, activeNodeId } = get();
      const targetGrid = getActiveGridYMap(
        activeNodeId
      ) as Y.Map<string> | null;
      if (!textCursor || !targetGrid) return;
      const { x, y } = textCursor;
      let deletePos = { x: x - 1, y };
      const charAtMinus1 = grid.get(GridManager.toKey(x - 1, y));
      const charAtMinus2 = grid.get(GridManager.toKey(x - 2, y));
      if (
        !charAtMinus1 &&
        charAtMinus2 &&
        GridManager.isWideChar(charAtMinus2)
      ) {
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
    addSelection: (area) =>
      set((s) => ({ selections: [...s.selections, area] })),
    clearSelections: () => set({ selections: [] }),
    deleteSelection: () => {
      const { selections, activeNodeId } = get();
      const targetGrid = getActiveGridYMap(
        activeNodeId
      ) as Y.Map<string> | null;
      if (!targetGrid) return;
      performTransaction(() => {
        selections.forEach((area) => {
          const { minX, maxX, minY, maxY } = getSelectionBounds(area);
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const head = GridManager.snapToCharStart({ x, y }, get().grid);
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
      const targetGrid = getActiveGridYMap(
        activeNodeId
      ) as Y.Map<string> | null;
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
    erasePoints: (points) => {
      const { activeNodeId } = get();
      const targetGrid = getActiveGridYMap(
        activeNodeId
      ) as Y.Map<string> | null;
      if (!targetGrid) return;
      performTransaction(() => {
        points.forEach((p) => {
          const head = GridManager.snapToCharStart(p, get().grid);
          targetGrid.delete(GridManager.toKey(head.x, head.y));
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
  };
});
