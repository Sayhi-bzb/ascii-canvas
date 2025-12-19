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

/**
 * 法规：判断是否可以将新文本合并到现有节点
 * @param activeNode - 当前激活的 Y.Map 节点
 * @param cursor - 当前光标位置
 * @returns boolean
 */
const canMergeTextToNode = (
  activeNode: Y.Map<unknown> | null,
  cursor: Point | null
): boolean => {
  if (!activeNode || !cursor) return false;

  // 1. 节点类型必须是 shape-text
  const isTextNode = activeNode.get("type") === "shape-text";
  if (!isTextNode) return false;

  // 2. 节点不能被锁定
  if (isNodeLocked(activeNode)) return false;

  // 3. 光标必须在前一个字符的末尾
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

  // 如果最后一个字符是换行符，光标应该在下一行的开头
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

      // 使用新法规进行判断
      if (canMergeTextToNode(activeNode, cursor)) {
        // 逻辑分支 1: 合并到现有节点
        const currentText = (activeNode!.get("text") as string) || "";
        activeNode!.set("text", currentText + str);
      } else {
        // 逻辑分支 2: 创建新节点
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
          // 关键一步：将新节点设为激活状态，以便下次输入可以合并
          set({ activeNodeId: newNode.get("id") as string });
        }
      }
    });

    // --- 更新光标位置 ---
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
        finalCursorX = nodeX; // 换行时光标回到节点 X 坐标
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
        // 修复点 1：确保 farLeftChar 存在再调用 isWideChar
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
            // 换行符特殊处理
            if (deletedChar === "\n") {
              // 需要找到上一行的末尾，逻辑复杂，暂时只做 Y-1
              // TODO: 实现精确的光标回退
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

          // 修复点 1 (补充修复)：确保 charAtMinus2 存在再调用 isWideChar
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
    // 修复点 2：移除未使用的 activeNodeId
    const { textCursor } = get();
    if (!textCursor) return;
    get().writeTextString("\n");
  },
});
