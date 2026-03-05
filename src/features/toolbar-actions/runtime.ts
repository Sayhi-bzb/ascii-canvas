import type { ToolType } from "@/types";
import type { ToolbarActionId } from "./types";
import {
  actionFailed,
  actionSucceeded,
  actionUnhandled,
  type ActionResult,
} from "@/features/actions/result";

type RunToolbarActionOptions = {
  tool: ToolType;
  isShapeGroupActive: boolean;
  lastUsedShape: ToolType;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
};

export const resolveActiveToolbarAction = (
  tool: ToolType,
  isShapeGroupActive: boolean
): ToolbarActionId => {
  if (isShapeGroupActive) return "shape-group";
  if (tool === "select" || tool === "brush" || tool === "eraser" || tool === "fill") {
    return tool;
  }
  return "brush";
};

export const runToolbarAction = (
  actionId: ToolbarActionId,
  options: RunToolbarActionOptions
): ActionResult => {
  switch (actionId) {
    case "select":
      options.setTool("select");
      return actionSucceeded();
    case "brush":
      options.setTool("brush");
      return actionSucceeded();
    case "shape-group":
      options.setTool(options.isShapeGroupActive ? options.tool : options.lastUsedShape);
      return actionSucceeded();
    case "fill":
      options.setTool("fill");
      return actionSucceeded();
    case "eraser":
      options.setTool("eraser");
      return actionSucceeded();
    case "undo":
      options.onUndo();
      return actionSucceeded();
    case "color":
      return actionFailed("submenu-only");
    default:
      return actionUnhandled("unknown-toolbar-action");
  }
};
