import { useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { useEventListener, useThrottleFn, useCreation } from "ahooks";
import { screenToGrid } from "../../../utils/math";
import { getBoxPoints, getOrthogonalLinePoints } from "../../../utils/shapes";
import type { Point, SelectionArea } from "../../../types";
import type { CanvasState } from "../../../store/canvasStore";
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

  // 新增：用于记录 Line 工具的起始轴向 (锁定垂直优先还是水平优先)
  const lineAxisRef = useRef<"vertical" | "horizontal" | null>(null);

  const [draggingSelection, setDraggingSelection] =
    useState<SelectionArea | null>(null);

  const handleDrawing = useCreation(
    () => (currentGrid: Point) => {
      if (!lastGrid.current) return;
      // 自由绘制（Brush/Eraser）依然使用原始Bresenham
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
        const isLeftClick = (event as MouseEvent).button === 0;
        const isMiddleClickPan = (event as MouseEvent).buttons === 4;
        const isMultiSelect =
          (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey;
        const rect = containerRef.current?.getBoundingClientRect();

        if (isLeftClick && !isMiddleClickPan && rect) {
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

          // 重置 Line 工具的轴向锁定
          lineAxisRef.current = null;

          if (tool === "brush") {
            addScratchPoints([{ ...start, char: brushChar }]);
          } else if (tool === "eraser") {
            erasePoints([start]);
          }
        }
      },
      onDrag: ({ xy: [x, y], event }) => {
        const mouseEvent = event as MouseEvent;
        const isPan = mouseEvent.buttons === 4; // Removed space panning ref

        if (isPan) {
          // Pan logic handled by setOffset outside this hook mostly,
          // or rely on default browser behavior if implemented elsewhere
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
              // --- 智能轴向锁定逻辑 ---
              // 如果还没有确定轴向，根据当前偏移量决定
              if (!lineAxisRef.current) {
                const dx = Math.abs(currentGrid.x - dragStartGrid.current.x);
                const dy = Math.abs(currentGrid.y - dragStartGrid.current.y);

                // 只有当移动距离超过 0 时才锁定，避免误判
                if (dx > 0 || dy > 0) {
                  // 如果 dy > dx，说明用户主要在上下移动 -> 垂直优先
                  // 如果 dx > dy，说明用户主要在左右移动 -> 水平优先
                  lineAxisRef.current = dy > dx ? "vertical" : "horizontal";
                }
              }

              // 如果依然没有锁定（比如原地没动），默认水平优先
              const isVerticalFirst = lineAxisRef.current === "vertical";

              const points = getOrthogonalLinePoints(
                dragStartGrid.current,
                currentGrid,
                isVerticalFirst
              );
              setScratchLayer(points);
            }
          }
        }
      },
      onDragEnd: ({ event }) => {
        const isLeftClick = (event as MouseEvent).button === 0;
        const isMiddleClickPan = (event as MouseEvent).buttons === 4;

        if (isLeftClick && !isMiddleClickPan) {
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
            commitScratch();
          }
          dragStartGrid.current = null;
          lastGrid.current = null;
          lineAxisRef.current = null; // Reset
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
