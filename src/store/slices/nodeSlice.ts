import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { toast } from "sonner";
import type { CanvasState, NodeSlice } from "../interfaces";
import { ySceneRoot, transactWithHistory } from "../../lib/yjs-setup";
import { findNodeById } from "../../utils/scene";

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

  addNode: (parentId, _type, name) => {
    const parent = findNodeById(ySceneRoot, parentId);
    if (!parent) return;
    const children = parent.get("children") as Y.Array<Y.Map<unknown>>;

    transactWithHistory(() => {
      const newNode = new Y.Map<unknown>();
      const id = crypto.randomUUID();

      newNode.set("id", id);
      newNode.set("type", "layer");
      newNode.set("name", name);
      newNode.set("x", 0);
      newNode.set("y", 0);
      newNode.set("isVisible", true);
      newNode.set("isLocked", false);
      newNode.set("isCollapsed", false);

      // 每一个 Layer 既是容器也是画布
      newNode.set("content", new Y.Map<string>());
      newNode.set("children", new Y.Array<Y.Map<unknown>>());

      children.push([newNode]);
      set({ activeNodeId: id });
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
        toast.success("Layer deleted");
      }
    });
  },
});
