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
