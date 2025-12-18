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

    // 虽然 partial update 比较难用 schema 完全校验，
    // 但我们可以确保这里不会意外传入 illegal keys
    performTransaction(() => {
      Object.entries(updates).forEach(([key, value]) => {
        if (key === "children" || key === "content" || key === "id") return;
        node.set(key, value);
      });
    });
    forceHistorySave();
  },

  addNode: (parentId, rawType, name) => {
    // Zod 执法点：确保用地性质合法
    const type = NodeTypeSchema.parse(rawType);

    const parent = findNodeById(ySceneRoot, parentId);
    if (!parent) return;
    const children = parent.get("children") as Y.Array<Y.Map<unknown>>;

    performTransaction(() => {
      const newNode = new Y.Map<unknown>();
      const id = crypto.randomUUID();

      // 这里构建的数据结构隐式符合 CanvasNodeSchema
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
