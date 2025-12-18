```src/app.tsx
import { useState } from "react";
import { toast } from "sonner";
import { useKeyPress } from "ahooks";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/ToolBar/dock";
import { undoManager } from "./lib/yjs-setup";
import { isCtrlOrMeta } from "./utils/event";

import { SidebarLeft } from "./components/ToolBar/sidebar-left";
import { SidebarRight } from "./components/ToolBar/sidebar-right";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";

function App() {
  const {
    tool,
    grid,
    setTool,
    fillSelectionsWithChar,
    copySelectionToClipboard,
    cutSelectionToClipboard,
  } = useCanvasStore();

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

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

  return (
    <SidebarProvider className="flex h-full w-full overflow-hidden">
      <SidebarLeft />

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

        {/* 右侧侧边栏独立行政区 */}
        <div className="absolute top-0 right-0 h-full pointer-events-none z-50">
          <SidebarProvider
            open={isRightPanelOpen}
            onOpenChange={setIsRightPanelOpen}
            className="h-full items-end"
          >
            <SidebarRight />
          </SidebarProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
```
---
```src/index.css
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
import App from "./app.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```
---
```src/types/index.ts
import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof PointSchema>;

export const GridPointSchema = PointSchema.extend({
  char: z.string().length(1),
});

export type GridPoint = z.infer<typeof GridPointSchema>;

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export type SelectionArea = z.infer<typeof SelectionAreaSchema>;

export const NodeTypeSchema = z.enum(["root", "layer", "group", "item"]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  x: number;
  y: number;
  isVisible: boolean;
  isLocked: boolean;
  isCollapsed: boolean;
  children: CanvasNode[];
  content?: Record<string, string>;
}

export const CanvasNodeSchema: z.ZodType<CanvasNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: NodeTypeSchema,
    name: z.string().min(1).max(50),
    parentId: z.string().nullable(),
    x: z.number().default(0),
    y: z.number().default(0),
    isVisible: z.boolean().default(true),
    isLocked: z.boolean().default(false),
    isCollapsed: z.boolean().default(false),
    children: z.array(CanvasNodeSchema),
    content: z.record(z.string(), z.string()).optional(),
  })
);

export type GridMap = Map<string, string>;
export type ToolType = "select" | "fill" | "brush" | "eraser" | "box" | "line";
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
      const char = grid.get(GridManager.toKey(x, y));
      if (char) {
        line += char;
        const width = GridManager.getCharWidth(char);
        if (width === 2) x++;
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
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  grid.forEach((_char, key) => {
    const { x, y } = GridManager.fromKey(key);
    const width = GridManager.getCharWidth(_char);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width - 1);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

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

  getCharWidth(char: string): number {
    if (!char) return 1;
    const isWide =
      /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ue000-\uf8ff]/.test(char) ||
      /\p{Emoji_Presentation}/u.test(char);
    return isWide ? 2 : 1;
  },

  isWideChar(char: string): boolean {
    return this.getCharWidth(char) === 2;
  },

  snapToCharStart(pos: Point, grid: GridMap): Point {
    const charBefore = grid.get(this.toKey(pos.x - 1, pos.y));
    if (charBefore && this.isWideChar(charBefore)) {
      return { ...pos, x: pos.x - 1 };
    }
    return pos;
  },
};
```
---
```src/utils/scene.ts
import * as Y from "yjs";
import { GridManager } from "./grid";
import type { CanvasNode, GridMap, NodeType } from "../types";

export const composeScene = (
  node: Y.Map<unknown>,
  globalOffsetX: number = 0,
  globalOffsetY: number = 0,
  resultGrid: GridMap
) => {
  const type = node.get("type") as NodeType;
  const isVisible = node.get("isVisible") as boolean;

  if (isVisible === false) return;

  const localX = (node.get("x") as number) || 0;
  const localY = (node.get("y") as number) || 0;
  const currentGlobalX = globalOffsetX + localX;
  const currentGlobalY = globalOffsetY + localY;

  if (type === "item") {
    const content = node.get("content") as Y.Map<string>;
    if (content) {
      content.forEach((char, key) => {
        const { x: localGridX, y: localGridY } = GridManager.fromKey(key);
        const worldX = currentGlobalX + localGridX;
        const worldY = currentGlobalY + localGridY;
        const worldKey = GridManager.toKey(worldX, worldY);
        resultGrid.set(worldKey, char);
      });
    }
  }

  const children = node.get("children");
  if (children instanceof Y.Array) {
    children.forEach((childNode) => {
      if (childNode instanceof Y.Map) {
        composeScene(
          childNode as Y.Map<unknown>,
          currentGlobalX,
          currentGlobalY,
          resultGrid
        );
      }
    });
  }
};

export const parseSceneGraph = (node: Y.Map<unknown>): CanvasNode => {
  const id = node.get("id") as string;
  const type = node.get("type") as NodeType;
  const name = node.get("name") as string;
  const x = node.get("x") as number;
  const y = node.get("y") as number;
  const isVisible = node.get("isVisible") as boolean;
  const isLocked = node.get("isLocked") as boolean;
  const isCollapsed = node.get("isCollapsed") as boolean;

  const childrenYArray = node.get("children");
  const children: CanvasNode[] = [];

  if (childrenYArray instanceof Y.Array) {
    childrenYArray.forEach((child) => {
      if (child instanceof Y.Map) {
        children.push(parseSceneGraph(child as Y.Map<unknown>));
      }
    });
  }

  return {
    id,
    type,
    name,
    parentId: null,
    children,
    x,
    y,
    isVisible,
    isLocked,
    isCollapsed,
  };
};

export const findNodeById = (
  root: Y.Map<unknown>,
  id: string
): Y.Map<unknown> | null => {
  if (root.get("id") === id) return root;

  const children = root.get("children");
  if (children instanceof Y.Array) {
    for (let i = 0; i < children.length; i++) {
      const child = children.get(i);
      if (child instanceof Y.Map) {
        const found = findNodeById(child as Y.Map<unknown>, id);
        if (found) return found;
      }
    }
  }
  return null;
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

export const ySceneRoot = yDoc.getMap<unknown>("scene-root");

const initializeScene = () => {
  yDoc.transact(() => {
    if (ySceneRoot.has("id")) return;

    ySceneRoot.set("id", "root");
    ySceneRoot.set("type", "root");
    ySceneRoot.set("name", "City Root");
    ySceneRoot.set("x", 0);
    ySceneRoot.set("y", 0);

    const rootChildren = new Y.Array<Y.Map<unknown>>();
    ySceneRoot.set("children", rootChildren);

    const defaultLayer = new Y.Map<unknown>();
    rootChildren.push([defaultLayer]);

    defaultLayer.set("id", "layer-default");
    defaultLayer.set("type", "layer");
    defaultLayer.set("name", "Layer 1");
    defaultLayer.set("x", 0);
    defaultLayer.set("y", 0);
    defaultLayer.set("isVisible", true);
    defaultLayer.set("isLocked", false);

    const layerChildren = new Y.Array<Y.Map<unknown>>();
    defaultLayer.set("children", layerChildren);

    const defaultItem = new Y.Map<unknown>();
    layerChildren.push([defaultItem]);

    defaultItem.set("id", "item-main");
    defaultItem.set("type", "item");
    defaultItem.set("name", "Main Grid");
    defaultItem.set("x", 0);
    defaultItem.set("y", 0);
    defaultItem.set("isVisible", true);
    defaultItem.set("isLocked", false);
    defaultItem.set("content", new Y.Map<string>());
  });
};

initializeScene();

export const undoManager = new Y.UndoManager([ySceneRoot], {
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
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { composeScene, parseSceneGraph } from "../utils/scene";
import { ySceneRoot } from "../lib/yjs-setup";
import type { CanvasState } from "./interfaces";
import {
  createNodeSlice,
  createDrawingSlice,
  createTextSlice,
  createSelectionSlice,
} from "./slices";

export type { CanvasState };

export const useCanvasStore = create<CanvasState>((set, get, ...a) => {
  const render = () => {
    const compositeGrid = new Map<string, string>();
    composeScene(ySceneRoot, 0, 0, compositeGrid);
    const tree = parseSceneGraph(ySceneRoot);
    set({ grid: compositeGrid, sceneGraph: tree });
  };

  ySceneRoot.observeDeep(() => {
    render();
  });

  setTimeout(render, 0);

  return {
    offset: { x: 0, y: 0 },
    zoom: 1,
    grid: new Map(),
    sceneGraph: null,
    activeNodeId: "item-main",
    tool: "select",
    brushChar: "#",

    setOffset: (updater) => set((state) => ({ offset: updater(state.offset) })),
    setZoom: (updater) =>
      set((state) => ({
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
      })),
    setTool: (tool) => set({ tool, textCursor: null }),
    setBrushChar: (char) => set({ brushChar: char }),
    setActiveNode: (id) =>
      set({ activeNodeId: id, selections: [], textCursor: null }),

    ...createNodeSlice(set, get, ...a),
    ...createDrawingSlice(set, get, ...a),
    ...createTextSlice(set, get, ...a),
    ...createSelectionSlice(set, get, ...a),
  };
});
```
---
```src/components/AsciiCanvas/index.tsx
import { useRef, useMemo, useEffect } from "react";
import { useSize, useEventListener } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { GridManager } from "../../utils/grid";
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
      const key = GridManager.toKey(textCursor.x, textCursor.y);
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
      const key = GridManager.toKey(textCursor.x, textCursor.y);
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

    const { x, y } = GridManager.gridToScreen(
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
