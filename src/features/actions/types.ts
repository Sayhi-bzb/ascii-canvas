import type { CanvasState } from "@/store/interfaces";
import type { ToolType } from "@/types";

// Editor Actions
export type EditorActionId =
  | "undo"
  | "redo"
  | "copy"
  | "copy-rich"
  | "cut"
  | "paste"
  | "fill-selection-char"
  | "snapshot-png"
  | "delete-selection";

// Toolbar Actions
export type ToolbarActionId =
  | "select"
  | "brush"
  | "shape-group"
  | "fill"
  | "eraser"
  | "undo"
  | "color";

// Sidebar Actions
export type SidebarActionId =
  | "toggle-grid"
  | "reset-view"
  | "open-source-code";

// Unified Action ID
export type ActionId = EditorActionId | ToolbarActionId | SidebarActionId;

// Action Source
export type ActionSource = "keyboard" | "toolbar" | "context-menu" | "sidebar" | "canvas-keydown" | "global-hotkey";

// Action Result
export interface ActionResult {
  handled: boolean;
  succeeded: boolean;
  reason?: string;
}

// Action Context
export interface ActionContext {
  state: CanvasState;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
}

// Action Handler
export type ActionHandler<T = unknown> = (
  options: T,
  context: ActionContext
) => ActionResult;

// Action Checker
export type ActionChecker = (state: CanvasState) => boolean;

// Context Menu Entry
export type ContextMenuEntry =
  | { type: "action"; id: EditorActionId }
  | { type: "separator" };
