// src/lib/constants.ts
export const CELL_WIDTH = 10;
export const CELL_HEIGHT = 20;

export const GRID_COLOR = "#e5e7eb";
export const BACKGROUND_COLOR = "#ffffff";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

// === 城市设计规范 ===

// 视觉与颜色规范
export const FONT_SIZE = 15;
export const COLOR_PRIMARY_TEXT = "#000000";
export const COLOR_SCRATCH_LAYER = "#3b82f6";
export const COLOR_TEXT_CURSOR_BG = "rgba(0, 0, 0, 0.5)";
export const COLOR_TEXT_CURSOR_FG = "#ffffff";
export const COLOR_ORIGIN_MARKER = "red";

// 新增：选区高光颜色
export const COLOR_SELECTION_BG = "rgba(59, 130, 246, 0.2)"; // 半透明蓝
export const COLOR_SELECTION_BORDER = "#3b82f6"; // 实心蓝边框

// 功能性规范
export const UNDO_LIMIT = 100;
export const EXPORT_PADDING = 1;

// 建筑材料字符
export const BOX_CHARS = {
  TOP_LEFT: "┌",
  TOP_RIGHT: "┐",
  BOTTOM_LEFT: "└",
  BOTTOM_RIGHT: "┘",
  HORIZONTAL: "─",
  VERTICAL: "│",
  CROSS: "+",
};
