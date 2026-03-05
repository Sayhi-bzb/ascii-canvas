import { undoManager } from "../../lib/yjs-setup";
import { isCtrlOrMeta } from "../../utils/event";

export const isUndoShortcut = (
  event: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "shiftKey" | "key">
) => {
  return isCtrlOrMeta(event) && !event.shiftKey && event.key.toLowerCase() === "z";
};

export const isRedoShortcut = (
  event: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "shiftKey" | "key">
) => {
  return (
    (isCtrlOrMeta(event) && event.shiftKey && event.key.toLowerCase() === "z") ||
    (isCtrlOrMeta(event) && event.key.toLowerCase() === "y")
  );
};

export const runUndo = () => {
  undoManager.undo();
};

export const runRedo = () => {
  undoManager.redo();
};
