import { useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { useCreation, useThrottleFn } from "ahooks";
import { GridManager } from "../../../utils/grid";
import type { Point, SelectionArea, ToolType } from "../../../types";
import { type CanvasState } from "../../../store/canvasStore";
import { forceHistorySave } from "../../../lib/yjs-setup";
import bresenham from "bresenham";
import { isCtrlOrMeta } from "../../../utils/event";
import { MIN_ZOOM, MAX_ZOOM } from "../../../lib/constants";

const isShapeTool = (tool: ToolType): boolean => {
  return ["box", "circle", "line", "stepline"].includes(tool);
};

export const useCanvasInteraction = (
  store: CanvasState,
  containerRef: React.RefObject<HTMLDivElement | null>
) => {
  const {
    tool,
    brushChar,
    setOffset,
    setZoom,
    addScratchPoints,
    commitScratch,
    setTextCursor,
    addSelection,
    clearSelections,
    erasePoints,
    offset,
    zoom,
    grid,
    updateScratchForShape,
    setHoveredGrid,
  } = store;

  const dragStartGrid = useRef<Point | null>(null);
  const lastGrid = useRef<Point | null>(null);
  const lastPlacedGrid = useRef<Point | null>(null);
  const anchorGrid = useRef<Point | null>(null);

  const isPanningRef = useRef(false);
  const lineAxisRef = useRef<"vertical" | "horizontal" | null>(null);
  const [draggingSelection, setDraggingSelection] =
    useState<SelectionArea | null>(null);

  const handleDrawing = useCreation(
    () => (currentGrid: Point) => {
      if (
        !lastGrid.current ||
        (currentGrid.x === lastGrid.current.x &&
          currentGrid.y === lastGrid.current.y)
      )
        return;
      const points = bresenham(
        lastGrid.current.x,
        lastGrid.current.y,
        currentGrid.x,
        currentGrid.y
      );

      if (tool === "brush") {
        const charWidth = GridManager.getCharWidth(brushChar);
        if (charWidth > 1) {
          const filteredPoints: Point[] = [];
          points.forEach((p) => {
            if (!lastPlacedGrid.current) {
              filteredPoints.push(p);
              lastPlacedGrid.current = p;
            } else {
              const dx = Math.abs(p.x - lastPlacedGrid.current.x);
              const dy = Math.abs(p.y - lastPlacedGrid.current.y);
              if (dx >= charWidth || dy >= 1) {
                filteredPoints.push(p);
                lastPlacedGrid.current = p;
              }
            }
          });
          if (filteredPoints.length > 0) {
            addScratchPoints(
              filteredPoints.map((p) => ({ ...p, char: brushChar }))
            );
          }
        } else {
          addScratchPoints(points.map((p) => ({ ...p, char: brushChar })));
        }
      } else if (tool === "eraser") {
        erasePoints(points);
      }
      lastGrid.current = currentGrid;
    },
    [tool, brushChar, addScratchPoints, erasePoints]
  );

  const { run: throttledDraw } = useThrottleFn(handleDrawing, {
    wait: 8,
    trailing: true,
  });

  const bind = useGesture(
    {
      onMove: ({ xy: [x, y] }) => {
        if (tool !== "eraser") return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const raw = GridManager.screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );
          setHoveredGrid(raw);
        }
      },
      onDragStart: ({ xy: [x, y], event }) => {
        const mouseEvent = event as MouseEvent;
        if (mouseEvent.button === 1 || isCtrlOrMeta(mouseEvent)) {
          isPanningRef.current = true;
          document.body.style.cursor = "grabbing";
          return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (mouseEvent.button === 0 && rect) {
          const raw = GridManager.screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );
          const start = GridManager.snapToCharStart(raw, grid);

          if (tool === "select") {
            if (mouseEvent.shiftKey && anchorGrid.current) {
              clearSelections();
              setTextCursor(null);
              addSelection({
                start: { ...anchorGrid.current },
                end: start,
              });
              return;
            }

            if (!mouseEvent.shiftKey) {
              clearSelections();
              anchorGrid.current = start;
            }

            setDraggingSelection({ start, end: start });
            dragStartGrid.current = start;
            setTextCursor(null);
            return;
          }

          clearSelections();
          setTextCursor(null);
          dragStartGrid.current = start;
          lastGrid.current = start;
          lastPlacedGrid.current = start;
          anchorGrid.current = start;
          lineAxisRef.current = null;

          if (tool === "brush")
            addScratchPoints([{ ...start, char: brushChar }]);
          else if (tool === "eraser") erasePoints([start]);
        }
      },
      onDrag: ({ xy: [x, y], delta: [dx, dy] }) => {
        if (isPanningRef.current) {
          setOffset((prev: Point) => ({ x: prev.x + dx, y: prev.y + dy }));
          return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && dragStartGrid.current) {
          const raw = GridManager.screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );
          const currentGrid = GridManager.snapToCharStart(raw, grid);

          if (tool === "select") {
            setDraggingSelection({
              start: dragStartGrid.current,
              end: currentGrid,
            });
          } else if (tool === "brush" || tool === "eraser") {
            throttledDraw(currentGrid);
          } else if (isShapeTool(tool)) {
            if (tool === "line" && !lineAxisRef.current) {
              const adx = Math.abs(currentGrid.x - dragStartGrid.current.x);
              const ady = Math.abs(currentGrid.y - dragStartGrid.current.y);
              if (adx > 0 || ady > 0)
                lineAxisRef.current = ady > adx ? "vertical" : "horizontal";
            }
            updateScratchForShape(tool, dragStartGrid.current, currentGrid, {
              axis: lineAxisRef.current,
            });
          }
          if (tool === "eraser") setHoveredGrid(currentGrid);
        }
      },
      onDragEnd: ({ event }) => {
        if (isPanningRef.current) {
          isPanningRef.current = false;
          document.body.style.cursor = "auto";
          return;
        }
        if ((event as MouseEvent).button === 0) {
          if (tool === "select" && draggingSelection) {
            if (
              draggingSelection.start.x === draggingSelection.end.x &&
              draggingSelection.start.y === draggingSelection.end.y
            ) {
              setTextCursor(draggingSelection.start);
            } else {
              addSelection(draggingSelection);
            }
            setDraggingSelection(null);
          } else if (tool === "brush" || isShapeTool(tool)) {
            commitScratch();
          } else if (tool === "eraser") {
            forceHistorySave();
          }
          dragStartGrid.current = null;
          lastGrid.current = null;
          lastPlacedGrid.current = null;
          lineAxisRef.current = null;
        }
        document.body.style.cursor = "auto";
      },
      onWheel: ({ xy: [clientX, clientY], delta: [, dy], event }) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        if (isCtrlOrMeta(event)) {
          event.preventDefault();
          const mouseX = clientX - rect.left;
          const mouseY = clientY - rect.top;
          const zoomWeight = 0.002;
          const deltaZoom = 1 - dy * zoomWeight;
          const oldZoom = zoom;
          const nextZoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, oldZoom * deltaZoom)
          );

          if (nextZoom !== oldZoom) {
            const actualScale = nextZoom / oldZoom;
            setZoom(() => nextZoom);
            setOffset((prev: Point) => ({
              x: mouseX - (mouseX - prev.x) * actualScale,
              y: mouseY - (mouseY - prev.y) * actualScale,
            }));
          }
        } else {
          setOffset((p: Point) => ({
            x: p.x - (event as WheelEvent).deltaX,
            y: p.y - (event as WheelEvent).deltaY,
          }));
        }
      },
    },
    { target: containerRef, eventOptions: { passive: false } }
  );

  return { bind, draggingSelection };
};
