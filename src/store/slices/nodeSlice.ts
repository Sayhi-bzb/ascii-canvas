import type { StateCreator } from "zustand";
import * as Y from "yjs";
import { toast } from "sonner";
import type { CanvasState, NodeSlice } from "../interfaces";
import { ySceneRoot, transactWithHistory } from "../../lib/yjs-setup";
import { findNodeById, findParentNodeById } from "../../utils/scene";

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

    // 逻辑修正：如果要添加到的父节点本身是 shape，则向上寻找真正的容器
    if (parent && (parent.get("type") as string).startsWith("shape-")) {
      const realParent = findParentNodeById(ySceneRoot, parentId);
      if (realParent) parent = realParent;
    }

    if (!parent) return;
    const children = parent.get("children") as Y.Array<Y.Map<unknown>>;

    transactWithHistory(() => {
      const newNode = new Y.Map<unknown>();
      const id = crypto.randomUUID();

      newNode.set("id", id);
      newNode.set("type", type);
      newNode.set("name", name);
      newNode.set("x", 0);
      newNode.set("y", 0);

      if (type.startsWith("shape-")) {
        newNode.set("width", 10);
        newNode.set("height", 5);
      }

      newNode.set("isVisible", true);
      newNode.set("isLocked", false);
      newNode.set("isCollapsed", false);

      if (type === "layer") {
        newNode.set("content", new Y.Map<string>());
      }

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
        toast.success("Node deleted");
      }
    });
  },
});
