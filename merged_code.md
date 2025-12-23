```src/components/AsciiCanvas/index.tsx
import { useRef, useMemo, useEffect } from "react";
import { useSize, useEventListener } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { GridManager } from "../../utils/grid";
import { isCtrlOrMeta } from "../../utils/event";
import { Minimap } from "./Minimap";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Copy, Scissors, Trash2, Clipboard } from "lucide-react";

interface AsciiCanvasProps {
  onUndo: () => void;
  onRedo: () => void;
}

export const AsciiCanvas = ({ onUndo, onRedo }: AsciiCanvasProps) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposing = useRef(false);

  const size = useSize(containerRef);
  const store = useCanvasStore();
  const {
    textCursor,
    writeTextString,
    backspaceText,
    newlineText,
    indentText,
    moveTextCursor,
    setTextCursor,
    selections,
    deleteSelection,
    grid,
    erasePoints,
    copySelectionToClipboard,
    cutSelectionToClipboard,
  } = store;

  const { draggingSelection } = useCanvasInteraction(store, containerRef);

  useCanvasRenderer(
    {
      bg: bgCanvasRef,
      scratch: scratchCanvasRef,
      ui: uiCanvasRef,
    },
    size,
    store,
    draggingSelection
  );

  useEffect(() => {
    const shouldFocus = textCursor || selections.length > 0;
    if (shouldFocus && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } else if (textareaRef.current && !shouldFocus) {
      textareaRef.current.blur();
    }
  }, [textCursor, selections.length]);

  const handleCopy = (e?: ClipboardEvent) => {
    if (selections.length > 0) {
      e?.preventDefault();
      copySelectionToClipboard();
      return;
    }
    if (textCursor) {
      e?.preventDefault();
      const key = GridManager.toKey(textCursor.x, textCursor.y);
      const cell = grid.get(key);
      const char = cell?.char || " ";
      navigator.clipboard.writeText(char);
    }
  };
  useEventListener("copy", handleCopy);

  const handleCut = (e?: ClipboardEvent) => {
    if (selections.length > 0) {
      e?.preventDefault();
      cutSelectionToClipboard();
      return;
    }
    if (textCursor) {
      e?.preventDefault();
      const key = GridManager.toKey(textCursor.x, textCursor.y);
      const cell = grid.get(key);
      const char = cell?.char || " ";
      navigator.clipboard.writeText(char).then(() => {
        erasePoints([textCursor]);
      });
    }
  };
  useEventListener("cut", handleCut);

  const performPaste = (text: string) => {
    let pasteStartPos = textCursor;
    if (!pasteStartPos && selections.length > 0) {
      const firstSelection = selections[0];
      pasteStartPos = {
        x: Math.min(firstSelection.start.x, firstSelection.end.x),
        y: Math.min(firstSelection.start.y, firstSelection.end.y),
      };
    }
    if (pasteStartPos) {
      writeTextString(text, pasteStartPos);
    } else {
      const centerX = Math.floor(
        (-store.offset.x + (size?.width || 0) / 2) / (10 * store.zoom)
      );
      const centerY = Math.floor(
        (-store.offset.y + (size?.height || 0) / 2) / (20 * store.zoom)
      );
      writeTextString(text, { x: centerX, y: centerY });
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    const activeTag = document.activeElement?.tagName.toLowerCase();
    if (activeTag === "input" || activeTag === "textarea") {
      return;
    }

    if (isComposing.current) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text");
    if (text) performPaste(text);
  };
  useEventListener("paste", handlePaste);

  const handleMenuPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) performPaste(text);
    } catch (err) {
      console.error("Failed to read clipboard", err);
    }
  };

  const textareaStyle: React.CSSProperties = useMemo(() => {
    if ((!textCursor && selections.length === 0) || !size)
      return { display: "none" };

    let targetX = 0;
    let targetY = 0;

    if (textCursor) {
      const pos = GridManager.gridToScreen(
        textCursor.x,
        textCursor.y,
        store.offset.x,
        store.offset.y,
        store.zoom
      );
      targetX = pos.x;
      targetY = pos.y;
    } else if (selections.length > 0) {
      const sel = selections[0];
      const pos = GridManager.gridToScreen(
        sel.start.x,
        sel.start.y,
        store.offset.x,
        store.offset.y,
        store.zoom
      );
      targetX = pos.x;
      targetY = pos.y;
    }

    return {
      position: "absolute",
      left: `${targetX}px`,
      top: `${targetY}px`,
      width: "1px",
      height: "1px",
      opacity: 0,
      pointerEvents: "none",
      zIndex: -1,
    };
  }, [textCursor, selections, store.offset, store.zoom, size]);

  const handleCompositionStart = () => {
    isComposing.current = true;
  };
  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>
  ) => {
    isComposing.current = false;
    const value = e.data;
    if (value) {
      writeTextString(value);
      if (textareaRef.current) textareaRef.current.value = "";
    }
  };
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing.current) return;
    const textarea = e.currentTarget;
    const value = textarea.value;
    if (value) {
      writeTextString(value);
      textarea.value = "";
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (isComposing.current) return;
    const isUndo =
      isCtrlOrMeta(e) && !e.shiftKey && e.key.toLowerCase() === "z";
    const isRedo =
      (isCtrlOrMeta(e) && e.shiftKey && e.key.toLowerCase() === "z") ||
      (isCtrlOrMeta(e) && e.key.toLowerCase() === "y");
    if (isUndo) {
      e.preventDefault();
      onUndo();
      return;
    }
    if (isRedo) {
      e.preventDefault();
      onRedo();
      return;
    }

    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selections.length > 0
    ) {
      e.preventDefault();
      deleteSelection();
      return;
    }

    if (e.key === "Backspace") {
      if (textCursor) {
        e.preventDefault();
        backspaceText();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      newlineText();
    } else if (e.key === "Tab") {
      e.preventDefault();
      indentText();
    } else if (e.key.startsWith("Arrow") && textCursor) {
      e.preventDefault();
      const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      moveTextCursor(dx, dy);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTextCursor(null);
    }
  };

  const canvasClassName =
    "absolute inset-0 w-full h-full block pointer-events-none";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          style={{ touchAction: "none" }}
          className="relative w-screen h-screen overflow-hidden bg-background touch-none select-none cursor-default"
        >
          <canvas ref={bgCanvasRef} className={canvasClassName} />
          <canvas ref={scratchCanvasRef} className={canvasClassName} />
          <canvas ref={uiCanvasRef} className={canvasClassName} />

          <Minimap containerSize={size} />

          <textarea
            ref={textareaRef}
            style={textareaStyle}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={() => handleCopy()}
          disabled={!textCursor && selections.length === 0}
        >
          <Copy className="mr-2 size-4" />
          <span>Copy Zone</span>
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleCut()}
          disabled={!textCursor && selections.length === 0}
        >
          <Scissors className="mr-2 size-4" />
          <span>Cut Zone</span>
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleMenuPaste}>
          <Clipboard className="mr-2 size-4" />
          <span>Paste Lot</span>
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => deleteSelection()}
          className="text-destructive focus:text-destructive"
          disabled={selections.length === 0}
        >
          <Trash2 className="mr-2 size-4" />
          <span>Demolish (Delete)</span>
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
```
---
```src/components/AsciiCanvas/Minimap.tsx
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
  const { grid, offset, zoom, setOffset } = useCanvasStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid || grid.size === 0 || !containerSize) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.body);
    const mutedColor = style.getPropertyValue("--muted-foreground").trim();
    const primaryColor = style.getPropertyValue("--primary").trim();

    const { minX, maxX, minY, maxY } = GridManager.getGridBounds(grid);
    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;

    const scale = Math.min(
      (MINIMAP_SIZE - PADDING * 2) / contentWidth,
      (MINIMAP_SIZE - PADDING * 2) / contentHeight
    );

    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    ctx.fillStyle = `oklch(from ${primaryColor} l c h / 0.3)`;
    GridManager.iterate(grid, (_, x, y) => {
      const px = (x - minX) * scale + PADDING;
      const py = (y - minY) * scale + PADDING;
      ctx.fillRect(px, py, Math.max(scale * 0.8, 1), Math.max(scale * 0.8, 1));
    });

    const viewGridStartX = -offset.x / (CELL_WIDTH * zoom);
    const viewGridStartY = -offset.y / (CELL_HEIGHT * zoom);
    const viewGridWidth = containerSize.width / (CELL_WIDTH * zoom);
    const viewGridHeight = containerSize.height / (CELL_HEIGHT * zoom);

    const vx = (viewGridStartX - minX) * scale + PADDING;
    const vy = (viewGridStartY - minY) * scale + PADDING;
    const vw = viewGridWidth * scale;
    const vh = viewGridHeight * scale;

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
```
---
```src/components/AsciiCanvas/hooks/useCanvasInteraction.ts
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
```
---
```src/components/AsciiCanvas/hooks/useCanvasRenderer.ts
import { useEffect } from "react";
import {
  BACKGROUND_COLOR,
  CELL_HEIGHT,
  CELL_WIDTH,
  COLOR_ORIGIN_MARKER,
  COLOR_SELECTION_BG,
  COLOR_TEXT_CURSOR_BG,
  COLOR_TEXT_CURSOR_FG,
  FONT_SIZE,
  GRID_COLOR,
} from "../../../lib/constants";
import { type CanvasState } from "../../../store/canvasStore";
import { GridManager } from "../../../utils/grid";
import type { SelectionArea, GridMap, Point } from "../../../types";
import { getSelectionBounds } from "../../../utils/selection";

interface LayerRefs {
  bg: React.RefObject<HTMLCanvasElement | null>;
  scratch: React.RefObject<HTMLCanvasElement | null>;
  ui: React.RefObject<HTMLCanvasElement | null>;
}

export const useCanvasRenderer = (
  layers: LayerRefs,
  size: { width: number; height: number } | undefined,
  store: CanvasState,
  draggingSelection: SelectionArea | null
) => {
  const {
    offset,
    zoom,
    grid,
    scratchLayer,
    textCursor,
    selections,
    showGrid,
    hoveredGrid,
    tool,
  } = store;

  const drawLayer = (
    ctx: CanvasRenderingContext2D,
    targetGrid: GridMap | null,
    viewBounds: ReturnType<typeof GridManager.getViewportGridBounds>,
    zoom: number,
    offset: Point
  ) => {
    if (!targetGrid || targetGrid.size === 0) return;

    const sw = CELL_WIDTH * zoom;
    const sh = CELL_HEIGHT * zoom;
    ctx.font = `${FONT_SIZE * zoom}px 'Maple Mono NF CN', monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    for (let y = viewBounds.startY; y <= viewBounds.endY; y++) {
      for (let x = viewBounds.startX; x <= viewBounds.endX; x++) {
        const cell = targetGrid.get(GridManager.toKey(x, y));
        if (!cell || cell.char === " ") continue;

        const pos = GridManager.gridToScreen(x, y, offset.x, offset.y, zoom);
        const wide = GridManager.isWideChar(cell.char);
        ctx.fillStyle = cell.color;
        ctx.fillText(
          cell.char,
          Math.round(pos.x + (wide ? sw : sw / 2)),
          Math.round(pos.y + sh / 2)
        );
      }
    }
  };

  useEffect(() => {
    const render = () => {
      if (!size || size.width === 0 || size.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const sw = CELL_WIDTH * zoom;
      const sh = CELL_HEIGHT * zoom;
      const viewBounds = GridManager.getViewportGridBounds(
        size.width,
        size.height,
        offset.x,
        offset.y,
        zoom
      );

      const bgCtx = layers.bg.current?.getContext("2d", { alpha: false });
      if (bgCtx) {
        layers.bg.current!.width = size.width * dpr;
        layers.bg.current!.height = size.height * dpr;
        bgCtx.scale(dpr, dpr);
        bgCtx.fillStyle = BACKGROUND_COLOR;
        bgCtx.fillRect(0, 0, size.width, size.height);

        if (showGrid) {
          bgCtx.beginPath();
          bgCtx.strokeStyle = GRID_COLOR;
          bgCtx.lineWidth = 1;
          for (let x = viewBounds.startX; x <= viewBounds.endX; x++) {
            const posX = Math.round(x * sw + offset.x);
            bgCtx.moveTo(posX, 0);
            bgCtx.lineTo(posX, size.height);
          }
          for (let y = viewBounds.startY; y <= viewBounds.endY; y++) {
            const posY = Math.round(y * sh + offset.y);
            bgCtx.moveTo(0, posY);
            bgCtx.lineTo(size.width, posY);
          }
          bgCtx.stroke();
        }
        drawLayer(bgCtx, grid, viewBounds, zoom, offset);
      }

      const scratchCtx = layers.scratch.current?.getContext("2d");
      if (scratchCtx) {
        layers.scratch.current!.width = size.width * dpr;
        layers.scratch.current!.height = size.height * dpr;
        scratchCtx.scale(dpr, dpr);
        drawLayer(scratchCtx, scratchLayer, viewBounds, zoom, offset);
      }

      const uiCtx = layers.ui.current?.getContext("2d");
      if (uiCtx) {
        layers.ui.current!.width = size.width * dpr;
        layers.ui.current!.height = size.height * dpr;
        uiCtx.scale(dpr, dpr);

        const drawSel = (area: SelectionArea) => {
          const { minX, minY, maxX, maxY } = getSelectionBounds(area);
          const pos = GridManager.gridToScreen(
            minX,
            minY,
            offset.x,
            offset.y,
            zoom
          );
          uiCtx.fillStyle = COLOR_SELECTION_BG;
          uiCtx.fillRect(
            Math.round(pos.x),
            Math.round(pos.y),
            Math.round((maxX - minX + 1) * sw),
            Math.round((maxY - minY + 1) * sh)
          );
        };
        selections.forEach(drawSel);
        if (draggingSelection) drawSel(draggingSelection);

        if (tool === "eraser" && hoveredGrid) {
          const pos = GridManager.gridToScreen(
            hoveredGrid.x,
            hoveredGrid.y,
            offset.x,
            offset.y,
            zoom
          );
          uiCtx.fillStyle = "rgba(239, 68, 68, 0.3)";
          uiCtx.fillRect(
            Math.round(pos.x),
            Math.round(pos.y),
            Math.round(sw),
            Math.round(sh)
          );
        }

        if (textCursor) {
          const pos = GridManager.gridToScreen(
            textCursor.x,
            textCursor.y,
            offset.x,
            offset.y,
            zoom
          );
          const cell = grid.get(GridManager.toKey(textCursor.x, textCursor.y));
          const wide = cell ? GridManager.isWideChar(cell.char) : false;
          uiCtx.fillStyle = COLOR_TEXT_CURSOR_BG;
          uiCtx.fillRect(
            Math.round(pos.x),
            Math.round(pos.y),
            Math.round(wide ? sw * 2 : sw),
            Math.round(sh)
          );
          if (cell) {
            uiCtx.font = `${FONT_SIZE * zoom}px 'Maple Mono NF CN', monospace`;
            uiCtx.textAlign = "center";
            uiCtx.textBaseline = "middle";
            uiCtx.fillStyle = COLOR_TEXT_CURSOR_FG;
            uiCtx.fillText(
              cell.char,
              Math.round(pos.x + (wide ? sw : sw / 2)),
              Math.round(pos.y + sh / 2)
            );
          }
        }

        uiCtx.fillStyle = COLOR_ORIGIN_MARKER;
        const originX = Math.round(offset.x);
        const originY = Math.round(offset.y);
        uiCtx.fillRect(originX - 1, originY - 10, 2, 20);
        uiCtx.fillRect(originX - 10, originY - 1, 20, 2);
      }
    };

    const requestId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestId);
  }, [
    offset,
    zoom,
    size,
    grid,
    scratchLayer,
    textCursor,
    selections,
    draggingSelection,
    showGrid,
    hoveredGrid,
    tool,
    layers,
  ]);
};
```
---
```src/utils/event.ts
export const isCtrlOrMeta = (event: { ctrlKey: boolean; metaKey: boolean }) => {
  return event.ctrlKey || event.metaKey;
};
```
---
```src/utils/export.ts
import {
  EXPORT_PADDING,
  CELL_WIDTH,
  CELL_HEIGHT,
  FONT_SIZE,
  BACKGROUND_COLOR,
  GRID_COLOR,
} from "../lib/constants";
import type { GridMap, SelectionArea } from "../types";
import { GridManager } from "./grid";
import { getSelectionsBoundingBox } from "./selection";

