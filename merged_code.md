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

export const COLOR_SELECTION_BG = "rgba(59, 130, 246, 0.2)";
export const COLOR_SELECTION_BORDER = "#3b82f6";

export const UNDO_LIMIT = 100;
export const EXPORT_PADDING = 1;

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
import { create, type StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import { enableMapSet } from "immer";
import { MIN_ZOOM, MAX_ZOOM, UNDO_LIMIT } from "../lib/constants";
import { toKey } from "../utils/math";
import {
  PointSchema,
  GridMapSchema,
  ToolTypeSchema,
  SelectionAreaSchema,
} from "../types";
import type { Point, GridPoint, ToolType, SelectionArea } from "../types";
import { z } from "zod";

enableMapSet();

const CanvasStateSchema = z.object({
  offset: PointSchema,
  zoom: z.number(),
  grid: GridMapSchema,
  scratchLayer: GridMapSchema.nullable(),
  tool: ToolTypeSchema,
  brushChar: z.string().max(1),
  textCursor: PointSchema.nullable(),
  selections: z.array(SelectionAreaSchema),
});

type CanvasStateData = z.infer<typeof CanvasStateSchema>;

export interface CanvasState extends CanvasStateData {
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
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  fillSelections: () => void;
}

const zodValidator =
  <TState extends object>(
    config: StateCreator<TState, [["zustand/immer", never]], []>,
    schema: z.ZodSchema<Partial<TState>>
  ): StateCreator<TState, [["zustand/immer", never]], []> =>
  (set, get, api) =>
    config(
      (args) => {
        set(args);
        const result = schema.safeParse(get());
        if (!result.success) {
          console.error(
            "Zod validation failed!",
            result.error.flatten().fieldErrors
          );
        }
      },
      get,
      api
    );

const creator: StateCreator<CanvasState, [["zustand/immer", never]], []> = (
  set
) => ({
  offset: { x: 0, y: 0 },
  zoom: 1,
  grid: new Map(),
  scratchLayer: null,
  tool: "brush",
  brushChar: "#",
  textCursor: null,
  selections: [],

  setOffset: (updater) =>
    set((state) => {
      state.offset = updater(state.offset);
    }),
  setZoom: (updater) =>
    set((state) => {
      state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom)));
    }),

  setTool: (tool) => set({ tool, textCursor: null }),
  setBrushChar: (char) => set({ brushChar: char }),

  setScratchLayer: (points) =>
    set((state) => {
      state.scratchLayer = new Map();
      points.forEach((p) => state.scratchLayer!.set(toKey(p.x, p.y), p.char));
    }),

  addScratchPoints: (points) =>
    set((state) => {
      if (!state.scratchLayer) state.scratchLayer = new Map();
      points.forEach((p) => state.scratchLayer!.set(toKey(p.x, p.y), p.char));
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
      state.selections = [];
    }),

  setTextCursor: (pos) =>
    set((state) => {
      state.textCursor = pos;
      state.selections = [];
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

  addSelection: (area) =>
    set((state) => {
      state.selections.push(area);
    }),

  clearSelections: () =>
    set((state) => {
      state.selections = [];
    }),

  fillSelections: () =>
    set((state) => {
      if (state.selections.length === 0) return;

      state.selections.forEach((area) => {
        const minX = Math.min(area.start.x, area.end.x);
        const maxX = Math.max(area.start.x, area.end.x);
        const minY = Math.min(area.start.y, area.end.y);
        const maxY = Math.max(area.start.y, area.end.y);

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            state.grid.set(toKey(x, y), state.brushChar);
          }
        }
      });
    }),
});

export const useCanvasStore = create<CanvasState>()(
  temporal(immer(zodValidator(creator, CanvasStateSchema)), {
    partialize: (state) => ({ grid: state.grid }),
    limit: UNDO_LIMIT,
  })
);
```
---
```src/types/index.ts
import { z } from "zod";
import type { StoreApi, UseBoundStore } from "zustand";
import type { TemporalState } from "zundo";
import type { CanvasState } from "../store/canvasStore";

