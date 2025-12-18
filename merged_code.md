```src/components/AsciiCanvas/index.tsx
import { useRef, useMemo, useEffect } from "react";
import { useSize, useEventListener } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { gridToScreen, toKey } from "../../utils/math";
import { toast } from "sonner";
import { isCtrlOrMeta } from "../../utils/event";

interface AsciiCanvasProps {
  onUndo: () => void;
  onRedo: () => void;
}

export const AsciiCanvas = ({ onUndo, onRedo }: AsciiCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  useCanvasRenderer(canvasRef, size, store, draggingSelection);

  useEffect(() => {
    if (textCursor && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } else if (textareaRef.current) {
      textareaRef.current.blur();
    }
  }, [textCursor]);

  const handleCopy = (e: ClipboardEvent) => {
    if (selections.length > 0) {
      e.preventDefault();
      copySelectionToClipboard();
      return;
    }

    if (textCursor) {
      e.preventDefault();
      const key = toKey(textCursor.x, textCursor.y);
      const char = grid.get(key) || " ";
      navigator.clipboard.writeText(char).then(() => {
        toast.success("Copied Char!", {
          description: `Character '${char}' copied.`,
        });
      });
    }
  };
  useEventListener("copy", handleCopy);

  const handleCut = (e: ClipboardEvent) => {
    if (selections.length > 0) {
      e.preventDefault();
      cutSelectionToClipboard();
      return;
    }

    if (textCursor) {
      e.preventDefault();
      const key = toKey(textCursor.x, textCursor.y);
      const char = grid.get(key) || " ";
      navigator.clipboard.writeText(char).then(() => {
        erasePoints([textCursor]);
        toast.success("Cut Char!", {
          description: "Character moved to clipboard.",
        });
      });
    }
  };
  useEventListener("cut", handleCut);

  const handlePaste = (e: ClipboardEvent) => {
    if (isComposing.current) return;

    e.preventDefault();
    const text = e.clipboardData?.getData("text");
    if (!text) return;

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
      toast.success("Pasted!", {
        description: "Content inserted from clipboard.",
      });
    } else {
      toast.warning("Where to paste?", {
        description: "Please select an area or click to place cursor first.",
      });
    }
  };
  useEventListener("paste", handlePaste);

  const textareaStyle: React.CSSProperties = useMemo(() => {
    if (!textCursor || !size) return { display: "none" };

    const { x, y } = gridToScreen(
      textCursor.x,
      textCursor.y,
      store.offset.x,
      store.offset.y,
      store.zoom
    );

    return {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: "1px",
      height: "1px",
      opacity: 0,
      pointerEvents: "none",
      zIndex: -1,
    };
  }, [textCursor, store.offset, store.zoom, size]);

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

    if (e.key === "Delete") {
      if (selections.length > 0) {
        e.preventDefault();
        deleteSelection();
        return;
      }
    }

    if (e.key === "Backspace") {
      if (selections.length > 0 && !textCursor) {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if (textCursor) {
        e.preventDefault();
        backspaceText();
      }
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
      e.preventDefault();
      setTextCursor(null);
    }
  };

  useEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag !== "input" &&
        activeTag !== "textarea" &&
        selections.length > 0
      ) {
        e.preventDefault();
        deleteSelection();
      }
    }
  });

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className="w-full h-full overflow-hidden bg-gray-50 touch-none select-none cursor-default"
    >
      <canvas ref={canvasRef} />
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
  );
};
```
---
```src/components/AsciiCanvas/hooks/useCanvasInteraction.ts
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
```
---
```src/components/AsciiCanvas/hooks/useCanvasRenderer.ts
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
import { gridToScreen, toKey } from "../../../utils/math";
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
    const endCol = startCol + Math.ceil(size.width / scaledCellW) + 1;
    const startRow = Math.floor(-offset.y / scaledCellH);
    const endRow = startRow + Math.ceil(size.height / scaledCellH) + 1;

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

    ctx.font = `${FONT_SIZE * zoom}px 'Maple Mono NF CN', monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const renderLayer = (layer: Map<string, string>, color: string) => {
      ctx.fillStyle = color;
      for (let y = startRow; y <= endRow; y++) {
        for (let x = startCol; x <= endCol; x++) {
          const char = layer.get(toKey(x, y));
          if (!char || char === " ") continue;

          const screenPos = gridToScreen(x, y, offset.x, offset.y, zoom);
          const wide = isWideChar(char);
          const centerX = screenPos.x + (wide ? scaledCellW : scaledCellW / 2);
          const centerY = screenPos.y + scaledCellH / 2;

          ctx.fillText(char, centerX, centerY);

          if (wide) {
            x++;
          }
        }
      }
    };

    renderLayer(grid, COLOR_PRIMARY_TEXT);
    if (scratchLayer) renderLayer(scratchLayer, COLOR_SCRATCH_LAYER);

    const renderSelection = (area: SelectionArea) => {
      const { minX, minY, maxX, maxY } = getSelectionBounds(area);

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
      const screenPos = gridToScreen(x, y, offset.x, offset.y, zoom);
      const charUnderCursor = grid.get(toKey(x, y));
      const wide = charUnderCursor ? isWideChar(charUnderCursor) : false;
      const cursorWidth = wide ? scaledCellW * 2 : scaledCellW;

      ctx.fillStyle = COLOR_TEXT_CURSOR_BG;
      ctx.fillRect(screenPos.x, screenPos.y, cursorWidth, scaledCellH);

      if (charUnderCursor) {
        ctx.fillStyle = COLOR_TEXT_CURSOR_FG;
        const centerX = screenPos.x + (wide ? scaledCellW : scaledCellW / 2);
        ctx.fillText(charUnderCursor, centerX, screenPos.y + scaledCellH / 2);
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
    selections,
    draggingSelection,
    canvasRef,
  ]);
};
```
---
```src/components/ToolBar/sidebar-left.tsx
import * as React from "react";
import { Layers, Component, Book, ChevronRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      side="left"
      className="absolute left-0 top-0 z-40 border-r"
      {...props}
    >
      <SidebarHeader className="h-14 border-b justify-center px-4">
        <div className="text-sm font-semibold tracking-tight">ASCII Studio</div>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarMenu className="p-2">
          <SidebarMenuItem>
            <SidebarMenuButton isActive tooltip="Manage layers">
              <Layers className="h-4 w-4" />
              <span>Layers</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Reusable assets">
              <Component className="h-4 w-4" />
              <span>Assets</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Document pages">
              <Book className="h-4 w-4" />
              <span>Pages</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        <Collapsible defaultOpen className="px-2 mt-2">
          <CollapsibleTrigger asChild>
            <div className="flex w-full items-center justify-between p-2 cursor-pointer hover:bg-muted/50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Page 1
                </span>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="py-1 pl-4">
            <div className="flex flex-col gap-0.5 text-sm">
              <div className="rounded-md px-2 py-1.5 hover:bg-muted cursor-default">
                Background Layer
              </div>
              <div className="rounded-md bg-accent px-2 py-1.5 text-accent-foreground cursor-default font-medium">
                Active Canvas
              </div>
              <div className="rounded-md px-2 py-1.5 hover:bg-muted cursor-default">
                Annotation Overlay
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
```
---
```src/components/ToolBar/sidebar-right.tsx
import * as React from "react";
import { X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar } = useSidebar();
  const hasSelection = false;

  return (
    <Sidebar
      collapsible="offcanvas"
      side="right"
      className="absolute right-0 top-0 z-40 border-l bg-sidebar pointer-events-auto"
      {...props}
    >
      <SidebarHeader className="h-14 border-b flex flex-row items-center justify-between px-4">
        <div className="text-sm font-semibold tracking-tight">Properties</div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-2"
          onClick={toggleSidebar}
        >
          <X className="h-4 w-4" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="p-4 overflow-x-hidden">
        {hasSelection ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                Layout
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="pos-x"
                    className="text-[10px] text-muted-foreground uppercase"
                  >
                    X
                  </Label>
                  <Input
                    id="pos-x"
                    defaultValue="120"
                    className="h-8 text-xs px-2"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="pos-y"
                    className="text-[10px] text-muted-foreground uppercase"
                  >
                    Y
                  </Label>
                  <Input
                    id="pos-y"
                    defaultValue="80"
                    className="h-8 text-xs px-2"
                  />
                </div>
              </div>
            </div>

            <SidebarSeparator className="mx-0" />

            <div className="grid gap-4">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                Appearance
              </div>
              <div className="grid gap-1.5">
                <Label
                  htmlFor="char-content"
                  className="text-[10px] text-muted-foreground uppercase"
                >
                  Character
                </Label>
                <Input
                  id="char-content"
                  defaultValue="#"
                  className="h-8 text-xs px-2"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-center gap-2 text-muted-foreground/60">
            <div className="p-3 border-2 border-dashed rounded-lg">
              <div className="size-8 rounded bg-muted/50" />
            </div>
            <p className="text-xs font-medium">Select an object</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
```
---
```src/components/ToolBar/site-header.tsx
import { SidebarIcon, Settings2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "../ui/breadcrumb";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { useSidebar } from "../ui/sidebar";

interface SiteHeaderProps {
  onToggleRight: () => void;
  isRightOpen: boolean;
}

export function SiteHeader({ onToggleRight, isRightOpen }: SiteHeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b justify-between pr-4">
      <div className="flex h-[--header-height] w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1">
                ASCII Art Canvas
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <Button
        variant={isRightOpen ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={onToggleRight}
        title="Toggle Properties"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </header>
  );
}
```
---
```src/components/ToolBar/Toolbar.tsx
import React from "react";
import {
  File,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Undo2,
  Eraser,
  PaintBucket,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Button } from "../ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "../ui/button-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import type { ToolType } from "../../types";

interface ToolButtonProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
}

interface ActionButtonProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface FileButtonProps {
  onExport: () => void;
  onClear: () => void;
}

export const Toolbar = ({
  tool,
  setTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onClear,
}: ToolButtonProps & ActionButtonProps & FileButtonProps) => {
  const tools: { name: ToolType; label: string; icon: React.ElementType }[] = [
    {
      name: "select",
      label: "Select",
      icon: MousePointer2,
    },
    { name: "fill", label: "Fill Selection", icon: PaintBucket },
    { name: "brush", label: "Brush", icon: Pencil },
    { name: "line", label: "Line", icon: Minus },
    { name: "box", label: "Box", icon: Square },

    { name: "eraser", label: "Eraser", icon: Eraser },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <ButtonGroup className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-1.5">
          <ButtonGroup>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <File size={20} />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>File</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="top" align="start" className="mb-2">
                <DropdownMenuItem onClick={onExport}>
                  <p>Export</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-red-500 focus:text-red-500 focus:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Clear</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Canvas?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete all your artwork on the canvas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onClear}
                        className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                      >
                        Yes, Clear it
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

          <ButtonGroupSeparator />

          <ButtonGroup>
            {tools.map((t) => (
              <Tooltip key={t.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant={tool === t.name ? "default" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setTool(t.name)}
                  >
                    <t.icon size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </ButtonGroup>

          <ButtonGroupSeparator />

          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo</p>
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </ButtonGroup>
      </div>
    </TooltipProvider>
  );
};
```
---
```src/hooks/use-mobile.ts
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
```
---
```src/types/index.ts
import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export type GridMap = Map<string, string>;
export type ToolType = "select" | "fill" | "brush" | "eraser" | "box" | "line";
export type Point = z.infer<typeof PointSchema>;
export type SelectionArea = z.infer<typeof SelectionAreaSchema>;
export type GridPoint = Point & {
  char: string;
};
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
export const COLOR_SCRATCH_LAYER = "#3b82f6";
export const COLOR_TEXT_CURSOR_BG = "rgba(0, 0, 0, 0.5)";
export const COLOR_TEXT_CURSOR_FG = "#ffffff";
export const COLOR_ORIGIN_MARKER = "red";

export const COLOR_SELECTION_BG = "rgba(0, 0, 0, 0.2)";
export const COLOR_SELECTION_BORDER = "transparent";

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

const yDoc = new Y.Doc();

export const yGrid = yDoc.getMap<string>("grid");

export const undoManager = new Y.UndoManager(yGrid, {
  captureTimeout: 500,
  trackedOrigins: new Set([null]),
});

export const performTransaction = (fn: () => void) => {
  yDoc.transact(() => {
    fn();
  });
};

export const forceHistorySave = () => {
  undoManager.stopCapturing();
};
```
---
```src/store/canvasStore.ts
import { create } from "zustand";
import { toast } from "sonner";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { toKey } from "../utils/math";
import { isWideChar } from "../utils/char";
import type {
  Point,
  GridPoint,
  ToolType,
  SelectionArea,
  GridMap,
} from "../types";
import { yGrid, performTransaction, forceHistorySave } from "../lib/yjs-setup";
import { getSelectionBounds } from "../utils/selection";
import { exportSelectionToString } from "../utils/export";

export interface CanvasState {
  offset: Point;
  zoom: number;
  tool: ToolType;
  brushChar: string;
  textCursor: Point | null;
  selections: SelectionArea[];
  scratchLayer: GridMap | null;
  grid: GridMap;

  setOffset: (updater: (prev: Point) => Point) => void;
  setZoom: (updater: (prev: number) => number) => void;
  setTool: (tool: ToolType) => void;
  setBrushChar: (char: string) => void;
  setScratchLayer: (points: GridPoint[]) => void;
  addScratchPoints: (points: GridPoint[]) => void;
  commitScratch: () => void;
  clearScratch: () => void;
  clearCanvas: () => void;
  setTextCursor: (pos: Point | null) => void;
  writeTextString: (str: string, startPos?: Point) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  deleteSelection: () => void;
  fillSelections: () => void;
  fillSelectionsWithChar: (char: string) => void;
  erasePoints: (points: Point[]) => void;
  copySelectionToClipboard: () => void;
  cutSelectionToClipboard: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => {
  yGrid.observe(() => {
    const newGrid = new Map<string, string>();
    yGrid.forEach((value, key) => {
      newGrid.set(key, value);
    });
    set({ grid: newGrid });
  });

  return {
    offset: { x: 0, y: 0 },
    zoom: 1,
    grid: new Map(),
    scratchLayer: null,
    tool: "select",
    brushChar: "#",
    textCursor: null,
    selections: [],

    setOffset: (updater) => set((state) => ({ offset: updater(state.offset) })),
    setZoom: (updater) =>
      set((state) => ({
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
      })),
    setTool: (tool) => set({ tool, textCursor: null }),
    setBrushChar: (char) => set({ brushChar: char }),
    setScratchLayer: (points) => {
      const layer = new Map<string, string>();
      points.forEach((p) => layer.set(toKey(p.x, p.y), p.char));
      set({ scratchLayer: layer });
    },
    addScratchPoints: (points) => {
      set((state) => {
        const layer = new Map(state.scratchLayer || []);
        points.forEach((p) => layer.set(toKey(p.x, p.y), p.char));
        return { scratchLayer: layer };
      });
    },

    commitScratch: () => {
      const { scratchLayer } = get();
      if (!scratchLayer) return;

      performTransaction(() => {
        scratchLayer.forEach((value, key) => {
          if (value === " ") {
            yGrid.delete(key);
          } else {
            yGrid.set(key, value);
          }
        });
      });

      forceHistorySave();
      set({ scratchLayer: null });
    },

    clearScratch: () => set({ scratchLayer: null }),

    clearCanvas: () => {
      performTransaction(() => {
        yGrid.clear();
      });
      forceHistorySave();
      set({ selections: [] });
    },

    setTextCursor: (pos) => set({ textCursor: pos, selections: [] }),

    writeTextString: (str, startPos) => {
      const { textCursor } = get();
      const cursor = startPos
        ? { ...startPos }
        : textCursor
        ? { ...textCursor }
        : null;
      if (!cursor) return;

      const startX = cursor.x;
      const isPaste = str.length > 1;

      performTransaction(() => {
        for (const char of str) {
          if (char === "\n") {
            cursor.y += 1;
            cursor.x = startX;
            continue;
          }

          const { x, y } = cursor;
          const wide = isWideChar(char);

          yGrid.set(toKey(x, y), char);

          if (wide) {
            yGrid.delete(toKey(x + 1, y));
            cursor.x += 2;
          } else {
            cursor.x += 1;
          }
        }
      });

      if (isPaste) {
        forceHistorySave();
      }

      if (get().textCursor) {
        set({ textCursor: { x: cursor.x, y: cursor.y } });
      }
    },

    moveTextCursor: (dx, dy) => {
      const { textCursor, grid } = get();
      if (!textCursor) return;

      let newX = textCursor.x;
      let newY = textCursor.y;

      if (dy !== 0) {
        newY += dy;
      }

      if (dx > 0) {
        const char = grid.get(toKey(newX, newY));
        newX += char && isWideChar(char) ? 2 : 1;
      } else if (dx < 0) {
        const char = grid.get(toKey(newX - 2, newY));
        newX -= char && isWideChar(char) ? 2 : 1;
      }

      set({ textCursor: { x: newX, y: newY } });
    },

    backspaceText: () => {
      const { textCursor, grid } = get();
      if (!textCursor) return;

      const targetX = textCursor.x;
      const charBefore = grid.get(toKey(targetX - 2, textCursor.y));

      const isPrevWide = charBefore && isWideChar(charBefore);
      const deleteFromX = isPrevWide ? targetX - 2 : targetX - 1;
      const newCursorX = deleteFromX;

      if (deleteFromX < textCursor.x) {
        performTransaction(() => {
          yGrid.delete(toKey(deleteFromX, textCursor.y));

          if (isPrevWide) {
            yGrid.delete(toKey(deleteFromX + 1, textCursor.y));
          }
        });
        set({ textCursor: { x: newCursorX, y: textCursor.y } });
      }
    },

    newlineText: () =>
      set((state) => {
        if (state.textCursor) {
          return {
            textCursor: { ...state.textCursor, y: state.textCursor.y + 1 },
          };
        }
        return {};
      }),

    addSelection: (area) =>
      set((state) => ({ selections: [...state.selections, area] })),
    clearSelections: () => set({ selections: [] }),

    deleteSelection: () => {
      const { selections } = get();
      if (selections.length === 0) return;

      performTransaction(() => {
        selections.forEach((area) => {
          const { minX, maxX, minY, maxY } = getSelectionBounds(area);

          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              yGrid.delete(toKey(x, y));
            }
          }
        });
      });
      forceHistorySave();
    },

    fillSelections: () => {
      const { selections, brushChar } = get();
      if (selections.length === 0) return;
      get().fillSelectionsWithChar(brushChar);
    },

    fillSelectionsWithChar: (char: string) => {
      const { selections } = get();
      if (selections.length === 0) return;

      const wide = isWideChar(char);

      performTransaction(() => {
        selections.forEach((area) => {
          const { minX, maxX, minY, maxY } = getSelectionBounds(area);

          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              yGrid.set(toKey(x, y), char);
              if (wide) {
                if (x + 1 <= maxX) {
                  yGrid.delete(toKey(x + 1, y));
                }
                x++;
              }
            }
          }
        });
      });
      forceHistorySave();
    },

    erasePoints: (points) => {
      performTransaction(() => {
        points.forEach((p) => {
          const char = yGrid.get(toKey(p.x, p.y));
          yGrid.delete(toKey(p.x, p.y));
          if (char && isWideChar(char)) {
            yGrid.delete(toKey(p.x + 1, p.y));
          }
        });
      });
    },

    copySelectionToClipboard: () => {
      const { grid, selections } = get();
      if (selections.length === 0) return;

      const selectedText = exportSelectionToString(grid, selections);
      navigator.clipboard.writeText(selectedText).then(() => {
        toast.success("Copied!", {
          description: "Selection copied to clipboard.",
        });
      });
    },

    cutSelectionToClipboard: () => {
      const { grid, selections, deleteSelection } = get();
      if (selections.length === 0) return;

      const selectedText = exportSelectionToString(grid, selections);
      navigator.clipboard.writeText(selectedText).then(() => {
        deleteSelection();
        toast.success("Cut!", {
          description: "Selection moved to clipboard and deleted.",
        });
      });
    },
  };
});
```
---
```src/App.tsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useKeyPress } from "ahooks";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/ToolBar/Toolbar";
import { undoManager } from "./lib/yjs-setup";
import { isCtrlOrMeta } from "./utils/event";

import { SidebarLeft } from "./components/ToolBar/sidebar-left";
import { SidebarRight } from "./components/ToolBar/sidebar-right";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { SiteHeader } from "./components/ToolBar/site-header";

function App() {
  const {
    tool,
    grid,
    setTool,
    clearCanvas,
    fillSelectionsWithChar,
    copySelectionToClipboard,
    cutSelectionToClipboard,
  } = useCanvasStore();

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  useEffect(() => {
    const updateStackStatus = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };

    undoManager.on("stack-item-added", updateStackStatus);
    undoManager.on("stack-item-popped", updateStackStatus);

    return () => {
      undoManager.off("stack-item-added", updateStackStatus);
      undoManager.off("stack-item-popped", updateStackStatus);
    };
  }, []);

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
        event.preventDefault();
        fillSelectionsWithChar(event.key);
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

  const handleClear = () => {
    clearCanvas();
    toast.success("Canvas Cleared", {
      description: "Start fresh!",
    });
  };

  return (
    <div className="[--header-height:3.5rem] h-full w-full">
      <SidebarProvider className="flex flex-col h-full">
        <SiteHeader
          isRightOpen={isRightPanelOpen}
          onToggleRight={() => setIsRightPanelOpen(!isRightPanelOpen)}
        />
        <div className="flex flex-1 relative overflow-hidden">
          <SidebarLeft />

          <SidebarInset className="h-full w-full">
            <AppLayout
              canvas={<AsciiCanvas onUndo={handleUndo} onRedo={handleRedo} />}
            >
              <Toolbar
                tool={tool}
                setTool={setTool}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                onExport={handleExport}
                onClear={handleClear}
              />
            </AppLayout>
          </SidebarInset>

          <SidebarProvider
            open={isRightPanelOpen}
            onOpenChange={setIsRightPanelOpen}
            className="absolute top-0 right-0 h-full w-auto min-h-0 z-50 pointer-events-none"
          >
            <SidebarRight />
          </SidebarProvider>
        </div>
      </SidebarProvider>
    </div>
  );
}