const generateStringFromBounds = (
  grid: GridMap,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): string => {
  const lines: string[] = [];

  for (let y = minY; y <= maxY; y++) {
    let line = "";
    for (let x = minX; x <= maxX; x++) {
      const cell = grid.get(GridManager.toKey(x, y));
      if (cell) {
        line += cell.char;
        if (GridManager.getCharWidth(cell.char) === 2) x++;
      } else {
        line += " ";
      }
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
};

export const exportToString = (grid: GridMap) => {
  if (grid.size === 0) return "";
  const { minX, maxX, minY, maxY } = GridManager.getGridBounds(grid);

  return generateStringFromBounds(
    grid,
    minX - EXPORT_PADDING,
    maxX + EXPORT_PADDING,
    minY - EXPORT_PADDING,
    maxY + EXPORT_PADDING
  );
};

export const exportSelectionToString = (
  grid: GridMap,
  selections: SelectionArea[]
) => {
  if (selections.length === 0) return "";
  const { minX, maxX, minY, maxY } = getSelectionsBoundingBox(selections);
  return generateStringFromBounds(grid, minX, maxX, minY, maxY);
};

export const exportToPNG = (grid: GridMap, showGrid: boolean = false) => {
  if (grid.size === 0) return;

  const { minX, maxX, minY, maxY } = GridManager.getGridBounds(grid);
  const padding = 2;
  const width = (maxX - minX + 1 + padding * 2) * CELL_WIDTH;
  const height = (maxY - minY + 1 + padding * 2) * CELL_HEIGHT;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  if (showGrid) {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    const gridWidth = maxX - minX + 1 + padding * 2;
    const gridHeight = maxY - minY + 1 + padding * 2;
    for (let x = 0; x <= gridWidth; x++) {
      ctx.moveTo(x * CELL_WIDTH, 0);
      ctx.lineTo(x * CELL_WIDTH, height);
    }
    for (let y = 0; y <= gridHeight; y++) {
      ctx.moveTo(0, y * CELL_HEIGHT);
      ctx.lineTo(width, y * CELL_HEIGHT);
    }
    ctx.stroke();
  }

  ctx.font = `${FONT_SIZE}px 'Maple Mono NF CN', monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  GridManager.iterate(grid, (cell, x, y) => {
    const drawX = (x - minX + padding) * CELL_WIDTH;
    const drawY = (y - minY + padding) * CELL_HEIGHT;
    const wide = GridManager.isWideChar(cell.char);

    ctx.fillStyle = cell.color;
    ctx.fillText(
      cell.char,
      drawX + (wide ? CELL_WIDTH : CELL_WIDTH / 2),
      drawY + CELL_HEIGHT / 2
    );
  });

  const link = document.createElement("a");
  link.download = `ascii-city-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
```
---
```src/utils/grid.ts
import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";
import type { Point, GridMap } from "../types";

export const GridManager = {
  screenToGrid(
    screenX: number,
    screenY: number,
    offsetX: number,
    offsetY: number,
    zoom: number
  ): Point {
    return {
      x: Math.floor((screenX - offsetX) / (CELL_WIDTH * zoom)),
      y: Math.floor((screenY - offsetY) / (CELL_HEIGHT * zoom)),
    };
  },

  gridToScreen(
    gridX: number,
    gridY: number,
    offsetX: number,
    offsetY: number,
    zoom: number
  ): Point {
    return {
      x: gridX * CELL_WIDTH * zoom + offsetX,
      y: gridY * CELL_HEIGHT * zoom + offsetY,
    };
  },

  toKey(x: number, y: number): string {
    return `${x},${y}`;
  },

  fromKey(key: string): Point {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  },

  iterate<T>(
    container: { forEach: (cb: (value: T, key: string) => void) => void },
    callback: (value: T, x: number, y: number) => void
  ): void {
    container.forEach((value, key) => {
      const { x, y } = this.fromKey(key);
      callback(value, x, y);
    });
  },

  getCharWidth(char: string): number {
    if (!char) return 1;

    const codePoint = char.codePointAt(0) || 0;

    if (codePoint < 128) return 1;

    if (/\p{Emoji_Presentation}/u.test(char)) return 2;

    if (
      (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
      (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
      (codePoint >= 0x100000 && codePoint <= 0x10fffd)
    ) {
      return 2;
    }

    if (
      (codePoint >= 0x2e80 && codePoint <= 0x9fff) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xff00 && codePoint <= 0xffef)
    ) {
      return 2;
    }

    return 1;
  },

  isWideChar(char: string): boolean {
    return this.getCharWidth(char) === 2;
  },

  snapToCharStart(pos: Point, grid: GridMap): Point {
    const cellBefore = grid.get(this.toKey(pos.x - 1, pos.y));
    if (cellBefore && this.isWideChar(cellBefore.char)) {
      return { ...pos, x: pos.x - 1 };
    }
    return pos;
  },

  getGridBounds(grid: GridMap) {
    if (grid.size === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    this.iterate(grid, (cell, x, y) => {
      const width = this.getCharWidth(cell.char);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width - 1);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    return { minX, maxX, minY, maxY };
  },

  getViewportGridBounds(
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
    zoom: number
  ) {
    const sw = CELL_WIDTH * zoom;
    const sh = CELL_HEIGHT * zoom;
    return {
      startX: Math.floor(-offsetX / sw),
      endX: Math.ceil((width - offsetX) / sw),
      startY: Math.floor(-offsetY / sh),
      endY: Math.ceil((height - offsetY) / sh),
    };
  },
};
```
---
```src/utils/selection.ts
import type { SelectionArea } from "../types";

export const getSelectionBounds = (area: SelectionArea) => {
  const minX = Math.min(area.start.x, area.end.x);
  const maxX = Math.max(area.start.x, area.end.x);
  const minY = Math.min(area.start.y, area.end.y);
  const maxY = Math.max(area.start.y, area.end.y);
  return { minX, maxX, minY, maxY };
};

export const getSelectionsBoundingBox = (selections: SelectionArea[]) => {
  if (selections.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  selections.forEach((area) => {
    minX = Math.min(minX, area.start.x, area.end.x);
    maxX = Math.max(maxX, area.start.x, area.end.x);
    minY = Math.min(minY, area.start.y, area.end.y);
    maxY = Math.max(maxY, area.start.y, area.end.y);
  });

  return { minX, maxX, minY, maxY };
};
```
---
```src/utils/shapes.ts
import { BOX_CHARS } from "../lib/constants";
import type { Point, GridPoint } from "../types";

function resolvePointChars(points: Point[]): GridPoint[] {
  return points.map((p, i) => {
    const prev = points[i - 1];
    const next = points[i + 1];

    if (!prev && !next) return { ...p, char: BOX_CHARS.CROSS };

    const dIn = prev ? `${p.x - prev.x},${p.y - prev.y}` : null;
    const dOut = next ? `${next.x - p.x},${next.y - p.y}` : null;

    const isH = (d: string | null) => d === "1,0" || d === "-1,0";
    const isV = (d: string | null) => d === "0,1" || d === "0,-1";

    if ((isH(dIn) || !dIn) && (isH(dOut) || !dOut)) {
      return { ...p, char: BOX_CHARS.HORIZONTAL };
    }
    if ((isV(dIn) || !dIn) && (isV(dOut) || !dOut)) {
      return { ...p, char: BOX_CHARS.VERTICAL };
    }

    const combined = `${dIn}|${dOut}`;
    let char = BOX_CHARS.CROSS;

    switch (combined) {
      case "0,-1|1,0":
      case "-1,0|0,1":
        char = BOX_CHARS.TOP_LEFT;
        break;

      case "0,-1|-1,0":
      case "1,0|0,1":
        char = BOX_CHARS.TOP_RIGHT;
        break;

      case "0,1|1,0":
      case "-1,0|0,-1":
        char = BOX_CHARS.BOTTOM_LEFT;
        break;
      case "0,1|-1,0":
      case "1,0|0,-1":
        char = BOX_CHARS.BOTTOM_RIGHT;
        break;
    }

    return { ...p, char };
  });
}

export function getLShapeLinePoints(
  start: Point,
  end: Point,
  isVerticalFirst: boolean
): GridPoint[] {
  const points: Point[] = [];
  const junction = isVerticalFirst
    ? { x: start.x, y: end.y }
    : { x: end.x, y: start.y };

  const drawLine = (p1: Point, p2: Point) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const stepX = dx === 0 ? 0 : dx / adx;
    const stepY = dy === 0 ? 0 : dy / ady;
    const steps = Math.max(adx, ady);

    for (let i = 0; i <= steps; i++) {
      points.push({ x: p1.x + i * stepX, y: p1.y + i * stepY });
    }
  };

  drawLine(start, junction);
  points.pop();
  drawLine(junction, end);

  const uniquePoints: Point[] = [];
  const seen = new Set();
  points.forEach((p) => {
    const key = `${p.x},${p.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePoints.push(p);
    }
  });

  return resolvePointChars(uniquePoints);
}

export function getStepLinePoints(start: Point, end: Point): GridPoint[] {
  const points: Point[] = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;

  points.push({ x, y });
  while (x !== end.x || y !== end.y) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
      points.push({ x, y });
    }
    if (x === end.x && y === end.y) break;
    if (e2 < dx) {
      err += dx;
      y += sy;
      points.push({ x, y });
    }
  }
  return resolvePointChars(points);
}

export function getBoxPoints(start: Point, end: Point): GridPoint[] {
  const points: GridPoint[] = [];
  const x1 = Math.min(start.x, end.x);
  const x2 = Math.max(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const y2 = Math.max(start.y, end.y);

  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
      if (x === x1 || x === x2 || y === y1 || y === y2) {
        let char = "";
        if (x === x1 && y === y1) char = BOX_CHARS.TOP_LEFT;
        else if (x === x2 && y === y1) char = BOX_CHARS.TOP_RIGHT;
        else if (x === x1 && y === y2) char = BOX_CHARS.BOTTOM_LEFT;
        else if (x === x2 && y === y2) char = BOX_CHARS.BOTTOM_RIGHT;
        else if (y === y1 || y === y2) char = BOX_CHARS.HORIZONTAL;
        else char = BOX_CHARS.VERTICAL;
        points.push({ x, y, char });
      }
    }
  }
  return points;
}

export function getCirclePoints(center: Point, edge: Point): GridPoint[] {
  const dx = edge.x - center.x;
  const dy = edge.y - center.y;
  const radius = Math.sqrt(dx * dx + dy * 2 * (dy * 2)) * 2;

  if (radius < 1) return [{ x: center.x, y: center.y, char: "·" }];

  const result: GridPoint[] = [];
  const minX = Math.floor(center.x - radius / 2) - 1;
  const maxX = Math.ceil(center.x + radius / 2) + 1;
  const minY = Math.floor(center.y - radius / 4) - 1;
  const maxY = Math.ceil(center.y + radius / 4) + 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let brailleCode = 0;

      const dotMap = [
        [0, 0, 0x01],
        [0, 1, 0x02],
        [0, 2, 0x04],
        [1, 0, 0x08],
        [1, 1, 0x10],
        [1, 2, 0x20],
        [0, 3, 0x40],
        [1, 3, 0x80],
      ];

      dotMap.forEach(([dx_sub, dy_sub, bit]) => {
        const subX = x * 2 + dx_sub;
        const subY = y * 4 + dy_sub;
        const centerX_sub = center.x * 2;
        const centerY_sub = center.y * 4;

        const dist = Math.sqrt(
          Math.pow(subX - centerX_sub, 2) + Math.pow(subY - centerY_sub, 2)
        );

        if (Math.abs(dist - radius) < 0.8) {
          brailleCode |= bit;
        }
      });

      if (brailleCode > 0) {
        result.push({
          x,
          y,
          char: String.fromCharCode(0x2800 + brailleCode),
        });
      }
    }
  }

  return result;
}
```
---
```src/lib/constants.ts
export const CELL_WIDTH = 10;
export const CELL_HEIGHT = 20;

export const GRID_COLOR = "#e5e7eb";
export const BACKGROUND_COLOR = "#ffffff";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

export const FONT_SIZE = 15;
export const COLOR_PRIMARY_TEXT = "#000000";
export const COLOR_TEXT_CURSOR_BG = "rgba(0, 0, 0, 0.5)";
export const COLOR_TEXT_CURSOR_FG = "#ffffff";
export const COLOR_ORIGIN_MARKER = "red";

export const COLOR_SELECTION_BG = "rgba(0, 0, 0, 0.2)";

export const EXPORT_PADDING = 1;

export const BOX_CHARS = {
  TOP_LEFT: "╭",
  TOP_RIGHT: "╮",
  BOTTOM_LEFT: "╰",
  BOTTOM_RIGHT: "╯",
  HORIZONTAL: "─",
  VERTICAL: "│",
  CROSS: "┼",
};

export const PALETTE = [
  "#000000", // Black
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#64748b", // Slate
];
```
---
```src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
---
```src/lib/yjs-setup.ts
import * as Y from "yjs";
import type { GridCell } from "../types";

const yDoc = new Y.Doc();

export const yMainGrid = yDoc.getMap<GridCell>("main-grid");

export const undoManager = new Y.UndoManager([yMainGrid], {
  captureTimeout: 500,
  trackedOrigins: new Set([null]),
});

export const forceHistorySave = () => {
  undoManager.stopCapturing();
};

export const transactWithHistory = (
  fn: () => void,
  shouldSaveHistory = true
) => {
  yDoc.transact(() => {
    fn();
  });
  if (shouldSaveHistory) {
    forceHistorySave();
  }
};
```
---
```src/store/canvasStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MIN_ZOOM, MAX_ZOOM, COLOR_PRIMARY_TEXT } from "../lib/constants";
import { yMainGrid, transactWithHistory } from "../lib/yjs-setup";
import type { CanvasState } from "./interfaces";
import type { GridCell } from "../types";
import {
  createDrawingSlice,
  createTextSlice,
  createSelectionSlice,
} from "./slices";

export type { CanvasState };

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get, ...a) => {
      yMainGrid.observe(() => {
        const compositeGrid = new Map<string, GridCell>();
        yMainGrid.forEach((value, key) => {
          compositeGrid.set(key, value as GridCell);
        });
        set({ grid: compositeGrid });
      });

      return {
        offset: { x: 0, y: 0 },
        zoom: 1,
        grid: new Map(),
        tool: "select",
        brushChar: "#",
        brushColor: COLOR_PRIMARY_TEXT,
        showGrid: true,
        exportShowGrid: false,
        hoveredGrid: null,

        setOffset: (updater) =>
          set((state) => ({ offset: updater(state.offset) })),
        setZoom: (updater) =>
          set((state) => ({
            zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
          })),
        setTool: (tool) => set({ tool, textCursor: null, hoveredGrid: null }),
        setBrushChar: (char) => set({ brushChar: char }),
        setBrushColor: (color) => set({ brushColor: color }),
        setShowGrid: (show) => set({ showGrid: show }),
        setExportShowGrid: (show) => set({ exportShowGrid: show }),
        setHoveredGrid: (pos) => set({ hoveredGrid: pos }),

        ...createDrawingSlice(set, get, ...a),
        ...createTextSlice(set, get, ...a),
        ...createSelectionSlice(set, get, ...a),
      };
    },
    {
      name: "ascii-canvas-persistence",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        offset: state.offset,
        zoom: state.zoom,
        brushChar: state.brushChar,
        brushColor: state.brushColor,
        showGrid: state.showGrid,
        exportShowGrid: state.exportShowGrid,
        grid: Array.from(state.grid.entries()),
      }),
      onRehydrateStorage: () => {
        return (hydratedState, error) => {
          if (error || !hydratedState) return;
          const hState = hydratedState as CanvasState;
          if (Array.isArray(hState.grid)) {
            const recoveredMap = new Map<string, GridCell>(
              hState.grid as unknown as [string, GridCell][]
            );
            hState.grid = recoveredMap;
            transactWithHistory(() => {
              yMainGrid.clear();
              recoveredMap.forEach((val, key) => yMainGrid.set(key, val));
            }, false);
          }
        };
      },
    }
  )
);
```
---
```src/store/interfaces.ts
import type {
  GridMap,
  GridPoint,
  Point,
  SelectionArea,
  ToolType,
} from "../types";

export interface DrawingSlice {
  scratchLayer: GridMap | null;
  setScratchLayer: (points: GridPoint[]) => void;
  addScratchPoints: (points: GridPoint[]) => void;
  commitScratch: () => void;
  clearScratch: () => void;
  clearCanvas: () => void;
  erasePoints: (points: Point[]) => void;
  updateScratchForShape: (
    tool: ToolType,
    start: Point,
    end: Point,
    options?: { axis?: "vertical" | "horizontal" | null }
  ) => void;
}

export interface TextSlice {
  textCursor: Point | null;
  setTextCursor: (pos: Point | null) => void;
  writeTextString: (str: string, startPos?: Point) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;
  indentText: () => void;
}

export interface SelectionSlice {
  selections: SelectionArea[];
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  deleteSelection: () => void;
  copySelectionToClipboard: () => void;
  cutSelectionToClipboard: () => void;
  fillSelectionsWithChar: (char: string) => void;
}

export type CanvasState = {
  offset: Point;
  zoom: number;
  tool: ToolType;
  brushChar: string;
  brushColor: string;
  grid: GridMap;
  showGrid: boolean;
  exportShowGrid: boolean;
  hoveredGrid: Point | null;

  setOffset: (updater: (prev: Point) => Point) => void;
  setZoom: (updater: (prev: number) => number) => void;
  setTool: (tool: ToolType) => void;
  setBrushChar: (char: string) => void;
  setBrushColor: (color: string) => void;
  setShowGrid: (show: boolean) => void;
  setExportShowGrid: (show: boolean) => void;
  setHoveredGrid: (pos: Point | null) => void;
} & DrawingSlice &
  TextSlice &
  SelectionSlice;
```
---
```src/store/utils.ts
import * as Y from "yjs";
import { GridManager } from "../utils/grid";
import type { GridCell } from "../types";

export const placeCharInMap = (
  targetMap: {
    set(key: string, value: GridCell): void;
    delete(key: string): void;
    get(key: string): GridCell | undefined;
  },
  x: number,
  y: number,
  char: string,
  color: string
) => {
  if (!char) return;

  const leftKey = GridManager.toKey(x - 1, y);
  const leftCell = targetMap.get(leftKey);
  if (leftCell && GridManager.isWideChar(leftCell.char)) {
    targetMap.delete(leftKey);
  }

  targetMap.set(GridManager.toKey(x, y), { char, color });

  if (GridManager.isWideChar(char)) {
    const rightKey = GridManager.toKey(x + 1, y);
    targetMap.delete(rightKey);
  }
};

export const placeCharInYMap = (
  targetGrid: Y.Map<GridCell>,
  x: number,
  y: number,
  char: string,
  color: string
) => {
  if (!char) return;

  const leftKey = GridManager.toKey(x - 1, y);
  const leftCell = targetGrid.get(leftKey);
  if (leftCell && GridManager.isWideChar(leftCell.char)) {
    targetGrid.delete(leftKey);
  }

  targetGrid.set(GridManager.toKey(x, y), { char, color });

  if (GridManager.isWideChar(char)) {
    const rightKey = GridManager.toKey(x + 1, y);
    targetGrid.delete(rightKey);
  }
};
```
---
```src/store/slices/drawingSlice.ts
import type { StateCreator } from "zustand";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import type { GridPoint, GridCell } from "../../types";
import { placeCharInMap, placeCharInYMap } from "../utils";
import {
  getBoxPoints,
  getCirclePoints,
  getLShapeLinePoints,
  getStepLinePoints,
} from "../../utils/shapes";

export const createDrawingSlice: StateCreator<
  CanvasState,
  [],
  [],
  DrawingSlice
> = (set, get) => ({
  scratchLayer: null,

  setScratchLayer: (points) => {
    const { brushColor } = get();
    const layer = new Map();
    points.forEach((p) => {
      placeCharInMap(layer, p.x, p.y, p.char, p.color || brushColor);
    });
    set({ scratchLayer: layer });
  },

  addScratchPoints: (points) => {
    const { brushColor } = get();
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      points.forEach((p) => {
        placeCharInMap(layer, p.x, p.y, p.char, p.color || brushColor);
      });
      return { scratchLayer: layer };
    });
  },

  updateScratchForShape: (tool, start, end, options) => {
    let points: GridPoint[] = [];
    const color = get().brushColor;
    switch (tool) {
      case "box":
        points = getBoxPoints(start, end);
        break;
      case "circle":
        points = getCirclePoints(start, end);
        break;
      case "stepline":
        points = getStepLinePoints(start, end);
        break;
      case "line": {
        const isVerticalFirst = options?.axis === "vertical";
        points = getLShapeLinePoints(start, end, isVerticalFirst);
        break;
      }
    }
    const coloredPoints = points.map((p) => ({ ...p, color }));
    get().setScratchLayer(coloredPoints);
  },

  commitScratch: () => {
    const { scratchLayer } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;
    transactWithHistory(() => {
      GridManager.iterate(scratchLayer, (cell, x, y) => {
        placeCharInYMap(yMainGrid, x, y, cell.char, cell.color);
      });
    });
    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),
  clearCanvas: () => transactWithHistory(() => yMainGrid.clear()),

  erasePoints: (points) => {
    transactWithHistory(() => {
      points.forEach((p) => {
        const key = GridManager.toKey(p.x, p.y);
        const cell = yMainGrid.get(key) as GridCell | undefined;
        if (!cell) {
          const leftKey = GridManager.toKey(p.x - 1, p.y);
          const leftCell = yMainGrid.get(leftKey) as GridCell | undefined;
          if (leftCell && GridManager.isWideChar(leftCell.char)) {
            yMainGrid.delete(leftKey);
          }
        }
        yMainGrid.delete(key);
      });
    });
  },
});
```
---
```src/store/slices/index.ts
export { createDrawingSlice } from "./drawingSlice";
export { createTextSlice } from "./textSlice";
export { createSelectionSlice } from "./selectionSlice";
```
---
```src/store/slices/selectionSlice.ts
import type { StateCreator } from "zustand";
import type { CanvasState, SelectionSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getSelectionBounds } from "../../utils/selection";
import { exportSelectionToString } from "../../utils/export";
import { placeCharInYMap } from "../utils";

export const createSelectionSlice: StateCreator<
  CanvasState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selections: [],
  addSelection: (area) => set((s) => ({ selections: [...s.selections, area] })),
  clearSelections: () => set({ selections: [] }),

  deleteSelection: () => {
    const { selections } = get();
    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            yMainGrid.delete(GridManager.toKey(x, y));
          }
        }
      });
    });
  },

  copySelectionToClipboard: () => {
    const { grid, selections } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy text: ", err);
    });
  },

  cutSelectionToClipboard: () => {
    const { grid, selections, deleteSelection } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        deleteSelection();
      })
      .catch((err) => {
        console.error("Failed to cut text: ", err);
      });
  },

  fillSelectionsWithChar: (char) => {
    const { selections, brushColor } = get();
    if (selections.length === 0) return;

    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            placeCharInYMap(yMainGrid, x, y, char, brushColor);
          }
        }
      });
    });
  },
});
```
---
```src/store/slices/textSlice.ts
import type { StateCreator } from "zustand";
import type { CanvasState, TextSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { placeCharInYMap } from "../utils";

export const createTextSlice: StateCreator<CanvasState, [], [], TextSlice> = (
  set,
  get
) => ({
  textCursor: null,
  setTextCursor: (pos) => set({ textCursor: pos, selections: [] }),

  writeTextString: (str, startPos) => {
    const { selections, fillSelectionsWithChar, textCursor, brushColor } =
      get();

    if (selections.length > 0) {
      const fillChar = str.charAt(0);
      if (fillChar) {
        fillSelectionsWithChar(fillChar);
        return;
      }
    }

    const cursor = startPos || textCursor;
    if (!cursor) return;

    let currentX = cursor.x;
    let currentY = cursor.y;
    const startX = cursor.x;

    transactWithHistory(() => {
      for (const char of str) {
        if (char === "\n") {
          currentY++;
          currentX = startX;
          continue;
        }
        placeCharInYMap(yMainGrid, currentX, currentY, char, brushColor);
        currentX += GridManager.getCharWidth(char);
      }
    });
    set({ textCursor: { x: currentX, y: currentY } });
  },

  moveTextCursor: (dx, dy) => {
    const { textCursor, grid } = get();
    if (!textCursor) return;
    let newX = textCursor.x;
    const newY = textCursor.y + dy;
    if (dx > 0) {
      const cell = grid.get(GridManager.toKey(newX, textCursor.y));
      newX += GridManager.getCharWidth(cell?.char || " ");
    } else if (dx < 0) {
      const leftKey = GridManager.toKey(newX - 1, textCursor.y);
      const leftCell = grid.get(leftKey);
      if (!leftCell) {
        const farLeftCell = grid.get(GridManager.toKey(newX - 2, textCursor.y));
        newX -= farLeftCell && GridManager.isWideChar(farLeftCell.char) ? 2 : 1;
      } else {
        newX -= 1;
      }
    }
    set({ textCursor: { x: newX, y: newY } });
  },

  backspaceText: () => {
    const { textCursor, grid } = get();
    if (!textCursor) return;
    transactWithHistory(() => {
      const { x, y } = textCursor;
      let deletePos = { x: x - 1, y };
      const cellAtMinus1 = grid.get(GridManager.toKey(x - 1, y));
      const cellAtMinus2 = grid.get(GridManager.toKey(x - 2, y));
      if (
        !cellAtMinus1 &&
        cellAtMinus2 &&
        GridManager.isWideChar(cellAtMinus2.char)
      ) {
        deletePos = { x: x - 2, y };
      }
      yMainGrid.delete(GridManager.toKey(deletePos.x, deletePos.y));
      set({ textCursor: deletePos });
    });
  },

  newlineText: () => {
    const { textCursor, grid } = get();
    if (!textCursor) return;

    const currentY = textCursor.y;
    const currentX = textCursor.x;

    let minLineX = currentX;
    grid.forEach((_, key) => {
      const { x, y } = GridManager.fromKey(key);
      if (y === currentY) {
        minLineX = Math.min(minLineX, x);
      }
    });

    let leadingSpaces = 0;
    for (let x = minLineX; x < currentX; x++) {
      const cell = grid.get(GridManager.toKey(x, currentY));
      if (!cell || cell.char === " ") {
        leadingSpaces++;
      } else {
        break;
      }
    }
    const targetX = minLineX + leadingSpaces;
    set({ textCursor: { x: targetX, y: currentY + 1 } });
  },

  indentText: () => {
    const { textCursor } = get();
    if (!textCursor) return;
    set({ textCursor: { x: textCursor.x + 2, y: textCursor.y } });
  },
});
```
---
```src/types/index.ts
export interface Point {
  x: number;
  y: number;
}

export interface GridCell {
  char: string;
  color: string;
}

export interface GridPoint extends Point {
  char: string;
  color?: string;
}

export interface SelectionArea {
  start: Point;
  end: Point;
}

export type GridMap = Map<string, GridCell>;

export type ToolType =
  | "select"
  | "brush"
  | "eraser"
  | "box"
  | "line"
  | "stepline"
  | "circle"
  | "text";
```
---
```src/App.tsx
import { toast } from "sonner";
import { useKeyPress, useLocalStorageState } from "ahooks";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/ToolBar/dock";
import { undoManager } from "./lib/yjs-setup";
import { isCtrlOrMeta } from "./utils/event";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { Suspense, lazy } from "react";

const SidebarRight = lazy(() =>
  import("./components/ToolBar/sidebar-right").then((module) => ({
    default: module.SidebarRight,
  }))
);

export default function App() {
  const {
    tool,
    grid,
    setTool,
    fillSelectionsWithChar,
    copySelectionToClipboard,
    cutSelectionToClipboard,
  } = useCanvasStore();

  const [isRightPanelOpen, setIsRightPanelOpen] = useLocalStorageState<boolean>(
    "ui-right-panel-status",
    { defaultValue: true }
  );

  const handleUndo = () => {
    undoManager.undo();
    toast.dismiss();
  };

  const handleRedo = () => {
    undoManager.redo();
  };

  useKeyPress(["meta.z", "ctrl.z"], (e) => {
    e.preventDefault();
    handleUndo();
  });

  useKeyPress(["meta.shift.z", "ctrl.shift.z", "meta.y", "ctrl.y"], (e) => {
    e.preventDefault();
    handleRedo();
  });

  useKeyPress(["meta.c", "ctrl.c"], (e) => {
    e.preventDefault();
    copySelectionToClipboard();
  });

  useKeyPress(["meta.x", "ctrl.x"], (e) => {
    e.preventDefault();
    cutSelectionToClipboard();
  });

  useKeyPress(
    (event) => !isCtrlOrMeta(event) && !event.altKey && event.key.length === 1,
    (event) => {
      const { selections, textCursor } = useCanvasStore.getState();
      if (selections.length > 0 && !textCursor) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          event.preventDefault();
          fillSelectionsWithChar(event.key);
        }
      }
    },
    {
      events: ["keydown"],
    }
  );

  const handleExport = () => {
    const text = exportToString(grid);
    if (!text) {
      toast.warning("Canvas is empty!", {
        description: "Draw something before exporting.",
      });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!", {
        description: `${text.length} characters ready to paste.`,
      });
    });
  };

  return (
    <SidebarProvider className="flex h-full w-full overflow-hidden">
      <SidebarInset className="relative flex flex-1 flex-col overflow-hidden">
        <AppLayout
          canvas={<AsciiCanvas onUndo={handleUndo} onRedo={handleRedo} />}
        >
          <Toolbar
            tool={tool}
            setTool={setTool}
            onUndo={handleUndo}
            onExport={handleExport}
          />
        </AppLayout>

        <div className="absolute top-0 right-0 h-full pointer-events-none z-50">
          <SidebarProvider
            open={isRightPanelOpen}
            onOpenChange={setIsRightPanelOpen}
            className="h-full items-end"
          >
            <Suspense fallback={<div className="w-0" />}>
              <SidebarRight />
            </Suspense>
          </SidebarProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```
---
```README.md
[English] | [简体中文](./README.zh-CN.md)

# ASCII Canvas

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Framework-React_18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Collaboration](https://img.shields.io/badge/Sync-Yjs_CRDT-orange?logo=distributed-systems)](https://yjs.dev/)
[![Deploy](https://img.shields.io/badge/Demo-Live_Preview-22c55e?logo=cloudflare-pages)](https://ascii-canvas.pages.dev/)

> **"The native visual interface for the LLM era: An infinite, multi-byte ASCII canvas designed to be the shared whiteboard for Humans and AI."**

<br />

<p align="center">
  <img src="public/Cover.png" alt="ASCII Canvas Cover" width="100%" style="border-radius: 8px; border: 1px solid #333; box-shadow: 0 8px 30px rgba(0,0,0,0.12);">
</p>

<p align="center">
  <a href="https://ascii-canvas.pages.dev/">
    <img src="https://img.shields.io/badge/✨_Try_Live_Demo-Click_Here-22c55e?style=for-the-badge&logo=rocket" height="40">
  </a>
</p>

---

## 🛠 Core Features

**ASCII Canvas** is a high-performance, collaborative ASCII art creation engine. Unlike traditional whiteboards that output pixels (opaque to LLMs), this engine renders structured, semantic Unicode grids.

### 1. High-Performance Rendering

- **Multi-layer Architecture**: Utilizes three distinct layers (Background, Scratch, and UI) to maintain 60FPS.
- **Infinite Viewport**: Integrated screen-to-grid mapping for seamless panning and zooming.

### 2. Intelligent Layout Engine

- **Setback Inheritance**: Smart newline logic automatically detects and maintains indentation.
- **Wide-Character Support**: Native support for **CJK characters**, **Nerd Fonts**, and **Emojis**.
- **Modular Indentation**: Professional Tab system shifting cursor by 2 grid units.

### 3. Distributed Collaboration

- **Yjs CRDT Integration**: Real-time, low-latency collaborative editing.
- **Robust Persistence**: High-granularity undo/redo management with local storage sync.

### 4. Precision Editing Tools

- **Anchor Zoning**: `Shift + Click` for rapid rectangular selection.
- **Mass Fill**: Instantly fill active selections with any character.
- **Context Hub**: Professional menu for Copy, Cut, Paste, and Demolish operations.

---

## ✨ Showcase

<div align="center">
  <img src="public/Case/Case1.webp" width="48%" style="border-radius: 6px; border: 1px solid #333; margin: 5px;" />
  <img src="public/Case/Case2.webp" width="48%" style="border-radius: 6px; border: 1px solid #333; margin: 5px;" />
</div>
<div align="center">
  <img src="public/Case/Case3.webp" width="32%" style="border-radius: 6px; border: 1px solid #333; margin: 3px;" />
  <img src="public/Case/Case4.webp" width="32%" style="border-radius: 6px; border: 1px solid #333; margin: 3px;" />
  <img src="public/Case/Case5.webp" width="32%" style="border-radius: 6px; border: 1px solid #333; margin: 3px;" />
</div>

---

## 🏗 Tech Stack

- **Frontend**: React 18, TypeScript
- **State Management**: Zustand (Slice Pattern)
- **Synchronization**: Yjs / Y-IndexedDB
- **Gestures**: @use-gesture/react
- **UI Components**: Tailwind CSS, Shadcn UI, Radix UI

---

## 🚀 Getting Started

### Installation

```bash
git clone https://github.com/Sayhi-bzb/ascii-canvas.git
cd ascii-canvas
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## ⌨️ Shortcuts Reference

| Action            | Shortcut        | Description                                       |
| :---------------- | :-------------- | :------------------------------------------------ |
| **Zoning**        | `Drag`          | Traditional rectangular area selection            |
| **Anchor Zoning** | `Shift + Click` | Create selection between anchor and current point |
| **Mass Fill**     | `Char Key`      | Fill active selection with the pressed character  |
| **Smart Newline** | `Enter`         | New line with inherited indentation               |
| **Pave Space**    | `Tab`           | Shift cursor right by 2 grid units                |
| **Context Menu**  | `Right Click`   | Access Copy, Cut, Paste, and Delete commands      |

---

## 🗺 Roadmap

- [x] Multi-layer Canvas rendering engine.
- [x] Real-time collaboration via Yjs.
- [x] Intelligent Indentation & Tab system.
- [x] Context Menu & Clipboard integration.
- [ ] **NES (Next Edit Suggestion)**: Predictive character placement based on layout patterns.
- [ ] **AI Chat Integration**: Natural language interface for generating canvas components.
- [ ] ANSI Sequence & SVG Export support.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
```
