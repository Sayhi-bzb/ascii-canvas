import {
  Eraser,
  LineSquiggle,
  MousePointer2,
  PaintBucket,
  Palette,
  Pencil,
  Undo2,
} from "lucide-react";
import type { ToolbarActionId, ToolbarActionMeta } from "./types";

export const TOOLBAR_ACTION_ORDER: ToolbarActionId[] = [
  "select",
  "brush",
  "shape-group",
  "fill",
  "eraser",
  "undo",
  "color",
];

export const TOOLBAR_ACTION_META: Record<ToolbarActionId, ToolbarActionMeta> = {
  select: { id: "select", label: "Select", icon: MousePointer2 },
  brush: { id: "brush", label: "Brush", icon: Pencil, hasSub: true },
  "shape-group": {
    id: "shape-group",
    label: "Shape",
    icon: LineSquiggle,
    hasSub: true,
  },
  fill: { id: "fill", label: "Fill Area", icon: PaintBucket },
  eraser: { id: "eraser", label: "Eraser", icon: Eraser },
  undo: { id: "undo", label: "Undo", icon: Undo2 },
  color: { id: "color", label: "Color", icon: Palette, hasSub: true },
};
