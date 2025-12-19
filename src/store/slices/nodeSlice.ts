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
