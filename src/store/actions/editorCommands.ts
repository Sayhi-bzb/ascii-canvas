import { useCanvasStore } from "../canvasStore";
import { shouldIgnoreClipboardShortcut } from "../../utils/dom-focus";
import { isRedoShortcut, isUndoShortcut, runRedo, runUndo } from "./shortcutActions";

type EditorCommand =
  | "undo"
  | "redo"
  | "copy"
  | "copy-rich"
  | "cut"
  | "paste"
  | "fill-selection-char";

type CommandSource =
  | "global-hotkey"
  | "canvas-keydown"
  | "clipboard-event"
  | "context-menu";

type RunEditorCommandOptions = {
  source?: CommandSource;
  managedTextarea?: HTMLTextAreaElement | null;
  clipboardEvent?: ClipboardEvent;
  fillChar?: string;
  onUndo?: () => void;
  onRedo?: () => void;
};

const shouldIgnoreByFocus = (
  source: CommandSource,
  managedTextarea?: HTMLTextAreaElement | null
) => {
  if (source === "context-menu" || source === "canvas-keydown") return false;
  return shouldIgnoreClipboardShortcut(document.activeElement, managedTextarea);
};

export const canRunManagedClipboardCommand = (
  managedTextarea?: HTMLTextAreaElement | null
) => {
  return !shouldIgnoreClipboardShortcut(document.activeElement, managedTextarea);
};

export const resolveHistoryShortcutCommand = (
  event: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "shiftKey" | "key">
): "undo" | "redo" | null => {
  if (isUndoShortcut(event)) return "undo";
  if (isRedoShortcut(event)) return "redo";
  return null;
};

export const runEditorCommand = (
  command: EditorCommand,
  options: RunEditorCommandOptions = {}
) => {
  const source = options.source ?? "global-hotkey";
  if (shouldIgnoreByFocus(source, options.managedTextarea)) return false;

  const state = useCanvasStore.getState();

  switch (command) {
    case "undo":
      if (options.onUndo) options.onUndo();
      else runUndo();
      return true;
    case "redo":
      if (options.onRedo) options.onRedo();
      else runRedo();
      return true;
    case "copy":
    case "copy-rich":
      if (!state.canCopyOrCut()) return false;
      void state.copySelection({
        event: options.clipboardEvent,
        rich: command === "copy-rich",
      });
      return true;
    case "cut":
      if (!state.canCopyOrCut()) return false;
      void state.cutSelection({ event: options.clipboardEvent });
      return true;
    case "paste":
      void state.pasteFromClipboard({
        eventDataTransfer: options.clipboardEvent?.clipboardData || undefined,
      });
      return true;
    case "fill-selection-char": {
      const { fillChar } = options;
      if (!fillChar || fillChar.length !== 1) return false;
      const { selections, textCursor } = state;
      if (selections.length === 0 || textCursor) return false;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return false;
      state.fillSelectionsWithChar(fillChar);
      return true;
    }
    default:
      return false;
  }
};
