import type { LucideIcon } from "lucide-react";

export type ToolbarActionId =
  | "select"
  | "brush"
  | "shape-group"
  | "fill"
  | "eraser"
  | "undo"
  | "color";

export type ToolbarActionMeta = {
  id: ToolbarActionId;
  label: string;
  icon: LucideIcon;
  hasSub?: boolean;
};
