import * as Y from "yjs";
import { ySceneRoot } from "../lib/yjs-setup";
import { findNodeById } from "../utils/scene";

export const getActiveGridYMap = (
  currentActiveId: string | null
): Y.Map<string> | null => {
  if (!currentActiveId) return null;
  const node = findNodeById(ySceneRoot, currentActiveId);
  if (!node) return null;

  const content = node.get("content");
  if (content instanceof Y.Map) {
    return content as Y.Map<string>;
  }
  return null;
};
