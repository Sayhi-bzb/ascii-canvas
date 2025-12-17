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
import { fromKey, gridToScreen, toKey } from "../../../utils/math";
import type { SelectionArea } from "../../../types";
import { isWideChar } from "../../../utils/char";

export const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  size: { width: number; height: number } | undefined,
  store: CanvasState,
  draggingSelection: SelectionArea | null
) => {
  const { offset, zoom, grid, scratchLayer, tool, textCursor, selections } =
    store;

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
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    const scaledCellW = CELL_WIDTH * zoom;
    const scaledCellH = CELL_HEIGHT * zoom;
    const startCol = Math.floor(-offset.x / scaledCellW);
    const endCol = startCol + size.width / scaledCellW + 1;
    const startRow = Math.floor(-offset.y / scaledCellH);
    const endRow = startRow + size.height / scaledCellH + 1;

    for (let col = startCol; col <= endCol; col++) {
      const x = Math.floor(col * scaledCellW + offset.x);
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, size.height);
    }
    for (let row = startRow; row <= endRow; row++) {
      const y = Math.floor(row * scaledCellH + offset.y);
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(size.width, y + 0.5);
    }
    ctx.stroke();

    ctx.font = `${FONT_SIZE * zoom}px 'Maple Mono CN', monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const renderLayer = (layer: Map<string, string>, color: string) => {
      ctx.fillStyle = color;
      layer.forEach((char, key) => {
        const { x, y } = fromKey(key);
        if (
          x >= startCol - 1 &&
          x <= endCol &&
          y >= startRow - 1 &&
          y <= endRow
        ) {
          const screenPos = gridToScreen(x, y, offset.x, offset.y, zoom);

          if (char === " ") {
            return;
          } else {
            const wide = isWideChar(char);
            const centerX =
              screenPos.x + (wide ? scaledCellW : scaledCellW / 2);
            const centerY = screenPos.y + scaledCellH / 2;
            ctx.fillText(char, centerX, centerY);
          }
        }
      });
    };

    renderLayer(grid, COLOR_PRIMARY_TEXT);
    if (scratchLayer) renderLayer(scratchLayer, COLOR_SCRATCH_LAYER);

    const renderSelection = (area: SelectionArea) => {
      const minX = Math.min(area.start.x, area.end.x);
      const maxX = Math.max(area.start.x, area.end.x);
      const minY = Math.min(area.start.y, area.end.y);
      const maxY = Math.max(area.start.y, area.end.y);

      const screenStart = gridToScreen(minX, minY, offset.x, offset.y, zoom);
      const width = (maxX - minX + 1) * scaledCellW;
      const height = (maxY - minY + 1) * scaledCellH;

      ctx.fillStyle = COLOR_SELECTION_BG;
      ctx.fillRect(screenStart.x, screenStart.y, width, height);

      if (COLOR_SELECTION_BORDER !== "transparent") {
        ctx.strokeStyle = COLOR_SELECTION_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(screenStart.x, screenStart.y, width, height);
      }
    };

    selections.forEach(renderSelection);
    if (draggingSelection) renderSelection(draggingSelection);

    if (textCursor) {
      const { x, y } = textCursor;
      if (
        x >= startCol - 1 &&
        x <= endCol &&
        y >= startRow - 1 &&
        y <= endRow
      ) {
        const screenPos = gridToScreen(x, y, offset.x, offset.y, zoom);
        ctx.fillStyle = COLOR_TEXT_CURSOR_BG;
        ctx.fillRect(screenPos.x, screenPos.y, scaledCellW, scaledCellH);
        const charUnderCursor = grid.get(toKey(x, y));
        if (charUnderCursor) {
          const wide = isWideChar(charUnderCursor);
          ctx.fillStyle = COLOR_TEXT_CURSOR_FG;
          const centerX = screenPos.x + (wide ? scaledCellW : scaledCellW / 2);
          ctx.fillText(charUnderCursor, centerX, screenPos.y + scaledCellH / 2);
        }
      }
    }

    const originX = offset.x;
    const originY = offset.y;
    ctx.fillStyle = COLOR_ORIGIN_MARKER;
    ctx.fillRect(originX - 2, originY - 10, 4, 20);
    ctx.fillRect(originX - 10, originY - 2, 20, 4);
  }, [
    offset,
    zoom,
    size,
    grid,
    scratchLayer,
    textCursor,
    tool,
    selections,
    draggingSelection,
    canvasRef,
  ]);
};
