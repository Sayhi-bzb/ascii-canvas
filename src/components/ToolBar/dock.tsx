"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  MousePointer2,
  Square,
  Minus,
  Pencil,
  Eraser,
  PaintBucket,
  Undo2,
  Download,
  LineSquiggle,
  Circle as CircleIcon,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolType } from "@/types";
import { useCanvasStore } from "@/store/canvasStore";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
  onExport: () => void;
}

const MATERIAL_PRESETS = ["*", ".", "@", "▒"];
const SHAPE_TOOLS: ToolType[] = ["box", "circle", "line", "stepline"];

export function Toolbar({ tool, setTool, onUndo, onExport }: ToolbarProps) {
  const { brushChar, setBrushChar } = useCanvasStore();
  const [lastUsedShape, setLastUsedShape] = useState<ToolType>("box");
  const [openSubMenuId, setOpenSubMenuId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [customChar, setCustomChar] = useState(() =>
    MATERIAL_PRESETS.includes(brushChar) ? "" : brushChar
  );

  const isShapeGroupActive = SHAPE_TOOLS.includes(tool);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const getToolMeta = useCallback((type: ToolType) => {
    switch (type) {
      case "box":
        return { icon: Square, label: "Rectangle", shortcut: "R" };
      case "circle":
        return { icon: CircleIcon, label: "Circle", shortcut: "O" };
      case "line":
        return { icon: Minus, label: "Line", shortcut: "L" };
      case "stepline":
        return { icon: LineSquiggle, label: "Curve", shortcut: "S" };
      default:
        return { icon: Square, label: "Shape", shortcut: "" };
    }
  }, []);

  const activeShapeMeta = useMemo(
    () => getToolMeta(isShapeGroupActive ? tool : lastUsedShape),
    [isShapeGroupActive, tool, lastUsedShape, getToolMeta]
  );

  const navItems = useMemo(
    () => [
      {
        id: "select",
        label: "Select",
        icon: MousePointer2,
        onClick: () => setTool("select"),
      },
      {
        id: "brush",
        label: `Brush (${brushChar})`,
        icon: Pencil,
        onClick: () => setTool("brush"),
        hasSub: true,
      },
      {
        id: "shape-group",
        label: activeShapeMeta.label,
        icon: activeShapeMeta.icon,
        onClick: () => setTool(isShapeGroupActive ? tool : lastUsedShape),
        hasSub: true,
      },
      {
        id: "fill",
        label: "Fill",
        icon: PaintBucket,
        onClick: () => setTool("fill"),
      },
      {
        id: "eraser",
        label: "Eraser",
        icon: Eraser,
        onClick: () => setTool("eraser"),
      },
      { id: "undo", label: "Undo", icon: Undo2, onClick: onUndo },
      { id: "export", label: "Export", icon: Download, onClick: onExport },
    ],
    [
      brushChar,
      activeShapeMeta,
      isShapeGroupActive,
      tool,
      lastUsedShape,
      setTool,
      onUndo,
      onExport,
    ]
  );

  const activeIndex = useMemo(() => {
    const currentId = isShapeGroupActive ? "shape-group" : tool;
    const idx = navItems.findIndex((item) => item.id === currentId);
    return idx !== -1 ? idx : 0;
  }, [tool, isShapeGroupActive, navItems]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = itemRefs.current[activeIndex];
      const container = activeEl?.closest("nav");
      if (activeEl && container) {
        const rect = activeEl.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        const width = 20;
        const left = rect.left - contRect.left + (rect.width - width) / 2;
        setIndicatorStyle({ width, left });
      }
    };
    updateIndicator();
    const timer = setTimeout(updateIndicator, 16);
    window.addEventListener("resize", updateIndicator);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      clearTimeout(timer);
    };
  }, [activeIndex]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <nav className="relative flex items-center gap-1 p-1.5 rounded-2xl bg-background/80 backdrop-blur-md border border-primary/10 shadow-2xl pointer-events-auto">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className={cn(
                  "relative flex items-center rounded-lg transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      onClick={item.onClick}
                      className={cn(
                        "flex items-center justify-center h-9 px-3 outline-none rounded-l-lg transition-colors",
                        !item.hasSub && "rounded-lg",
                        !isActive && "hover:bg-muted/50"
                      )}
                    >
                      <Icon className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>

                {item.hasSub && (
                  <Popover
                    open={openSubMenuId === item.id}
                    onOpenChange={(o) => setOpenSubMenuId(o ? item.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center justify-center h-9 px-1 border-l border-transparent hover:border-border/40 outline-none rounded-r-lg opacity-30 hover:opacity-100 transition-all",
                          openSubMenuId === item.id && "bg-muted/50 opacity-100"
                        )}
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      sideOffset={12}
                      className="w-auto p-1 flex flex-col gap-0.5 rounded-xl bg-popover/95 backdrop-blur-md border shadow-xl z-50 overflow-hidden min-w-[100px]"
                    >
                      {item.id === "brush" ? (
                        <>
                          <button
                            onClick={() => {
                              setBrushChar(customChar);
                              setTool("brush");
                              inputRef.current?.focus();
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 h-9 px-2 rounded-md transition-all outline-none shrink-0",
                              brushChar === customChar && customChar !== ""
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <div className="size-3.5 flex items-center justify-center shrink-0">
                              {brushChar === customChar &&
                                customChar !== "" && (
                                  <Check className="size-3.5 stroke-[3]" />
                                )}
                            </div>
                            <div className="flex-1 px-1">
                              <Input
                                ref={inputRef}
                                className="h-6 w-14 text-center p-0 font-mono text-base font-bold border-none shadow-none ring-0 focus-visible:ring-0 bg-muted/40 hover:bg-muted/60 rounded-sm text-inherit placeholder:text-muted-foreground/50 placeholder:text-[10px] placeholder:font-sans"
                                placeholder="Custom"
                                maxLength={2}
                                value={customChar}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomChar(val);
                                  setBrushChar(val);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </button>
                          {MATERIAL_PRESETS.map((char) => (
                            <button
                              key={char}
                              onClick={() => {
                                setBrushChar(char);
                                setTool("brush");
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 h-9 px-2 rounded-md transition-all outline-none shrink-0",
                                brushChar === char
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <div className="size-3.5 flex items-center justify-center shrink-0">
                                {brushChar === char && (
                                  <Check className="size-3.5 stroke-[3]" />
                                )}
                              </div>
                              <span className="flex-1 font-mono font-bold text-lg text-center leading-none">
                                {char}
                              </span>
                            </button>
                          ))}
                        </>
                      ) : (
                        SHAPE_TOOLS.map((st) => {
                          const meta = getToolMeta(st);
                          const isSubActive = tool === st;
                          return (
                            <button
                              key={st}
                              onClick={() => {
                                setTool(st);
                                setLastUsedShape(st);
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 h-9 px-2 rounded-md transition-all outline-none shrink-0",
                                isSubActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <div className="size-3.5 flex items-center justify-center shrink-0">
                                {isSubActive && (
                                  <Check className="size-3.5 stroke-[3]" />
                                )}
                              </div>
                              <meta.icon className="size-4 shrink-0" />
                              <span className="flex-1 text-left text-sm font-medium pr-4 whitespace-nowrap ml-1">
                                {meta.label}
                              </span>
                              <span className="text-[10px] opacity-40 font-mono">
                                {meta.shortcut}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}

          <div
            className="absolute bottom-1 left-0 bg-primary rounded-full transition-all duration-300 ease-out pointer-events-none"
            style={{
              width: `${indicatorStyle.width}px`,
              transform: `translateX(${indicatorStyle.left}px)`,
              height: "2px",
            }}
          />
        </nav>
      </div>
    </TooltipProvider>
  );
}
