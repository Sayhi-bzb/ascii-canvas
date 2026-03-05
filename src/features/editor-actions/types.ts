import type { LucideIcon } from "lucide-react";

export type ActionId =
  | "undo"
  | "redo"
  | "copy"
  | "copy-rich"
  | "cut"
  | "paste"
  | "fill-selection-char"
  | "snapshot-png"
  | "delete-selection";

export type ActionSource =
  | "global-hotkey"
  | "canvas-keydown"
  | "clipboard-event"
  | "context-menu"
  | "toolbar"
  | "sidebar";

export type ActionMeta = {
  id: ActionId;
  label: string;
  shortcut?: string;
  icon?: LucideIcon;
  destructive?: boolean;
};

export type CanvasContextMenuEntry =
  | { type: "action"; id: ActionId }
  | { type: "separator" };

