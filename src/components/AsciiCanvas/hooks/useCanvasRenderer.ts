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
import { gridToScreen, fromKey, toKey } from "../../../utils/math";
import type { SelectionArea } from "../../../types";
import { isWideChar } from "../../../utils/char";
import { getSelectionBounds } from "../../../utils/selection";

export const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  size: { width: number; height: number } | undefined,
  store: CanvasState,
  draggingSelection: SelectionArea | null
) => {
  const { offset, zoom, grid, scratchLayer, textCursor, selections } = store;

  const gridPattern = useMemo(() => {
    const scaledW = CELL_WIDTH * zoom;
    const scaledH = CELL_HEIGHT * zoom;
    const offscreen = document.createElement("canvas");
    offscreen.width = scaledW;
    offscreen.height = scaledH;
    const octx = offscreen.getContext("2d");
    if (octx) {
      octx.strokeStyle = GRID_COLOR;
      octx.lineWidth = 1;
      octx.beginPath();
      octx.moveTo(scaledW, 0);
      octx.lineTo(0, 0);
      octx.lineTo(0, scaledH);
      octx.stroke();
    }
    return offscreen;
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

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, size.width, size.height);

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

    const scaledW = CELL_WIDTH * zoom;
    const scaledH = CELL_HEIGHT * zoom;
    ctx.font = `${FONT_SIZE * zoom}px 'Maple Mono NF CN', monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const renderLayer = (layer: Map<string, string>, color: string) => {
      ctx.fillStyle = color;

      const minX = -offset.x / scaledW - 1;
      const maxX = (size.width - offset.x) / scaledW + 1;
      const minY = -offset.y / scaledH - 1;
      const maxY = (size.height - offset.y) / scaledH + 1;

      for (const [key, char] of layer.entries()) {
        if (!char || char === " ") continue;
        const { x, y } = fromKey(key);

        if (x < minX || x > maxX || y < minY || y > maxY) continue;

        const screenPos = gridToScreen(x, y, offset.x, offset.y, zoom);
        const wide = isWideChar(char);
        const centerX = screenPos.x + (wide ? scaledW : scaledW / 2);
        const centerY = screenPos.y + scaledH / 2;

        ctx.fillText(char, centerX, centerY);
      }
    };

    renderLayer(grid, COLOR_PRIMARY_TEXT);
    if (scratchLayer) renderLayer(scratchLayer, COLOR_SCRATCH_LAYER);

    const renderSelection = (area: SelectionArea) => {
      const { minX, minY, maxX, maxY } = getSelectionBounds(area);
      const screenStart = gridToScreen(minX, minY, offset.x, offset.y, zoom);
      const width = (maxX - minX + 1) * scaledW;
      const height = (maxY - minY + 1) * scaledH;

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
      const screenPos = gridToScreen(x, y, offset.x, offset.y, zoom);
      const charUnderCursor = grid.get(toKey(x, y));
      const wide = charUnderCursor ? isWideChar(charUnderCursor) : false;
      const cursorWidth = wide ? scaledW * 2 : scaledW;

      ctx.fillStyle = COLOR_TEXT_CURSOR_BG;
      ctx.fillRect(screenPos.x, screenPos.y, cursorWidth, scaledH);

      if (charUnderCursor) {
        ctx.fillStyle = COLOR_TEXT_CURSOR_FG;
        const centerX = screenPos.x + (wide ? scaledW : scaledW / 2);
        ctx.fillText(charUnderCursor, centerX, screenPos.y + scaledH / 2);
      }
    }

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
