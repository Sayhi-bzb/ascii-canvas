import { useEffect, useMemo } from "react";
import {
  BACKGROUND_COLOR,
  CELL_HEIGHT,
  CELL_WIDTH,
  COLOR_ORIGIN_MARKER,
  COLOR_PRIMARY_TEXT,
  COLOR_SCRATCH_LAYER,
  COLOR_SELECTION_BG,
  COLOR_SELECTION_BORDER,
  COLOR_TEXT_CURSOR_BG,
  COLOR_TEXT_CURSOR_FG,
  FONT_SIZE,
  GRID_COLOR,
} from "../../../lib/constants";
import { type CanvasState } from "../../../store/canvasStore";
import { GridManager } from "../../../utils/grid";
import type { SelectionArea, GridMap } from "../../../types";
import { getSelectionBounds } from "../../../utils/selection";

export const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  size: { width: number; height: number } | undefined,
  store: CanvasState,
  draggingSelection: SelectionArea | null
) => {
  const { offset, zoom, grid, scratchLayer, textCursor, selections } = store;

  // 生成背景网格底纹，类似城市的草图坐标线
  const gridPattern = useMemo(() => {
    const sw = CELL_WIDTH * zoom;
    const sh = CELL_HEIGHT * zoom;
    const off = document.createElement("canvas");
    off.width = sw;
    off.height = sh;
    const octx = off.getContext("2d");
    if (octx) {
      octx.strokeStyle = GRID_COLOR;
      octx.lineWidth = 1;
      octx.beginPath();
      octx.moveTo(sw, 0);
      octx.lineTo(0, 0);
      octx.lineTo(0, sh);
      octx.stroke();
    }
    return off;
  }, [zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !size || size.width === 0 || size.height === 0)
      return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // 铺设城市地基
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, size.width, size.height);

    // 绘制坐标参考线
    const pattern = ctx.createPattern(gridPattern, "repeat");
    if (pattern) {
      ctx.save();
      ctx.translate(
        offset.x % (CELL_WIDTH * zoom),
        offset.y % (CELL_HEIGHT * zoom)
      );
      ctx.fillStyle = pattern;
      ctx.fillRect(
        -(CELL_WIDTH * zoom),
        -(CELL_HEIGHT * zoom),
        size.width + CELL_WIDTH * zoom * 2,
        size.height + CELL_HEIGHT * zoom * 2
      );
      ctx.restore();
    }

    const sw = CELL_WIDTH * zoom;
    const sh = CELL_HEIGHT * zoom;
    ctx.font = `${FONT_SIZE * zoom}px 'Maple Mono NF CN', monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // 渲染图层函数
    const renderLayer = (layer: GridMap, color: string) => {
      ctx.fillStyle = color;

      // 这里的边界计算现在有了合法的 const 声明
      const minX = -offset.x / sw - 1;
      const maxX = (size.width - offset.x) / sw + 1;
      const minY = -offset.y / sh - 1;
      const maxY = (size.height - offset.y) / sh + 1;

      for (const [key, char] of layer.entries()) {
        if (!char || char === " ") continue;
        const { x, y } = GridManager.fromKey(key);

        // 剔除不在“视野区”地块，节省计算资源
        if (x < minX || x > maxX || y < minY || y > maxY) continue;

        const pos = GridManager.gridToScreen(x, y, offset.x, offset.y, zoom);
        const wide = GridManager.isWideChar(char);
        const centerX = pos.x + (wide ? sw : sw / 2);
        const centerY = pos.y + sh / 2;

        ctx.fillText(char, centerX, centerY);
      }
    };

    renderLayer(grid, COLOR_PRIMARY_TEXT);
    if (scratchLayer) renderLayer(scratchLayer, COLOR_SCRATCH_LAYER);

    // 渲染选区高亮
    const drawSel = (area: SelectionArea) => {
      const { minX, minY, maxX, maxY } = getSelectionBounds(area);
      const pos = GridManager.gridToScreen(
        minX,
        minY,
        offset.x,
        offset.y,
        zoom
      );

      // 修复了变量 h 的声明
      const w = (maxX - minX + 1) * sw;
      const h = (maxY - minY + 1) * sh;

      ctx.fillStyle = COLOR_SELECTION_BG;
      ctx.fillRect(pos.x, pos.y, w, h);

      if (COLOR_SELECTION_BORDER !== "transparent") {
        ctx.strokeStyle = COLOR_SELECTION_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(pos.x, pos.y, w, h);
      }
    };

    selections.forEach(drawSel);
    if (draggingSelection) drawSel(draggingSelection);

    // 渲染文字输入光标
    if (textCursor) {
      const pos = GridManager.gridToScreen(
        textCursor.x,
        textCursor.y,
        offset.x,
        offset.y,
        zoom
      );
      const char = grid.get(GridManager.toKey(textCursor.x, textCursor.y));
      const wide = char ? GridManager.isWideChar(char) : false;
      const cursorWidth = wide ? sw * 2 : sw;

      ctx.fillStyle = COLOR_TEXT_CURSOR_BG;
      ctx.fillRect(pos.x, pos.y, cursorWidth, sh);

      if (char) {
        ctx.fillStyle = COLOR_TEXT_CURSOR_FG;
        const centerX = pos.x + (wide ? sw : sw / 2);
        ctx.fillText(char, centerX, pos.y + sh / 2);
      }
    }

    // 绘制城市原点标记 (0,0)
    ctx.fillStyle = COLOR_ORIGIN_MARKER;
    ctx.fillRect(offset.x - 1, offset.y - 10, 2, 20);
    ctx.fillRect(offset.x - 10, offset.y - 1, 20, 2);
  }, [
    offset,
    zoom,
    size,
    grid,
    scratchLayer,
    textCursor,
    selections,
    draggingSelection,
    gridPattern,
    canvasRef,
  ]);
};