// --- Zod Schemas (The Single Source of Truth) ---

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export const GridPointSchema = PointSchema.extend({
  char: z.string(),
});

export const GridMapSchema = z.map(z.string(), z.string());

export const ToolTypeSchema = z.enum([
  "select",
  "fill",
  "brush",
  "eraser",
  "box",
  "line",
  "text",
]);

// --- Inferred Types (Automatically Generated Blueprints) ---

export type GridMap = z.infer<typeof GridMapSchema>;
export type ToolType = z.infer<typeof ToolTypeSchema>;
export type Point = z.infer<typeof PointSchema>;
export type SelectionArea = z.infer<typeof SelectionAreaSchema>;
export type GridPoint = z.infer<typeof GridPointSchema>;

// --- Untouched Library/Complex Types ---

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
import bresenham from "bresenham";
import { BOX_CHARS } from "../lib/constants";
import type { Point, GridPoint } from "../types";

export function getLinePoints(start: Point, end: Point): Point[] {
  const points = bresenham(start.x, start.y, end.x, end.y);
  return points.map(({ x, y }) => ({ x, y }));
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
---
```src/App.tsx
import React from "react";
import { useStore } from "zustand";
import { toast } from "sonner";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import type { CanvasStoreWithTemporal } from "./types";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/Toolbar";

function App() {
  const { zoom, offset, tool, grid, setTool, clearCanvas } = useCanvasStore();

  const temporalStore = (useCanvasStore as CanvasStoreWithTemporal).temporal;
  const { undo, redo } = temporalStore.getState();
  const pastStates = useStore(temporalStore, (state) => state.pastStates);
  const futureStates = useStore(temporalStore, (state) => state.futureStates);

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
    <AppLayout statusBar={statusBar} canvas={<AsciiCanvas />}>
      <Toolbar
        tool={tool}
        setTool={setTool}
        onUndo={() => undo()}
        onRedo={() => redo()}
        canUndo={pastStates.length > 0}
        canRedo={futureStates.length > 0}
        onExport={handleExport}
        onClear={handleClear}
      />
    </AppLayout>
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
import { Toaster } from "./components/ui/sonner";

interface AppLayoutProps {
  statusBar: React.ReactNode;
  canvas: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout = ({ statusBar, canvas, children }: AppLayoutProps) => {
  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      <main className="flex-1 relative z-0">{canvas}</main>

      <footer className="absolute bottom-4 left-4 z-10">{statusBar}</footer>

      {/* 广播塔安装完毕 */}
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
```src/components/Toolbar.tsx
import React from "react";
import {
  File,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
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
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "./ui/button-group";
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
} from "./ui/alert-dialog";
import type { ToolType } from "../types";

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
      label: "Select (Ctrl+Drag to Multi-select)",
      icon: MousePointer2,
    },
    { name: "fill", label: "Fill Selection", icon: PaintBucket },
    { name: "brush", label: "Brush", icon: Pencil },
    { name: "line", label: "Line", icon: Minus },
    { name: "box", label: "Box", icon: Square },
    { name: "text", label: "Text", icon: Type },
    { name: "eraser", label: "Eraser", icon: Eraser },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <ButtonGroup className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-1.5">
          {/* File Group */}
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

          {/* Tools Group */}
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

          {/* History Group */}
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
```src/components/AsciiCanvas/index.tsx
import { useRef, useMemo } from "react";
import { useSize } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";

export const AsciiCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useSize(containerRef);
  const store = useCanvasStore();

  const { bind, draggingSelection } = useCanvasInteraction(store, containerRef);
  useCanvasRenderer(canvasRef, size, store, draggingSelection);

  const cursorClass = useMemo(() => {
    switch (store.tool) {
      case "text":
        return "cursor-text";
      case "select":
        return "cursor-default";
      case "fill":
        return "cursor-cell";
      default:
        return "cursor-crosshair";
    }
  }, [store.tool]);

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className={`w-full h-full overflow-hidden bg-gray-50 touch-none select-none ${cursorClass}`}
      {...bind}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
```
---
```src/components/AsciiCanvas/hooks/useCanvasInteraction.ts
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
    addSelection,
    clearSelections,
    fillSelections,
    offset,
    zoom,
    selections,
  } = store;

  const dragStartGrid = useRef<Point | null>(null);
  const lastGrid = useRef<Point | null>(null);

  const [draggingSelection, setDraggingSelection] =
    useState<SelectionArea | null>(null);

  const handleKeyDown = useCreation(
    () => (e: KeyboardEvent) => {
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
    },
    [writeTextChar, backspaceText, newlineText, moveTextCursor, setTextCursor]
  );

  useEventListener("keydown", handleKeyDown, {
    enable: tool === "text" && !!textCursor,
  });

  const handleDrawing = useCreation(
    () => (currentGrid: Point) => {
      if (!lastGrid.current) return;
      if (tool === "brush") {
        const points = getLinePoints(lastGrid.current, currentGrid);
        const pointsWithChar = points.map((p) => ({
          ...p,
          char: brushChar,
        }));
        addScratchPoints(pointsWithChar);
      } else if (tool === "eraser") {
        const points = getLinePoints(lastGrid.current, currentGrid);
        const pointsWithChar = points.map((p) => ({ ...p, char: " " }));
        addScratchPoints(pointsWithChar);
      }
      lastGrid.current = currentGrid;
    },
    [tool, brushChar, addScratchPoints]
  );

  const { run: throttledDraw } = useThrottleFn(handleDrawing, {
    wait: 16,
    trailing: true,
  });

  const bind = useGesture(
    {
      onDragStart: ({ xy: [x, y], event }) => {
        const isLeftClick = (event as MouseEvent).button === 0;
        const isPan = (event as MouseEvent).buttons === 4;
        const isMultiSelect =
          (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey;
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
          }
        }
      },
      onDrag: ({ delta: [dx, dy], xy: [x, y], event }) => {
        const mouseEvent = event as MouseEvent;
        if (tool === "text") return;

        const isPan = mouseEvent.buttons === 4;

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
        if (tool === "text") return;
        const isLeftClick = (event as MouseEvent).button === 0;
        const isPan = (event as MouseEvent).buttons === 4;

        if (isLeftClick && !isPan) {
          if (tool === "select" && draggingSelection) {
            addSelection(draggingSelection);
            setDraggingSelection(null);
          } else if (tool !== "fill") {
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
import type { CanvasState } from "../../../store/canvasStore";
import { fromKey, gridToScreen, toKey } from "../../../utils/math";
import type { SelectionArea } from "../../../types";

export const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  size: { width: number; height: number } | undefined,
  store: CanvasState,
  draggingSelection: SelectionArea | null
) => {
  const { offset, zoom, grid, scratchLayer, tool, textCursor, selections } =
    store;

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

    const renderSelection = (area: SelectionArea) => {
      const minX = Math.min(area.start.x, area.end.x);
      const maxX = Math.max(area.start.x, area.end.x);
      const minY = Math.min(area.start.y, area.end.y);
      const maxY = Math.max(area.start.y, area.end.y);

      const screenStart = gridToScreen(minX, minY, offset.x, offset.y, zoom);
      const width = (maxX - minX + 1) * scaledCellW;
      const height = (maxY - minY + 1) * scaledCellH;

      ctx.fillStyle = COLOR_SELECTION_BG;
      ctx.fillRect(screenStart.x, screenStart.y, width, height);
      ctx.strokeStyle = COLOR_SELECTION_BORDER;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenStart.x, screenStart.y, width, height);
    };

    selections.forEach(renderSelection);

    if (draggingSelection) renderSelection(draggingSelection);

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
  }, [
    offset,
    zoom,
    size,
    grid,
    scratchLayer,
    textCursor,
    tool,
    selections,
    draggingSelection,
    canvasRef,
  ]);
};
```
