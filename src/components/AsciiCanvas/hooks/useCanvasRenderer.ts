import { useEffect } from "react";
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

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, size.width, size.height);

    const sw = CELL_WIDTH * zoom;
    const sh = CELL_HEIGHT * zoom;

    const startX = Math.floor(-offset.x / sw);
    const endX = Math.ceil((size.width - offset.x) / sw);
    const startY = Math.floor(-offset.y / sh);
    const endY = Math.ceil((size.height - offset.y) / sh);

    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x++) {
      const posX = Math.round(x * sw + offset.x);
      ctx.moveTo(posX, 0);
      ctx.lineTo(posX, size.height);
    }

    for (let y = startY; y <= endY; y++) {
      const posY = Math.round(y * sh + offset.y);
      ctx.moveTo(0, posY);
      ctx.lineTo(size.width, posY);
    }
    ctx.stroke();

    ctx.font = `${FONT_SIZE * zoom}px 'Maple Mono NF CN', monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const renderLayer = (layer: GridMap, color: string) => {
      ctx.fillStyle = color;

      for (const [key, char] of layer.entries()) {
        if (!char || char === " ") continue;
        const { x, y } = GridManager.fromKey(key);

        if (x < startX || x > endX || y < startY || y > endY) continue;

        const pos = GridManager.gridToScreen(x, y, offset.x, offset.y, zoom);
        const wide = GridManager.isWideChar(char);

        const centerX = Math.round(pos.x + (wide ? sw : sw / 2));
        const centerY = Math.round(pos.y + sh / 2);

        ctx.fillText(char, centerX, centerY);
      }
    };

    renderLayer(grid, COLOR_PRIMARY_TEXT);
    if (scratchLayer) renderLayer(scratchLayer, COLOR_SCRATCH_LAYER);

    const drawSel = (area: SelectionArea) => {
      const { minX, minY, maxX, maxY } = getSelectionBounds(area);
      const pos = GridManager.gridToScreen(
        minX,
        minY,
        offset.x,
        offset.y,
        zoom
      );
      const w = (maxX - minX + 1) * sw;
      const h = (maxY - minY + 1) * sh;

      ctx.fillStyle = COLOR_SELECTION_BG;
      ctx.fillRect(
        Math.round(pos.x),
        Math.round(pos.y),
        Math.round(w),
        Math.round(h)
      );

      if (COLOR_SELECTION_BORDER !== "transparent") {
        ctx.strokeStyle = COLOR_SELECTION_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          Math.round(pos.x),
          Math.round(pos.y),
          Math.round(w),
          Math.round(h)
        );
      }
    };

    selections.forEach(drawSel);
    if (draggingSelection) drawSel(draggingSelection);

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
      ctx.fillRect(
        Math.round(pos.x),
        Math.round(pos.y),
        Math.round(cursorWidth),
        Math.round(sh)
      );

      if (char) {
        ctx.fillStyle = COLOR_TEXT_CURSOR_FG;
        const centerX = Math.round(pos.x + (wide ? sw : sw / 2));
        ctx.fillText(char, centerX, Math.round(pos.y + sh / 2));
      }
    }

    ctx.fillStyle = COLOR_ORIGIN_MARKER;
    const originX = Math.round(offset.x);
    const originY = Math.round(offset.y);
    ctx.fillRect(originX - 1, originY - 10, 2, 20);
    ctx.fillRect(originX - 10, originY - 1, 20, 2);
  }, [
    offset,
    zoom,
    size,
    grid,
    scratchLayer,
    textCursor,
    selections,
    draggingSelection,
    canvasRef,
  ]);
};
