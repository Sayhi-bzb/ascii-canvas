import * as Y from "yjs";
import { ySceneRoot } from "../lib/yjs-setup";
import { findNodeById } from "../utils/scene";

export const getActiveGridYMap = (
  currentActiveId: string | null
): Y.Map<string> | null => {
  if (!currentActiveId) return null;
  const node = findNodeById(ySceneRoot, currentActiveId);
  if (!node) return null;

  // 现在任何 Node 都拥有 content 属性，可以直接返回用于绘图
  const content = node.get("content");
  if (content instanceof Y.Map) {
    return content as Y.Map<string>;
  }
  return null;
};
