import { useCanvasStore } from "@/store/canvasStore";
import { runEditorCommand } from "@/store/actions/editorCommands";
import {
  actionFailed,
  actionSucceeded,
  actionUnhandled,
  type ActionResult,
} from "@/features/actions/result";
import type { ActionId, ActionSource } from "./types";

type RunActionOptions = {
  source?: ActionSource;
  managedTextarea?: HTMLTextAreaElement | null;
  clipboardEvent?: ClipboardEvent;
  fillChar?: string;
  onUndo?: () => void;
  onRedo?: () => void;
};

export const canRunAction = (
  actionId: ActionId,
  state = useCanvasStore.getState()
) => {
  if (state.canvasMode === "structured") {
    switch (actionId) {
      case "copy":
        return state.structuredScene.length > 0;
      case "copy-rich":
      case "cut":
      case "paste":
      case "fill-selection-char":
        return false;
    }
  }

  switch (actionId) {
    case "copy":
    case "copy-rich":
    case "cut":
      return state.canCopyOrCut();
    case "snapshot-png":
    case "delete-selection":
      return state.selections.length > 0;
    default:
      return true;
  }
};

export const runAction = (
  actionId: ActionId,
  options: RunActionOptions = {}
): ActionResult => {
  switch (actionId) {
    case "undo":
    case "redo":
    case "copy":
    case "copy-rich":
    case "cut":
    case "paste":
    case "fill-selection-char": {
      const succeeded = runEditorCommand(actionId, {
        source: options.source,
        managedTextarea: options.managedTextarea,
        clipboardEvent: options.clipboardEvent,
        fillChar: options.fillChar,
        onUndo: options.onUndo,
        onRedo: options.onRedo,
      });
      return succeeded ? actionSucceeded() : actionFailed("precondition-failed");
    }
    case "snapshot-png": {
      const state = useCanvasStore.getState();
      if (!canRunAction(actionId, state)) return actionFailed("empty-selection");
      void state.copySelectionAsPng(state.showGrid);
      return actionSucceeded();
    }
    case "delete-selection": {
      const state = useCanvasStore.getState();
      if (!canRunAction(actionId, state)) return actionFailed("empty-selection");
      state.deleteSelection();
      return actionSucceeded();
    }
    default:
      return actionUnhandled("unknown-action");
  }
};
