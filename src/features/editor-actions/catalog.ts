import {
  Clipboard,
  Copy,
  Image,
  Palette,
  Scissors,
  Trash2,
} from "lucide-react";
import type { ActionMeta, CanvasContextMenuEntry } from "./types";

export const ACTION_META: Record<ActionMeta["id"], ActionMeta> = {
  undo: { id: "undo", label: "Undo", shortcut: "⌘Z" },
  redo: { id: "redo", label: "Redo", shortcut: "⌘⇧Z / ⌘Y" },
  copy: { id: "copy", label: "Copy as Text", shortcut: "⌘C", icon: Copy },
  "copy-rich": {
    id: "copy-rich",
    label: "Copy with Color",
    icon: Palette,
  },
  cut: { id: "cut", label: "Cut Zone", shortcut: "⌘X", icon: Scissors },
  paste: { id: "paste", label: "Paste Lot", shortcut: "⌘V", icon: Clipboard },
  "fill-selection-char": { id: "fill-selection-char", label: "Fill Selection" },
  "snapshot-png": {
    id: "snapshot-png",
    label: "Snapshot (PNG)",
    icon: Image,
  },
  "delete-selection": {
    id: "delete-selection",
    label: "Demolish (Delete)",
    shortcut: "⌫",
    icon: Trash2,
    destructive: true,
  },
};

export const CANVAS_CONTEXT_MENU: CanvasContextMenuEntry[] = [
  { type: "action", id: "copy" },
  { type: "action", id: "copy-rich" },
  { type: "action", id: "snapshot-png" },
  { type: "action", id: "cut" },
  { type: "action", id: "paste" },
  { type: "separator" },
  { type: "action", id: "delete-selection" },
];

