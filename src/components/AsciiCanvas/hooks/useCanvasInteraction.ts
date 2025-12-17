import { useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { useCreation, useThrottleFn } from "ahooks";
import { screenToGrid } from "../../../utils/math";
import { getBoxPoints, getOrthogonalLinePoints } from "../../../utils/shapes";
import type { Point, SelectionArea } from "../../../types";
import type { CanvasState } from "../../../store/canvasStore";
import { forceHistorySave } from "../../../lib/yjs-setup";
import bresenham from "bresenham";

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
    selections,
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
        const pointsWithChar = points.map((p) => ({
          ...p,
          char: brushChar,
        }));
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
        // 平移判定：中键(button 1) 或 Ctrl/Meta键按下
        const isMiddleClick = mouseEvent.button === 1;
        const isCtrlPan = mouseEvent.ctrlKey || mouseEvent.metaKey;
        const isPanStart = isMiddleClick || isCtrlPan;

        if (isPanStart) {
          isPanningRef.current = true;
          document.body.style.cursor = "grabbing";
          return;
        }

        const isLeftClick = mouseEvent.button === 0;
        // 多选判定：Shift键
        const isMultiSelect = mouseEvent.shiftKey;
        const rect = containerRef.current?.getBoundingClientRect();

        if (isLeftClick && rect) {
          const start = screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );

          if (tool === "select") {
            event.preventDefault();
            if (!isMultiSelect) clearSelections();
            setDraggingSelection({ start, end: start });
            dragStartGrid.current = start;
            setTextCursor(null);
            return;
          }

          if (tool === "fill") {
            if (selections.length > 0) fillSelections();
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
        // 持续检测平移状态
        const isPanGesture =
          mouseEvent.buttons === 4 || mouseEvent.ctrlKey || mouseEvent.metaKey;

        if (isPanningRef.current || isPanGesture) {
          setOffset((prev) => ({
            x: prev.x + dx,
            y: prev.y + dy,
          }));
          return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && dragStartGrid.current) {
          const currentGrid = screenToGrid(
            x - rect.left,
            y - rect.top,
            offset.x,
            offset.y,
            zoom
          );

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
              setTextCursor(start);
              setDraggingSelection(null);
            } else {
              addSelection(draggingSelection);
              setDraggingSelection(null);
            }
          } else if (tool !== "fill" && tool !== "eraser") {
            // Brush, Line, Box: 提交草稿
            // 注意：commitScratch 内部我们已经加了 forceHistorySave()
            commitScratch();
          } else if (tool === "eraser") {
            // Eraser: 实时擦除结束，强制封存历史记录
            // 避免连续擦除被合并，或与后续操作混淆
            forceHistorySave();
          }
          dragStartGrid.current = null;
          lastGrid.current = null;
          lineAxisRef.current = null;
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

  return { bind, draggingSelection };
};
