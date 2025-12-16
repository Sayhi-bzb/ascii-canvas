```src/App.tsx
import React from "react";
import { useStore } from "zustand";
import {
  Download,
  Eraser,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import type { CanvasStoreWithTemporal } from "./types";
import { AppLayout } from "./layout";

interface ToolButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}
const ToolButton = ({
  isActive,
  onClick,
  icon: Icon,
  label,
}: ToolButtonProps) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-md flex flex-col items-center gap-1 transition-all ${
      isActive
        ? "bg-slate-900 text-white shadow-md scale-105"
        : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    }`}
    title={label}
  >
    <Icon size={18} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}
const ActionButton = ({
  onClick,
  icon: Icon,
  label,
  disabled,
}: ActionButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-md flex flex-col items-center gap-1 transition-colors ${
      disabled
        ? "opacity-30 cursor-not-allowed text-slate-400 bg-white"
        : "bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-sm border border-gray-100"
    }`}
    title={label}
  >
    <Icon size={18} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

function App() {
  const { zoom, offset, tool, grid, setTool, clearCanvas } = useCanvasStore();

  const temporalStore = (useCanvasStore as CanvasStoreWithTemporal).temporal;
  const { undo, redo } = temporalStore.getState();
  const pastStates = useStore(temporalStore, (state) => state.pastStates);
  const futureStates = useStore(temporalStore, (state) => state.futureStates);

  const handleExport = () => {
    const text = exportToString(grid);
    if (!text) {
      alert("Canvas is empty!");
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!\n\n" + text);
    });
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
      clearCanvas();
    }
  };

  // 定义各个区域的功能模块
  const toolbar = (
    <div className="flex gap-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50">
      <ToolButton
        isActive={tool === "move"}
        onClick={() => setTool("move")}
        icon={MousePointer2}
        label="Move"
      />
      <div className="w-px bg-gray-200 mx-1 h-8 self-center" />
      <ToolButton
        isActive={tool === "brush"}
        onClick={() => setTool("brush")}
        icon={Pencil}
        label="Brush"
      />
      <ToolButton
        isActive={tool === "line"}
        onClick={() => setTool("line")}
        icon={Minus}
        label="Line"
      />
      <ToolButton
        isActive={tool === "box"}
        onClick={() => setTool("box")}
        icon={Square}
        label="Box"
      />
      <ToolButton
        isActive={tool === "text"}
        onClick={() => setTool("text")}
        icon={Type}
        label="Text"
      />
      <ToolButton
        isActive={tool === "eraser"}
        onClick={() => setTool("eraser")}
        icon={Eraser}
        label="Eraser"
      />
    </div>
  );

  const actionBar = (
    <div className="flex gap-2">
      <div className="flex bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-1.5 gap-1">
        <ActionButton
          onClick={undo}
          disabled={pastStates.length === 0}
          icon={Undo2}
          label="Undo"
        />
        <ActionButton
          onClick={redo}
          disabled={futureStates.length === 0}
          icon={Redo2}
          label="Redo"
        />
      </div>
      <div className="flex bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-1.5 gap-1">
        <ActionButton onClick={handleClear} icon={Trash2} label="Clear" />
        <ActionButton onClick={handleExport} icon={Download} label="Export" />
      </div>
    </div>
  );

  const statusBar = (
    <div className="pointer-events-none select-none font-mono text-xs text-gray-400 bg-white/50 p-2 rounded backdrop-blur-sm">
      Pos: {offset.x.toFixed(0)}, {offset.y.toFixed(0)} | Zoom:{" "}
      {(zoom * 100).toFixed(0)}% <br />
      Objects: {grid.size} <br />
      {tool === "text" && (
        <span className="text-blue-600 font-bold animate-pulse">
          Mode: Text Input (Click to focus)
        </span>
      )}
    </div>
  );

  return (
    <AppLayout
      toolbar={toolbar}
      actionBar={actionBar}
      statusBar={statusBar}
      canvas={<AsciiCanvas />}
    />
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
  }
}
```
---
```src/layout.tsx
import React from "react";

interface AppLayoutProps {
  toolbar: React.ReactNode;
  actionBar: React.ReactNode;
  statusBar: React.ReactNode;
  canvas: React.ReactNode;
}

export const AppLayout = ({
  toolbar,
  actionBar,
  statusBar,
  canvas,
}: AppLayoutProps) => {
  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      <header className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        {toolbar}
      </header>

      <aside className="absolute top-4 right-4 z-20">{actionBar}</aside>

      <main className="flex-1 relative z-0">{canvas}</main>

      <footer className="absolute bottom-4 left-4 z-10">{statusBar}</footer>
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
```src/components/AsciiCanvas.tsx
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
```
---
```src/lib/constants.ts
// src/lib/constants.ts
export const CELL_WIDTH = 10;
export const CELL_HEIGHT = 20;

export const GRID_COLOR = "#e5e7eb";
export const BACKGROUND_COLOR = "#ffffff";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

// === 新增城市设计规范 ===

// 视觉与颜色规范 (Visual & Color Palette)
export const FONT_SIZE = 15;
export const COLOR_PRIMARY_TEXT = "#000000";
export const COLOR_SCRATCH_LAYER = "#3b82f6";
export const COLOR_TEXT_CURSOR_BG = "rgba(0, 0, 0, 0.5)";
export const COLOR_TEXT_CURSOR_FG = "#ffffff";
export const COLOR_ORIGIN_MARKER = "red";

// 功能性规范 (Functional Specifications)
export const UNDO_LIMIT = 100;
export const EXPORT_PADDING = 1;

// 建筑材料字符 (Building Block Characters)
export const BOX_CHARS = {
  TOP_LEFT: "┌",
  TOP_RIGHT: "┐",
  BOTTOM_LEFT: "└",
  BOTTOM_RIGHT: "┘",
  HORIZONTAL: "─",
  VERTICAL: "│",
  CROSS: "+",
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
```src/store/canvasStore.ts
// src/store/canvasStore.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import { enableMapSet } from "immer";
import { MIN_ZOOM, MAX_ZOOM, UNDO_LIMIT } from "../lib/constants";
import { toKey } from "../utils/math";
import type { Point, GridPoint, GridMap, ToolType } from "../types";

enableMapSet();

export interface CanvasState {
  offset: Point;
  zoom: number;
  grid: GridMap;
  scratchLayer: GridMap | null;
  tool: ToolType;
  brushChar: string;
  textCursor: Point | null;

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
  writeTextChar: (char: string) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;
}

export const useCanvasStore = create<CanvasState>()(
  temporal(
    immer((set) => ({
      offset: { x: 0, y: 0 },
      zoom: 1,
      grid: new Map(),
      scratchLayer: null,
      tool: "brush",
      brushChar: "#",
      textCursor: null,

      setOffset: (updater) =>
        set((state) => {
          state.offset = updater(state.offset);
        }),
      setZoom: (updater) =>
        set((state) => {
          state.zoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, updater(state.zoom))
          );
        }),
      setTool: (tool) => set({ tool, textCursor: null }),
      setBrushChar: (char) => set({ brushChar: char }),

      setScratchLayer: (points) =>
        set((state) => {
          state.scratchLayer = new Map();
          points.forEach((p) =>
            state.scratchLayer!.set(toKey(p.x, p.y), p.char)
          );
        }),

      addScratchPoints: (points) =>
        set((state) => {
          if (!state.scratchLayer) state.scratchLayer = new Map();
          points.forEach((p) =>
            state.scratchLayer!.set(toKey(p.x, p.y), p.char)
          );
        }),

      commitScratch: () =>
        set((state) => {
          if (state.scratchLayer) {
            state.scratchLayer.forEach((value, key) => {
              state.grid.set(key, value);
            });
            state.scratchLayer = null;
          }
        }),

      clearScratch: () =>
        set((state) => {
          state.scratchLayer = null;
        }),
      clearCanvas: () =>
        set((state) => {
          state.grid.clear();
        }),

      setTextCursor: (pos) =>
        set((state) => {
          state.textCursor = pos;
        }),

      writeTextChar: (char) =>
        set((state) => {
          if (state.textCursor) {
            const { x, y } = state.textCursor;
            state.grid.set(toKey(x, y), char);
            state.textCursor.x += 1;
          }
        }),

      moveTextCursor: (dx, dy) =>
        set((state) => {
          if (state.textCursor) {
            state.textCursor.x += dx;
            state.textCursor.y += dy;
          }
        }),

      backspaceText: () =>
        set((state) => {
          if (state.textCursor) {
            state.textCursor.x -= 1;
            const { x, y } = state.textCursor;
            state.grid.delete(toKey(x, y));
          }
        }),

      newlineText: () =>
        set((state) => {
          if (state.textCursor) {
            state.textCursor.y += 1;
          }
        }),
    })),
    {
      partialize: (state) => ({ grid: state.grid }),
      limit: UNDO_LIMIT,
    }
  )
);
```
---
```src/types/index.ts
import type { StoreApi, UseBoundStore } from "zustand";
import type { TemporalState } from "zundo";
import type { CanvasState } from "../store/canvasStore";

// -----------------------------------------------------------------------------
// A. 基础定义 (源头)
// -----------------------------------------------------------------------------
export type GridMap = Map<string, string>;
export type ToolType = "brush" | "eraser" | "box" | "line" | "move" | "text";

export type Point = {
  x: number;
  y: number;
};

export type GridPoint = Point & {
  char: string;
};

type TrackedState = {
  grid: GridMap;
};

type TemporalStoreState = TemporalState<TrackedState>;

type TemporalStore = StoreApi<TemporalStoreState>;

export type CanvasStoreWithTemporal = UseBoundStore<StoreApi<CanvasState>> & {
  temporal: TemporalStore;
};
```
---
```src/utils/export.ts
// src/utils/export.ts
import { EXPORT_PADDING } from "../lib/constants";
import { fromKey } from "./math";

export const exportToString = (grid: Map<string, string>) => {
  if (grid.size === 0) return "";

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  grid.forEach((_, key) => {
    const { x, y } = fromKey(key);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const padding = EXPORT_PADDING;
  const width = maxX - minX + 1 + padding * 2;
  const height = maxY - minY + 1 + padding * 2;

  const lines: string[] = [];
  for (let y = 0; y < height; y++) {
    lines.push(" ".repeat(width));
  }

  grid.forEach((char, key) => {
    const { x, y } = fromKey(key);
    const localX = x - minX + padding;
    const localY = y - minY + padding;

    const line = lines[localY];
    lines[localY] =
      line.substring(0, localX) + char + line.substring(localX + 1);
  });

  return lines.join("\n");
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
```src/utils/shapes.ts
// src/utils/shapes.ts
import { BOX_CHARS } from "../lib/constants";
import type { Point, GridPoint } from "../types";

export function getLinePoints(start: Point, end: Point): Point[] {
  const points: Point[] = [];
  let { x: x0, y: y0 } = start;
  const { x: x1, y: y1 } = end;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
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
