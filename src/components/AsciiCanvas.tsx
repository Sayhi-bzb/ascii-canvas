// src/components/AsciiCanvas.tsx
import { useEffect, useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import {
  BACKGROUND_COLOR,
  CELL_HEIGHT,
  CELL_WIDTH,
  COLOR_ORIGIN_MARKER,
  COLOR_PRIMARY_TEXT,
  COLOR_SCRATCH_LAYER,
  COLOR_TEXT_CURSOR_BG,
  COLOR_TEXT_CURSOR_FG,
  FONT_SIZE,
  GRID_COLOR,
} from "../lib/constants";
import { useCanvasStore } from "../store/canvasStore";
import { fromKey, gridToScreen, screenToGrid, toKey } from "../utils/math";
import { getBoxPoints, getLinePoints } from "../utils/shapes";
import type { Point } from "../types";

export const AsciiCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const dragStartGrid = useRef<Point | null>(null);
  const lastGrid = useRef<Point | null>(null);

  const {
    offset,
    zoom,
    grid,
    scratchLayer,
    tool,
    brushChar,
    textCursor,
    setOffset,
    setZoom,
    setScratchLayer,
    addScratchPoints,
    commitScratch,
    setTextCursor,
    writeTextChar,
    moveTextCursor,
    backspaceText,
    newlineText,
  } = useCanvasStore();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setSize({ width, height });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (tool !== "text" || !textCursor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;

      if (e.key.length === 1) {
        e.preventDefault();
        writeTextChar(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspaceText();
      } else if (e.key === "Enter") {
        e.preventDefault();
        newlineText();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveTextCursor(0, -1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveTextCursor(0, 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveTextCursor(-1, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        moveTextCursor(1, 0);
      } else if (e.key === "Escape") {
        setTextCursor(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    tool,
    textCursor,
    writeTextChar,
    backspaceText,
    newlineText,
    moveTextCursor,
    setTextCursor,
  ]);

  useGesture(
    {
      onDragStart: ({ xy: [x, y], event }) => {
        const isLeftClick = (event as MouseEvent).button === 0;
        const isPan = (event as MouseEvent).ctrlKey || tool === "move";
        const rect = containerRef.current?.getBoundingClientRect();

        if (isLeftClick && !isPan && rect) {
          const start = screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );

          if (tool === "text") {
            setTextCursor(start);
            return;
          }

          dragStartGrid.current = start;
          lastGrid.current = start;

          if (tool === "brush") {
            addScratchPoints([{ ...start, char: brushChar }]);
          }
        }
      },
      onDrag: ({ delta: [dx, dy], xy: [x, y], event }) => {
        const mouseEvent = event as MouseEvent;
        if (tool === "text") return;

        const isPan =
          mouseEvent.buttons === 4 || mouseEvent.ctrlKey || tool === "move";

        if (isPan) {
          setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
          document.body.style.cursor = "grabbing";
        } else {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect && dragStartGrid.current) {
            const currentGrid = screenToGrid(
              x - rect.left,
              y - rect.top,
              offset.x,
              offset.y,
              zoom
            );

            if (tool === "brush" && lastGrid.current) {
              const points = getLinePoints(lastGrid.current, currentGrid);
              const pointsWithChar = points.map((p) => ({
                ...p,
                char: brushChar,
              }));
              addScratchPoints(pointsWithChar);
              lastGrid.current = currentGrid;
            } else if (tool === "eraser" && lastGrid.current) {
              const points = getLinePoints(lastGrid.current, currentGrid);
              const pointsWithChar = points.map((p) => ({ ...p, char: " " }));
              addScratchPoints(pointsWithChar);
              lastGrid.current = currentGrid;
            } else if (tool === "box") {
              const points = getBoxPoints(dragStartGrid.current, currentGrid);
              setScratchLayer(points);
            } else if (tool === "line") {
              const points = getLinePoints(dragStartGrid.current, currentGrid);
              const pointsWithChar = points.map((p) => ({
                ...p,
                char: brushChar,
              }));
              setScratchLayer(pointsWithChar);
            }
          }
        }
      },
      onDragEnd: ({ event }) => {
        if (tool === "text") return;

        const isLeftClick = (event as MouseEvent).button === 0;
        const isPan = (event as MouseEvent).ctrlKey || tool === "move";

        if (isLeftClick && !isPan) {
          commitScratch();
          dragStartGrid.current = null;
          lastGrid.current = null;
        }
        document.body.style.cursor = "auto";
      },
      onWheel: ({ delta: [, dy], event }) => {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setZoom((prev) => prev * (1 - dy * 0.002));
        } else {
          setOffset((prev) => ({
            x: prev.x - event.deltaX,
            y: prev.y - event.deltaY,
          }));
        }
      },
    },
    { target: containerRef, eventOptions: { passive: false } }
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || size.width === 0 || size.height === 0) return;

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

    ctx.font = `${FONT_SIZE * zoom}px monospace`;
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
            ctx.clearRect(screenPos.x, screenPos.y, scaledCellW, scaledCellH);
          } else {
            ctx.fillText(
              char,
              screenPos.x + scaledCellW / 2,
              screenPos.y + scaledCellH / 2
            );
          }
        }
      });
    };

    renderLayer(grid, COLOR_PRIMARY_TEXT);
    if (scratchLayer) renderLayer(scratchLayer, COLOR_SCRATCH_LAYER);

    if (tool === "text" && textCursor) {
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
          ctx.fillStyle = COLOR_TEXT_CURSOR_FG;
          ctx.fillText(
            charUnderCursor,
            screenPos.x + scaledCellW / 2,
            screenPos.y + scaledCellH / 2
          );
        }
      }
    }

    const originX = offset.x;
    const originY = offset.y;
    ctx.fillStyle = COLOR_ORIGIN_MARKER;
    ctx.fillRect(originX - 2, originY - 10, 4, 20);
    ctx.fillRect(originX - 10, originY - 2, 20, 4);
  }, [offset, zoom, size, grid, scratchLayer, textCursor, tool]);

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className={`w-full h-full overflow-hidden bg-gray-50 touch-none select-none ${
        tool === "text"
          ? "cursor-text"
          : tool === "move"
          ? "cursor-grab"
          : "cursor-crosshair"
      }`}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