export default App;
```
---
```src/index.css
/* src/index.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

html,
body,
#root {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: "Maple Mono NF CN";
    font-weight: normal;
  }
}

[data-slot="sidebar-gap"] {
  width: 0 !important;
}

[data-slot="sidebar-container"] {
  position: absolute !important;
  height: 100% !important;
}
```
---
```src/layout.tsx
import React from "react";
import { Toaster } from "./components/ui/sonner";

interface AppLayoutProps {
  canvas: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout = ({ canvas, children }: AppLayoutProps) => {
  return (
    <div className="w-full h-full flex flex-col bg-gray-50 relative overflow-hidden">
      <main className="flex-1 relative z-0">{canvas}</main>

      <Toaster />

      {children}
    </div>
  );
};
```
---
```src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```
---
```src/utils/char.ts
export const isWideChar = (char: string) => {
  return /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ue000-\uf8ff]/.test(char);
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
import { EXPORT_PADDING } from "../lib/constants";
import type { GridMap, SelectionArea } from "../types";
import { isWideChar } from "./char";
import { fromKey, toKey } from "./math";
import { getSelectionsBoundingBox } from "./selection";

export const exportToString = (grid: Map<string, string>) => {
  if (grid.size === 0) return "";

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  grid.forEach((_char, key) => {
    const { x, y } = fromKey(key);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  const lines: string[] = [];

  for (let y = minY - EXPORT_PADDING; y <= maxY + EXPORT_PADDING; y++) {
    let line = "";
    for (let x = minX - EXPORT_PADDING; x <= maxX + EXPORT_PADDING; x++) {
      const char = grid.get(toKey(x, y));
      if (char) {
        line += char;

        if (isWideChar(char)) {
          x++;
        }
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
};

export const exportSelectionToString = (
  grid: GridMap,
  selections: SelectionArea[]
) => {
  if (selections.length === 0) return "";

  const { minX, maxX, minY, maxY } = getSelectionsBoundingBox(selections);

  const lines: string[] = [];

  for (let y = minY; y <= maxY; y++) {
    let line = "";
    for (let x = minX; x <= maxX; x++) {
      const char = grid.get(toKey(x, y));
      if (char) {
        line += char;

        if (isWideChar(char)) {
          x++;
        }
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
};
```
---
```src/utils/grid.ts
import { isWideChar } from "./char";
import { toKey } from "./math";
import type { Point, GridMap } from "../types";

export const snapToCharStart = (pos: Point, grid: GridMap): Point => {
  const charBefore = grid.get(toKey(pos.x - 1, pos.y));
  if (charBefore && isWideChar(charBefore)) {
    return { ...pos, x: pos.x - 1 };
  }
  return pos;
};
```
---
```src/utils/math.ts
import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";

export const screenToGrid = (
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
) => {
  const gridX = Math.floor((screenX - offsetX) / (CELL_WIDTH * zoom));
  const gridY = Math.floor((screenY - offsetY) / (CELL_HEIGHT * zoom));
  return { x: gridX, y: gridY };
};

export const gridToScreen = (
  gridX: number,
  gridY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
) => {
  return {
    x: gridX * CELL_WIDTH * zoom + offsetX,
    y: gridY * CELL_HEIGHT * zoom + offsetY,
  };
};

export const toKey = (x: number, y: number) => `${x},${y}`;

export const fromKey = (key: string) => {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
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
import bresenham from "bresenham";
import { BOX_CHARS } from "../lib/constants";
import type { Point, GridPoint } from "../types";

function getLinePoints(start: Point, end: Point): Point[] {
  const points = bresenham(start.x, start.y, end.x, end.y);
  return points.map(({ x, y }) => ({ x, y }));
}

export function getOrthogonalLinePoints(
  start: Point,
  end: Point,
  isVerticalFirst: boolean
): GridPoint[] {
  const points: GridPoint[] = [];

  if (start.x === end.x) {
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: BOX_CHARS.VERTICAL,
    }));
  }
  if (start.y === end.y) {
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: BOX_CHARS.HORIZONTAL,
    }));
  }

  const junction: Point = isVerticalFirst
    ? { x: start.x, y: end.y }
    : { x: end.x, y: start.y };

  const segment1 = getLinePoints(start, junction);
  segment1.pop();
  points.push(
    ...segment1.map((p) => ({
      ...p,
      char: isVerticalFirst ? BOX_CHARS.VERTICAL : BOX_CHARS.HORIZONTAL,
    }))
  );

  const segment2 = getLinePoints(junction, end);
  segment2.shift();
  points.push(
    ...segment2.map((p) => ({
      ...p,
      char: isVerticalFirst ? BOX_CHARS.HORIZONTAL : BOX_CHARS.VERTICAL,
    }))
  );

  let cornerChar = "";

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (isVerticalFirst) {
    if (dy > 0) {
      cornerChar = dx > 0 ? BOX_CHARS.BOTTOM_LEFT : BOX_CHARS.BOTTOM_RIGHT;
    } else {
      cornerChar = dx > 0 ? BOX_CHARS.TOP_LEFT : BOX_CHARS.TOP_RIGHT;
    }
  } else {
    if (dx > 0) {
      cornerChar = dy > 0 ? BOX_CHARS.TOP_RIGHT : BOX_CHARS.BOTTOM_RIGHT;
    } else {
      cornerChar = dy > 0 ? BOX_CHARS.TOP_LEFT : BOX_CHARS.BOTTOM_LEFT;
    }
  }

  points.push({ ...junction, char: cornerChar });

  return points;
}

export function getBoxPoints(start: Point, end: Point): GridPoint[] {
  const points: GridPoint[] = [];

  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);

  if (left === right || top === bottom) {
    if (left === right && top === bottom)
      return [{ ...start, char: BOX_CHARS.CROSS }];
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: left === right ? BOX_CHARS.VERTICAL : BOX_CHARS.HORIZONTAL,
    }));
  }

  points.push({ x: left, y: top, char: BOX_CHARS.TOP_LEFT });
  points.push({ x: right, y: top, char: BOX_CHARS.TOP_RIGHT });
  points.push({ x: left, y: bottom, char: BOX_CHARS.BOTTOM_LEFT });
  points.push({ x: right, y: bottom, char: BOX_CHARS.BOTTOM_RIGHT });

  for (let x = left + 1; x < right; x++) {
    points.push({ x, y: top, char: BOX_CHARS.HORIZONTAL });
    points.push({ x, y: bottom, char: BOX_CHARS.HORIZONTAL });
  }

  for (let y = top + 1; y < bottom; y++) {
    points.push({ x: left, y, char: BOX_CHARS.VERTICAL });
    points.push({ x: right, y, char: BOX_CHARS.VERTICAL });
  }

  return points;
}
```
