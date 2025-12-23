```README.md
[English] | [简体中文](./README.zh-CN.md)

# ASCII Canvas

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Framework-React_18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Collaboration](https://img.shields.io/badge/Sync-Yjs_CRDT-orange?logo=distributed-systems)](https://yjs.dev/)
[![Deploy](https://img.shields.io/badge/Demo-Live_Preview-22c55e?logo=cloudflare-pages)](https://ascii-canvas.pages.dev/)

**ASCII Canvas** is a high-performance, collaborative ASCII art creation and character-based layout framework. Built with modern graphics engineering principles, it provides a seamless, infinite-canvas environment for precision character design and real-time multiplayer coordination.

[**Live Demo**](https://ascii-canvas.pages.dev/) | [**GitHub Repository**](https://github.com/Sayhi-bzb/ascii-canvas.git)

---

## 🛠 Core Features

### 1. High-Performance Rendering

- **Multi-layer Canvas Architecture**: Utilizes three distinct layers (Background, Scratch, and UI) to maintain 60FPS performance even during complex operations.
- **Infinite Viewport**: Integrated screen-to-grid mapping allows for seamless panning and zooming across an unbounded workspace.

### 2. Intelligent Layout Engine

- **Setback Inheritance**: Smart newline logic that automatically detects and maintains indentation from previous lines.
- **Wide-Character Support**: Fully compatible with CJK characters and Emojis, featuring automatic grid-occupancy correction.
- **Modular Indentation**: A professional Tab system that shifts the cursor by two standard grid units for structured layouts.

### 3. Distributed Collaboration

- **Yjs CRDT Integration**: Powered by conflict-free replicated data types (CRDT) to enable real-time, low-latency collaborative editing.
- **Robust Persistence**: High-granularity undo/redo management with local storage synchronization.

### 4. Precision Editing Tools

- **Anchor-based Selection**: `Shift + Click` functionality for rapid, anchored rectangular zoning.
- **Mass Pouring (Fill)**: Instantly fill active selection areas with any character input.
- **Contextual Command Hub**: Professional context menu for Copy, Cut, Paste, and Demolish (Delete) operations.

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
- [ ] **AI Chat Integration**: Natural language interface for generating canvas components and complex ASCII structures.
- [ ] ANSI Sequence & SVG Export support.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---
```
---
```README.zh-CN.md
[English](./README.md) | [简体中文]

# ASCII Canvas (中文文档)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Framework-React_18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Collaboration](https://img.shields.io/badge/Sync-Yjs_CRDT-orange?logo=distributed-systems)](https://yjs.dev/)
[![Deploy](https://img.shields.io/badge/Demo-Live_Preview-22c55e?logo=cloudflare-pages)](https://ascii-canvas.pages.dev/)

**ASCII Canvas** 是一款高性能、协同式的 ASCII 艺术创作与字符布局框架。它结合了现代图形工程原理，为精准的字符设计和实时多用户协作提供了一个流畅、无限画布的环境。

[**在线体验**](https://ascii-canvas.pages.dev/) | [**GitHub 仓库**](https://github.com/Sayhi-bzb/ascii-canvas.git)

---

## 🛠 核心特性

### 1. 高性能渲染

- **多层 Canvas 架构**: 采用三层独立画布（背景层、草图层、UI 层），确保在复杂操作下依然维持 60FPS 的性能。
- **无限视口**: 集成屏幕到网格的映射算法，支持在无限空间内进行平滑的平移与缩放。

### 2. 智能布局引擎

- **缩进继承**: 智能换行逻辑，自动检测并保持前序行的缩进位置。
- **全角字符支持**: 完美兼容 CJK（中日韩）字符与 Emoji，具备自动网格占位修正功能。
- **模块化缩进**: 专业的 Tab 系统，支持将光标向右平移两个标准网格单位。

### 3. 分布式协同

- **Yjs CRDT 集成**: 基于无冲突复制数据类型 (CRDT)，实现低延迟、实时的多用户协同编辑。
- **可靠的持久化**: 具备高颗粒度的撤销/重做管理，并支持本地存储同步。

### 4. 精准编辑工具

- **锚点式选区**: 支持 `Shift + Click` 快速锚点定点，实现高效的矩形区域划定。
- **批量填充 (Fill)**: 在激活选区内通过任意按键输入即可实现大面积字符填充。
- **右键指令中心**: 集成右键上下文菜单，支持复制、剪切、粘贴及删除操作。

---

## 🗺 发展路线 (Roadmap)

- [x] 多层 Canvas 渲染引擎。
- [x] 基于 Yjs 的实时协同编辑。
- [x] 智能缩进与 Tab 系统。
- [x] 右键上下文菜单与剪贴板集成。
- [ ] **NES (Next Edit Suggestion)**: 基于布局模式的下一处编辑智能建议。
- [ ] **AI Chat 集成**: 通过自然语言交互生成画布组件与复杂的 ASCII 结构。
- [ ] 支持导出 ANSI 序列与 SVG 格式。
```
---
```src/components/ToolBar/sidebar-right.tsx
"use client";

import {
  Library,
  Trash2,
  Github,
  Eye,
  EyeOff,
  Target,
  Download,
  Copy,
  ImageIcon,
  CircleHelp,
  Keyboard,
  Mouse,
  Move,
  Type,
  Maximize,
  Info,
} from "lucide-react";
import { SidebarStandard, useSidebar } from "@/components/ui/sidebar";
import { CharLibrary } from "./right-sidebar/char-library";
import { useCanvasStore } from "@/store/canvasStore";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { exportToString, exportToPNG } from "@/utils/export";
import { ExportPreview } from "./export-preview";
import { ActionButton } from "@/components/ui/action-button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SidebarRight() {
  const {
    grid,
    clearCanvas,
    showGrid,
    setShowGrid,
    exportShowGrid,
    setExportShowGrid,
    setOffset,
    setZoom,
  } = useCanvasStore();

  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const handleResetView = () => {
    setZoom(() => 1);
    setOffset(() => ({ x: 0, y: 0 }));
  };

  return (
    <SidebarStandard
      variant="floating"
      side="right"
      title="Library"
      className="pointer-events-auto"
      icon={
        <div className="flex items-center justify-center rounded-lg bg-accent p-1.5 shrink-0">
          <Library className="size-4 text-accent-foreground" />
        </div>
      }
      footer={
        <div
          className={cn(
            "flex w-full flex-col gap-2",
            isCollapsed && "items-center"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between w-full px-1",
              isCollapsed && "flex-col gap-2"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1",
                isCollapsed && "flex-col"
              )}
            >
              <Dialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Download className="size-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Export Blueprint
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <DialogContent className="sm:max-w-xs gap-0 p-0 overflow-hidden border-none shadow-2xl">
                  <div className="bg-muted/30 p-5 pb-3">
                    <DialogHeader>
                      <DialogTitle className="text-base">Export</DialogTitle>
                      <DialogDescription className="text-[10px] uppercase tracking-widest">
                        ASCII Metropolis
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    <div className="aspect-video w-full relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur opacity-25"></div>
                      <div className="relative h-full border rounded-xl bg-background overflow-hidden shadow-inner p-3">
                        <ExportPreview />
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 py-2">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ActionButton
                              variant="outline"
                              size="md"
                              icon={Copy}
                              className="border-2 rounded-xl"
                              onAction={() =>
                                navigator.clipboard.writeText(
                                  exportToString(grid)
                                )
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Copy Text
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ActionButton
                              variant="outline"
                              size="md"
                              icon={ImageIcon}
                              className="border-2 rounded-xl"
                              onAction={() => exportToPNG(grid, exportShowGrid)}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Save Image
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">
                        Print Grid on PNG
                      </span>
                      <Button
                        variant={exportShowGrid ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setExportShowGrid(!exportShowGrid)}
                        className="h-6 px-2 rounded-md text-[10px] uppercase font-bold"
                      >
                        {exportShowGrid ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-8 transition-colors",
                        showGrid ? "text-primary" : "text-muted-foreground"
                      )}
                      onClick={() => setShowGrid(!showGrid)}
                    >
                      {showGrid ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {showGrid ? "Hide Workspace Grid" : "Show Workspace Grid"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      onClick={handleResetView}
                    >
                      <Target className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Reset View</TooltipContent>
                </Tooltip>

                <Dialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary"
                        >
                          <CircleHelp className="size-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">User Manual</TooltipContent>
                  </Tooltip>
                  <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
                    <div className="bg-muted/30 p-5 pb-4 border-b">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Keyboard className="size-5 text-primary" />
                          <span>Mayor's Handbook v2.0</span>
                        </DialogTitle>
                        <DialogDescription>
                          Advanced protocols for your ASCII Metropolis.
                        </DialogDescription>
                      </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[65vh] overflow-y-auto">
                      <div className="p-5 space-y-6">
                        {/* 1. Navigation */}
                        <section className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                            <Move className="size-4" /> Navigation & Viewport
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-muted/50 p-2 rounded-md flex justify-between items-center">
                              <span>Pan View</span>
                              <div className="flex gap-1 items-center">
                                <kbd className="bg-background px-1.2 py-0.5 rounded border text-[9px] font-mono shadow-sm">
                                  Space
                                </kbd>
                                <span className="text-muted-foreground text-[10px]">
                                  +
                                </span>
                                <Mouse className="size-3" />
                              </div>
                            </div>
                            <div className="bg-muted/50 p-2 rounded-md flex justify-between items-center">
                              <span>Zoom</span>
                              <div className="flex gap-1">
                                <kbd className="bg-background px-1.2 py-0.5 rounded border text-[9px] font-mono shadow-sm">
                                  Ctrl
                                </kbd>
                                <span className="text-muted-foreground text-[10px]">
                                  +
                                </span>
                                <span className="font-mono text-[10px]">
                                  Scroll
                                </span>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* 2. Zoning (The selection part - Major Update) */}
                        <section className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                            <Maximize className="size-4" /> Rapid Zoning
                            (Selection)
                          </h4>
                          <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-xs space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="font-bold text-foreground">
                                  Anchor Surveying
                                </p>
                                <p className="text-muted-foreground">
                                  Click a point, then{" "}
                                  <kbd className="font-mono bg-muted px-1 rounded">
                                    Shift + Click
                                  </kbd>{" "}
                                  another to instantly frame the lot.
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-between items-start border-t border-primary/10 pt-2">
                              <div className="space-y-1">
                                <p className="font-bold text-foreground">
                                  Mass Pouring (Fill)
                                </p>
                                <p className="text-muted-foreground">
                                  Select an area and{" "}
                                  <span className="text-primary font-bold">
                                    press any character
                                  </span>{" "}
                                  to fill the entire sector instantly.
                                </p>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* 3. Typography (The Enter/Tab part - Major Update) */}
                        <section className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                            <Type className="size-4" /> Construction & Typing
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Setback Inheritance
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Auto-aligns newline with previous indentation
                                </span>
                              </div>
                              <kbd className="bg-muted px-2 py-0.5 rounded border text-[10px] font-mono">
                                Enter
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Modular Paving
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Instantly pavs 2 grids of vacant space
                                </span>
                              </div>
                              <kbd className="bg-muted px-2 py-0.5 rounded border text-[10px] font-mono">
                                Tab
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground italic">
                                Quick Undo
                              </span>
                              <div className="flex gap-1">
                                <kbd className="bg-muted px-1.5 py-0.5 rounded border text-[10px] font-mono">
                                  Ctrl
                                </kbd>
                                <span className="text-muted-foreground">+</span>
                                <kbd className="bg-muted px-1.5 py-0.5 rounded border text-[10px] font-mono">
                                  Z
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* Pro Tips */}
                        <div className="flex gap-2 p-3 rounded-md bg-accent/50 border border-border">
                          <Info className="size-4 text-primary shrink-0" />
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            <strong className="text-foreground">
                              Pro Tip:
                            </strong>{" "}
                            Use the{" "}
                            <span className="font-bold underline">
                              Select tool
                            </span>{" "}
                            to place the cursor. Once a zoning box is active,
                            typing acts as a fill command instead of cursor
                            placement.
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => window.open("https://github.com", "_blank")}
                  >
                    <Github className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Source Code</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <AlertDialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size={isCollapsed ? "icon" : "default"}
                      className={cn(
                        "justify-start gap-2 text-destructive hover:bg-destructive/10 transition-colors",
                        isCollapsed
                          ? "size-8 justify-center"
                          : "w-full h-8 px-2"
                      )}
                    >
                      <Trash2 className="size-4" />
                      {!isCollapsed && (
                        <span className="font-medium text-xs">
                          Clear Canvas
                        </span>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="left">Clear Canvas</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Issuing a Demolition Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will completely clear the current blueprint.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearCanvas}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    >
      <CharLibrary />
    </SidebarStandard>
  );
}
```
---
```src/components/ToolBar/right-sidebar/char-library.tsx
"use client";

import { useMemo } from "react";
import {
  ChevronRight,
  Square,
  LayoutGrid,
  Accessibility,
  Fingerprint,
  Smile,
} from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const MATERIAL_BLUEPRINTS = [
  {
    name: "Nerd Symbols",
    icon: Fingerprint,
    ranges: [
      [0xe700, 0xe7c5],
      [0xf000, 0xf2e0],
      [0xe0b0, 0xe0b3],
    ],
    isActive: false,
  },
  {
    name: "Box Drawing",
    icon: Square,
    ranges: [[0x2500, 0x257f]],
    isActive: true,
  },
  {
    name: "Block Elements",
    icon: LayoutGrid,
    ranges: [[0x2580, 0x259f]],
    isActive: false,
  },
  {
    name: "Braille Icons",
    icon: Accessibility,
    ranges: [[0x2800, 0x28ff]],
    isActive: false,
  },
  {
    name: "Emoticons",
    icon: Smile,
    ranges: [[0x1f600, 0x1f64f]],
    isActive: false,
  },
];

const generateChars = (ranges: number[][]): string[] => {
  return ranges.flatMap(([start, end]) =>
    Array.from({ length: end - start + 1 }, (_, i) =>
      String.fromCodePoint(start + i)
    )
  );
};

export function CharLibrary() {
  const { brushChar, setBrushChar, setTool } = useCanvasStore();

  const library = useMemo(
    () =>
      MATERIAL_BLUEPRINTS.map((category) => ({
        ...category,
        chars: generateChars(category.ranges),
      })),
    []
  );

  const handleSelect = (char: string) => {
    setBrushChar(char);
    setTool("brush");
    toast.success(`Selected: ${char}`, {
      duration: 800,
      position: "top-right",
    });
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {library.map((group) => (
          <Collapsible
            key={group.name}
            asChild
            defaultOpen={group.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={group.name} className="font-medium">
                  <group.icon className="size-4 text-muted-foreground" />
                  <span>{group.name}</span>
                  <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="grid grid-cols-4 gap-1 p-2 bg-muted/20 rounded-md mt-1">
                  {group.chars.map((char, idx) => (
                    <button
                      key={`${group.name}-${idx}`}
                      onClick={() => handleSelect(char)}
                      className={cn(
                        "h-9 w-full flex items-center justify-center rounded-sm transition-all font-mono text-base border",
                        brushChar === char
                          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-95"
                          : "bg-background hover:border-primary/30 hover:bg-accent text-foreground border-transparent"
                      )}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
```
