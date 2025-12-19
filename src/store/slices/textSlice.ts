import type { StateCreator } from "zustand";
import * as Y from "yjs";
import type { CanvasState, TextSlice } from "../interfaces";
import { transactWithHistory, ySceneRoot } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import {
  createYCanvasNode,
  findNodeById,
  getNearestValidContainer,
  isNodeLocked,
} from "../../utils/scene";
import type { Point } from "../../types";

const canMergeTextToNode = (
  activeNode: Y.Map<unknown> | null,
  cursor: Point | null
): boolean => {
  if (!activeNode || !cursor) return false;

  const isTextNode = activeNode.get("type") === "shape-text";
  if (!isTextNode) return false;

  if (isNodeLocked(activeNode)) return false;

  const text = (activeNode.get("text") as string) || "";
  const nodeX = (activeNode.get("x") as number) || 0;
  const nodeY = (activeNode.get("y") as number) || 0;

  let endX = nodeX;
  let endY = nodeY;
  let lastChar = "";

  for (const char of text) {
    if (char === "\n") {
      endY++;
      endX = nodeX;
    } else {
      endX += GridManager.getCharWidth(char);
    }
    lastChar = char;
  }

  if (lastChar === "\n") {
    return cursor.x === nodeX && cursor.y === endY;
  }

  return cursor.x === endX && cursor.y === endY;
};

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

    const cursor = startPos
      ? { ...startPos }
      : textCursor
      ? { ...textCursor }
      : null;

    if (!cursor) return;

    transactWithHistory(() => {
      const activeNode = activeNodeId
        ? findNodeById(ySceneRoot, activeNodeId)
        : null;

      if (canMergeTextToNode(activeNode, cursor)) {
        const currentText = (activeNode!.get("text") as string) || "";
        activeNode!.set("text", currentText + str);
      } else {
        const container = getNearestValidContainer(ySceneRoot, activeNodeId);
        const containerChildren = container.get("children") as Y.Array<
          Y.Map<unknown>
        >;

        const newNode = createYCanvasNode("shape-text", "Text", {
          x: cursor.x,
          y: cursor.y,
          text: str,
        });

        if (containerChildren) {
          containerChildren.push([newNode]);
          set({ activeNodeId: newNode.get("id") as string });
        }
      }
    });

    const currentNode = get().activeNodeId
      ? findNodeById(ySceneRoot, get().activeNodeId)
      : null;
    const nodeX = currentNode
      ? (currentNode.get("x") as number) || 0
      : cursor.x;

    let finalCursorX = cursor.x;
    let finalCursorY = cursor.y;
    for (const char of str) {
      if (char === "\n") {
        finalCursorY++;
        finalCursorX = nodeX;
      } else {
        finalCursorX += GridManager.getCharWidth(char);
      }
    }

    set({ textCursor: { x: finalCursorX, y: finalCursorY } });
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
        if (farLeftChar && GridManager.isWideChar(farLeftChar)) {
          newX -= 2;
        } else {
          newX -= 1;
        }
      } else {
        newX -= 1;
      }
    }
    set({ textCursor: { x: newX, y: newY } });
  },

  backspaceText: () => {
    const { activeNodeId } = get();

    transactWithHistory(() => {
      const activeNode = activeNodeId
        ? findNodeById(ySceneRoot, activeNodeId)
        : null;

      if (activeNode && activeNode.get("type") === "shape-text") {
        const text = (activeNode.get("text") as string) || "";
        if (text.length > 0) {
          const deletedChar = text.slice(-1);
          const newText = text.slice(0, -1);
          activeNode.set("text", newText);

          const width = GridManager.getCharWidth(deletedChar);
          set((s) => {
            if (!s.textCursor) return {};
            if (deletedChar === "\n") {
              return { textCursor: { ...s.textCursor, y: s.textCursor.y - 1 } };
            }
            return {
              textCursor: { ...s.textCursor, x: s.textCursor.x - width },
            };
          });
        }
      } else {
        const { textCursor, grid } = get();
        const contentMap = activeNode?.get("content");
        const targetGrid = contentMap instanceof Y.Map ? contentMap : null;

        if (textCursor && targetGrid) {
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
          targetGrid.delete(GridManager.toKey(deletePos.x, deletePos.y));
          set({ textCursor: deletePos });
        }
      }
    });
  },

  newlineText: () => {
    const { textCursor } = get();
    if (!textCursor) return;
    get().writeTextString("\n");
  },
});
