import { useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { useCreation, useThrottleFn } from "ahooks";
import { screenToGrid } from "../../../utils/math";
import { getBoxPoints, getOrthogonalLinePoints } from "../../../utils/shapes";
import type { Point, SelectionArea } from "../../../types";
import { type CanvasState } from "../../../store/canvasStore";
import { forceHistorySave } from "../../../lib/yjs-setup";
import bresenham from "bresenham";
import { snapToCharStart } from "../../../utils/grid";
import { isCtrlOrMeta } from "../../../utils/event";

export const useCanvasInteraction = (
  store: CanvasState,
  containerRef: React.RefObject<HTMLDivElement | null>
) => {
  const {
    tool,
    brushChar,
    setOffset,
    setZoom,
    setScratchLayer,
    addScratchPoints,
    commitScratch,
    setTextCursor,
    addSelection,
    clearSelections,
    fillSelections,
    erasePoints,
    offset,
    zoom,
    grid,
  } = store;

  const dragStartGrid = useRef<Point | null>(null);
  const lastGrid = useRef<Point | null>(null);
  const isPanningRef = useRef(false);
  const lineAxisRef = useRef<"vertical" | "horizontal" | null>(null);
  const [draggingSelection, setDraggingSelection] =
    useState<SelectionArea | null>(null);

  const handleDrawing = useCreation(
    () => (currentGrid: Point) => {
      if (!lastGrid.current) return;
      const points = bresenham(
        lastGrid.current.x,
        lastGrid.current.y,
        currentGrid.x,
        currentGrid.y
      ).map((p) => ({ x: p.x, y: p.y }));

      if (tool === "brush") {
        const pointsWithChar = points.map((p) => ({ ...p, char: brushChar }));
        addScratchPoints(pointsWithChar);
      } else if (tool === "eraser") {
        erasePoints(points);
      }
      lastGrid.current = currentGrid;
    },
    [tool, brushChar, addScratchPoints, erasePoints]
  );

  const { run: throttledDraw } = useThrottleFn(handleDrawing, {
    wait: 16,
    trailing: true,
  });

  const bind = useGesture(
    {
      onDragStart: ({ xy: [x, y], event }) => {
        const mouseEvent = event as MouseEvent;
        const isMiddleClick = mouseEvent.button === 1;
        const isPanStart = isMiddleClick || isCtrlOrMeta(mouseEvent);

        if (isPanStart) {
          isPanningRef.current = true;
          document.body.style.cursor = "grabbing";
          return;
        }

        const isLeftClick = mouseEvent.button === 0;
        const isMultiSelect = mouseEvent.shiftKey;
        const rect = containerRef.current?.getBoundingClientRect();

        if (isLeftClick && rect) {
          const rawStart = screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );

          const start = snapToCharStart(rawStart, grid);

          if (tool === "select") {
            event.preventDefault();
            if (!isMultiSelect) clearSelections();
            setDraggingSelection({ start, end: start });
            dragStartGrid.current = start;
            setTextCursor(null);
            return;
          }

          if (tool === "fill") {
            if (store.selections.length > 0) fillSelections();
            return;
          }

          clearSelections();
          setTextCursor(null);
          dragStartGrid.current = start;
          lastGrid.current = start;
          lineAxisRef.current = null;

          if (tool === "brush") {
            addScratchPoints([{ ...start, char: brushChar }]);
          } else if (tool === "eraser") {
            erasePoints([start]);
          }
        }
      },
      onDrag: ({ xy: [x, y], delta: [dx, dy], event }) => {
        const mouseEvent = event as MouseEvent;
        const isPanGesture =
          mouseEvent.buttons === 4 || isCtrlOrMeta(mouseEvent);

        if (isPanningRef.current || isPanGesture) {
          setOffset((prev: Point) => ({ x: prev.x + dx, y: prev.y + dy }));
          return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && dragStartGrid.current) {
          const rawEnd = screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );

          const currentGrid = snapToCharStart(rawEnd, grid);

          if (tool === "select") {
            setDraggingSelection({
              start: dragStartGrid.current,
              end: currentGrid,
            });
            return;
          }

          if (tool === "brush" || tool === "eraser") {
            throttledDraw(currentGrid);
          } else if (tool === "box") {
            const points = getBoxPoints(dragStartGrid.current, currentGrid);
            setScratchLayer(points);
          } else if (tool === "line") {
            if (!lineAxisRef.current) {
              const absDx = Math.abs(currentGrid.x - dragStartGrid.current.x);
              const absDy = Math.abs(currentGrid.y - dragStartGrid.current.y);
              if (absDx > 0 || absDy > 0) {
                lineAxisRef.current = absDy > absDx ? "vertical" : "horizontal";
              }
            }
            const isVerticalFirst = lineAxisRef.current === "vertical";
            const points = getOrthogonalLinePoints(
              dragStartGrid.current,
              currentGrid,
              isVerticalFirst
            );
            setScratchLayer(points);
          }
        }
      },
      onDragEnd: ({ event }) => {
        const mouseEvent = event as MouseEvent;
        const isLeftClick = mouseEvent.button === 0;

        if (isPanningRef.current) {
          isPanningRef.current = false;
          document.body.style.cursor = "auto";
          return;
        }

        if (isLeftClick) {
          if (tool === "select" && draggingSelection) {
            const { start, end } = draggingSelection;
            const isClick = start.x === end.x && start.y === end.y;

            if (isClick) {
              const clickPos = snapToCharStart(start, grid);
              setTextCursor(clickPos);
              setDraggingSelection(null);
            } else {
              addSelection(draggingSelection);
              setDraggingSelection(null);
            }
          } else if (tool !== "fill" && tool !== "eraser") {
            commitScratch();
          } else if (tool === "eraser") {
            forceHistorySave();
          }
          dragStartGrid.current = null;
          lastGrid.current = null;
          lineAxisRef.current = null;
        }
        document.body.style.cursor = "auto";
      },
      onWheel: ({ delta: [, dy], event }) => {
        if (isCtrlOrMeta(event)) {
          event.preventDefault();
          setZoom((prev: number) => prev * (1 - dy * 0.002));
        } else {
          setOffset((prev: Point) => ({
            x: prev.x - event.deltaX,
            y: prev.y - event.deltaY,
          }));
        }
      },
    },
    { target: containerRef, eventOptions: { passive: false } }
  );

  return { bind, draggingSelection };
};
