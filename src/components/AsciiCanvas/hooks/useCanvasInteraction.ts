import { useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { useEventListener, useThrottleFn, useCreation } from "ahooks";
import { screenToGrid } from "../../../utils/math";
import { getBoxPoints, getLinePoints } from "../../../utils/shapes";
import type { Point, SelectionArea } from "../../../types";
import type { CanvasState } from "../../../store/canvasStore";

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

  const [draggingSelection, setDraggingSelection] =
    useState<SelectionArea | null>(null);
  const [isSpacePanning, setIsSpacePanning] = useState(false);

  useEventListener(
    "keydown",
    (e) => {
      if (e.key === " " && document.activeElement === document.body) {
        e.preventDefault();
        setIsSpacePanning(true);
      }
    },
    { target: window }
  );

  useEventListener(
    "keyup",
    (e) => {
      if (e.key === " ") {
        e.preventDefault();
        setIsSpacePanning(false);
      }
    },
    { target: window }
  );

  const handleDrawing = useCreation(
    () => (currentGrid: Point) => {
      if (!lastGrid.current) return;
      const points = getLinePoints(lastGrid.current, currentGrid);

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

        if (isLeftClick && !isMiddleClickPan && !isSpacePanning && rect) {
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

          if (tool === "select") {
            if (!isMultiSelect) {
              clearSelections();
            }

            setDraggingSelection({ start, end: start });
            dragStartGrid.current = start;
            return;
          }

          if (tool === "fill") {
            if (selections.length > 0) {
              fillSelections();
            }
            return;
          }

          clearSelections();

          dragStartGrid.current = start;
          lastGrid.current = start;

          if (tool === "brush") {
            addScratchPoints([{ ...start, char: brushChar }]);
          } else if (tool === "eraser") {
            erasePoints([start]);
          }
        }
      },
      onDrag: ({ delta: [dx, dy], xy: [x, y], event }) => {
        const mouseEvent = event as MouseEvent;
        if (tool === "text" && !isSpacePanning) return;

        const isPan = mouseEvent.buttons === 4 || isSpacePanning;

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
        if (tool === "text" && !isSpacePanning) return;

        const isLeftClick = (event as MouseEvent).button === 0;
        const isMiddleClickPan = (event as MouseEvent).buttons === 4;

        if (isLeftClick && !isMiddleClickPan && !isSpacePanning) {
          if (tool === "select" && draggingSelection) {
            addSelection(draggingSelection);
            setDraggingSelection(null);
          } else if (tool !== "fill" && tool !== "eraser") {
            commitScratch();
          }
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

  return { bind, draggingSelection, isSpacePanning };
};
