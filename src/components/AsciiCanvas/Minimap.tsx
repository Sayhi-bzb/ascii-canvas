"use client";

import { useRef, useEffect } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { GridManager } from "../../utils/grid";
import { CELL_WIDTH, CELL_HEIGHT } from "../../lib/constants";

const MINIMAP_SIZE = 160;
const PADDING = 8;

export const Minimap = ({
  containerSize,
}: {
  containerSize: { width: number; height: number } | undefined;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseLayerRef = useRef<HTMLCanvasElement | null>(null);
  const viewMetaRef = useRef<{ minX: number; minY: number; scale: number } | null>(
    null
  );
  const { grid, offset, zoom, setOffset } = useCanvasStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!grid || grid.size === 0 || !containerSize) {
      ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
      viewMetaRef.current = null;
      return;
    }

    const baseCanvas =
      baseLayerRef.current || document.createElement("canvas");
    baseLayerRef.current = baseCanvas;
    baseCanvas.width = MINIMAP_SIZE;
    baseCanvas.height = MINIMAP_SIZE;
    const baseCtx = baseCanvas.getContext("2d");
    if (!baseCtx) return;

    const style = getComputedStyle(document.body);
    const primaryColor = style.getPropertyValue("--primary").trim();

    const { minX, maxX, minY, maxY } = GridManager.getGridBounds(grid);
    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;

    const scale = Math.min(
      (MINIMAP_SIZE - PADDING * 2) / contentWidth,
      (MINIMAP_SIZE - PADDING * 2) / contentHeight
    );

    baseCtx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    baseCtx.fillStyle = `oklch(from ${primaryColor} l c h / 0.3)`;
    GridManager.iterate(grid, (_, x, y) => {
      const px = (x - minX) * scale + PADDING;
      const py = (y - minY) * scale + PADDING;
      baseCtx.fillRect(
        px,
        py,
        Math.max(scale * 0.8, 1),
        Math.max(scale * 0.8, 1)
      );
    });
    viewMetaRef.current = { minX, minY, scale };
  }, [grid, containerSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerSize) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    if (!grid || grid.size === 0) return;

    const meta = viewMetaRef.current;
    if (!meta) return;

    const baseCanvas = baseLayerRef.current;
    if (baseCanvas) ctx.drawImage(baseCanvas, 0, 0);

    const style = getComputedStyle(document.body);
    const mutedColor = style.getPropertyValue("--muted-foreground").trim();

    const viewGridStartX = -offset.x / (CELL_WIDTH * zoom);
    const viewGridStartY = -offset.y / (CELL_HEIGHT * zoom);
    const viewGridWidth = containerSize.width / (CELL_WIDTH * zoom);
    const viewGridHeight = containerSize.height / (CELL_HEIGHT * zoom);

    const vx = (viewGridStartX - meta.minX) * meta.scale + PADDING;
    const vy = (viewGridStartY - meta.minY) * meta.scale + PADDING;
    const vw = viewGridWidth * meta.scale;
    const vh = viewGridHeight * meta.scale;

    ctx.strokeStyle = `oklch(from ${mutedColor} l c h / 0.8)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh);

    ctx.fillStyle = `oklch(from ${mutedColor} l c h / 0.1)`;
    ctx.fillRect(vx, vy, vw, vh);
  }, [grid, offset, zoom, containerSize]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!grid || grid.size === 0 || !containerSize) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left - PADDING;
    const clickY = e.clientY - rect.top - PADDING;

    const { minX, maxX, minY, maxY } = GridManager.getGridBounds(grid);
    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;

    const scale = Math.min(
      (MINIMAP_SIZE - PADDING * 2) / contentWidth,
      (MINIMAP_SIZE - PADDING * 2) / contentHeight
    );

    const targetGridX = clickX / scale + minX;
    const targetGridY = clickY / scale + minY;

    const newOffsetX =
      containerSize.width / 2 - targetGridX * CELL_WIDTH * zoom;
    const newOffsetY =
      containerSize.height / 2 - targetGridY * CELL_HEIGHT * zoom;

    setOffset(() => ({ x: newOffsetX, y: newOffsetY }));
  };

  return (
    <div className="absolute top-4 left-4 z-[60] overflow-hidden select-none cursor-crosshair">
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className="opacity-80 transition-opacity hover:opacity-100 active:scale-[0.98] transition-transform"
        onClick={handleMinimapClick}
      />
    </div>
  );
};
