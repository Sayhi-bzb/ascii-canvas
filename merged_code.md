```src/components/ToolBar/dock.tsx
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
```
---
```src/components/ToolBar/sidebar-right.tsx
"use client";

import { Library, Trash2, Github, Eye, EyeOff, Target } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarRight() {
  const { clearCanvas, showGrid, setShowGrid, setOffset, setZoom } =
    useCanvasStore();
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
            "flex w-full transition-all duration-300",
            isCollapsed ? "flex-col items-center gap-2" : "flex-col gap-2"
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
                  {showGrid ? "Hide Grid" : "Show Grid"}
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
            </div>

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
          </div>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size={isCollapsed ? "icon" : "default"}
                    className={cn(
                      "justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors",
                      isCollapsed ? "size-8 justify-center" : "w-full h-8 px-2"
                    )}
                  >
                    <Trash2 className="size-4" />
                    {!isCollapsed && (
                      <span className="font-medium text-xs">Clear Canvas</span>
                    )}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="left">Clear Canvas</TooltipContent>
              )}
            </Tooltip>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Issuing a Demolition Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will completely clear the current blueprint. All ASCII
                  structures will be dismantled. This can be undone via Ctrl+Z.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearCanvas}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm Demolition
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
  Hash,
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const MATERIAL_BLUEPRINTS = [
  {
    name: "Standard Blocks",
    icon: Hash,
    ranges: [[0x0021, 0x007e]],
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
      <SidebarGroupLabel>Material Warehouse</SidebarGroupLabel>
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
import { Minimap } from "./Minimap";

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
      className="relative w-full h-full overflow-hidden bg-white touch-none select-none cursor-default"
    >
      <canvas ref={canvasRef} />

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
  } = store;

  const dragStartGrid = useRef<Point | null>(null);
  const lastGrid = useRef<Point | null>(null);
  const lastPlacedGrid = useRef<Point | null>(null);

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
            if (!mouseEvent.shiftKey) clearSelections();
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
          lineAxisRef.current = null;

          if (tool === "brush")
            addScratchPoints([{ ...start, char: brushChar }]);
          else if (tool === "eraser") erasePoints([start]);
        }
      },
      onDrag: ({ xy: [x, y], delta: [dx, dy] }) => {
        if (isPanningRef.current) {
          setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
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
            setOffset((prev) => ({
              x: mouseX - (mouseX - prev.x) * actualScale,
              y: mouseY - (mouseY - prev.y) * actualScale,
            }));
          }
        } else {
          setOffset((p) => ({
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
import { useEffect, useRef } from "react";
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
import { GridManager } from "../../../utils/grid";
import type { SelectionArea, GridMap } from "../../../types";
import { getSelectionBounds } from "../../../utils/selection";

export const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  size: { width: number; height: number } | undefined,
  store: CanvasState,
  draggingSelection: SelectionArea | null
) => {
  const { offset, zoom, grid, scratchLayer, textCursor, selections, showGrid } =
    store;

  const renderRequestId = useRef<number>(0);

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { alpha: false });
      if (!canvas || !ctx || !size || size.width === 0 || size.height === 0)
        return;

      const dpr = window.devicePixelRatio || 1;
      if (
        canvas.width !== size.width * dpr ||
        canvas.height !== size.height * dpr
      ) {
        canvas.width = size.width * dpr;
        canvas.height = size.height * dpr;
      }

      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, size.width, size.height);

      const sw = CELL_WIDTH * zoom;
      const sh = CELL_HEIGHT * zoom;

      const startX = Math.floor(-offset.x / sw);
      const endX = Math.ceil((size.width - offset.x) / sw);
      const startY = Math.floor(-offset.y / sh);
      const endY = Math.ceil((size.height - offset.y) / sh);

      if (showGrid) {
        ctx.beginPath();
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        for (let x = startX; x <= endX; x++) {
          const posX = Math.round(x * sw + offset.x);
          ctx.moveTo(posX, 0);
          ctx.lineTo(posX, size.height);
        }
        for (let y = startY; y <= endY; y++) {
          const posY = Math.round(y * sh + offset.y);
          ctx.moveTo(0, posY);
          ctx.lineTo(size.width, posY);
        }
        ctx.stroke();
      }

      ctx.font = `${FONT_SIZE * zoom}px 'Maple Mono NF CN', monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      const drawGridInViewport = (targetGrid: GridMap, color: string) => {
        ctx.fillStyle = color;
        for (let y = startY; y <= endY; y++) {
          for (let x = startX; x <= endX; x++) {
            const char = targetGrid.get(GridManager.toKey(x, y));
            if (!char || char === " ") continue;

            const pos = GridManager.gridToScreen(
              x,
              y,
              offset.x,
              offset.y,
              zoom
            );
            const wide = GridManager.isWideChar(char);
            const centerX = Math.round(pos.x + (wide ? sw : sw / 2));
            const centerY = Math.round(pos.y + sh / 2);

            ctx.fillText(char, centerX, centerY);
          }
        }
      };

      drawGridInViewport(grid, COLOR_PRIMARY_TEXT);

      if (scratchLayer && scratchLayer.size > 0) {
        drawGridInViewport(scratchLayer, COLOR_SCRATCH_LAYER);
      }

      const drawSel = (area: SelectionArea) => {
        const { minX, minY, maxX, maxY } = getSelectionBounds(area);
        const pos = GridManager.gridToScreen(
          minX,
          minY,
          offset.x,
          offset.y,
          zoom
        );
        const w = (maxX - minX + 1) * sw;
        const h = (maxY - minY + 1) * sh;
        ctx.fillStyle = COLOR_SELECTION_BG;
        ctx.fillRect(
          Math.round(pos.x),
          Math.round(pos.y),
          Math.round(w),
          Math.round(h)
        );
      };

      selections.forEach(drawSel);
      if (draggingSelection) drawSel(draggingSelection);

      if (textCursor) {
        const pos = GridManager.gridToScreen(
          textCursor.x,
          textCursor.y,
          offset.x,
          offset.y,
          zoom
        );
        const char = grid.get(GridManager.toKey(textCursor.x, textCursor.y));
        const wide = char ? GridManager.isWideChar(char) : false;
        const cursorWidth = wide ? sw * 2 : sw;
        ctx.fillStyle = COLOR_TEXT_CURSOR_BG;
        ctx.fillRect(
          Math.round(pos.x),
          Math.round(pos.y),
          Math.round(cursorWidth),
          Math.round(sh)
        );
        if (char) {
          ctx.fillStyle = COLOR_TEXT_CURSOR_FG;
          ctx.fillText(
            char,
            Math.round(pos.x + (wide ? sw : sw / 2)),
            Math.round(pos.y + sh / 2)
          );
        }
      }

      ctx.fillStyle = COLOR_ORIGIN_MARKER;
      const originX = Math.round(offset.x);
      const originY = Math.round(offset.y);
      ctx.fillRect(originX - 1, originY - 10, 2, 20);
      ctx.fillRect(originX - 10, originY - 1, 20, 2);
    };

    renderRequestId.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(renderRequestId.current);
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
    canvasRef,
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
        if (GridManager.getCharWidth(char) === 2) x++;
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
```
---
```src/utils/grid.ts
import { CELL_WIDTH, CELL_HEIGHT } from "../lib/constants";
import type { Point, GridMap, GridPoint } from "../types";

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

  setPoints(
    target: { set: (key: string, value: string) => void },
    points: GridPoint[]
  ): void {
    points.forEach((p) => {
      target.set(this.toKey(p.x, p.y), p.char);
    });
  },

  getCharWidth(char: string): number {
    if (!char) return 1;

    const codePoint = char.codePointAt(0) || 0;
    if (codePoint < 128) return 1;

    if (/\p{Emoji_Presentation}/u.test(char)) return 2;

    if (
      (codePoint >= 0x2e80 && codePoint <= 0x9fff) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xff00 && codePoint <= 0xffef) ||
      (codePoint >= 0xe000 && codePoint <= 0xf8ff)
    ) {
      return 2;
    }

    return 1;
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

  getGridBounds(grid: GridMap) {
    if (grid.size === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    this.iterate(grid, (char, x, y) => {
      const width = this.getCharWidth(char);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width - 1);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    return { minX, maxX, minY, maxY };
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

export const yMainGrid = yDoc.getMap<string>("main-grid");

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
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { yMainGrid, transactWithHistory } from "../lib/yjs-setup";
import type { CanvasState } from "./interfaces";
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
        const compositeGrid = new Map<string, string>();
        for (const [key, value] of yMainGrid.entries()) {
          compositeGrid.set(key, value);
        }
        set({ grid: compositeGrid });
      });

      return {
        offset: { x: 0, y: 0 },
        zoom: 1,
        grid: new Map(),
        tool: "select",
        brushChar: "#",
        showGrid: true,

        setOffset: (updater) =>
          set((state) => ({ offset: updater(state.offset) })),
        setZoom: (updater) =>
          set((state) => ({
            zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
          })),
        setTool: (tool) => set({ tool, textCursor: null }),
        setBrushChar: (char) => set({ brushChar: char }),
        setShowGrid: (show) => set({ showGrid: show }),

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
        showGrid: state.showGrid,
        grid: Array.from(state.grid.entries()),
      }),
      onRehydrateStorage: (state) => {
        return (hydratedState, error) => {
          if (error || !hydratedState) return;

          const hState = hydratedState as CanvasState;

          if (Array.isArray(hState.grid)) {
            const recoveredMap = new Map<string, string>(
              hState.grid as unknown as [string, string][]
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
}

export interface SelectionSlice {
  selections: SelectionArea[];
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  deleteSelection: () => void;
  fillSelections: () => void;
  fillSelectionsWithChar: (char: string) => void;
  copySelectionToClipboard: () => void;
  cutSelectionToClipboard: () => void;
}

export type CanvasState = {
  offset: Point;
  zoom: number;
  tool: ToolType;
  brushChar: string;
  grid: GridMap;
  showGrid: boolean;

  setOffset: (updater: (prev: Point) => Point) => void;
  setZoom: (updater: (prev: number) => number) => void;
  setTool: (tool: ToolType) => void;
  setBrushChar: (char: string) => void;
  setShowGrid: (show: boolean) => void;
} & DrawingSlice &
  TextSlice &
  SelectionSlice;
```
---
```src/store/utils.ts
import * as Y from "yjs";
import { GridManager } from "../utils/grid";

export const placeCharInMap = (
  targetMap: {
    set(key: string, value: string): void;
    delete(key: string): void;
    get(key: string): string | undefined;
  },
  x: number,
  y: number,
  char: string
) => {
  if (!char) return;

  const leftKey = GridManager.toKey(x - 1, y);
  const leftChar = targetMap.get(leftKey);
  if (leftChar && GridManager.isWideChar(leftChar)) {
    targetMap.delete(leftKey);
  }

  targetMap.set(GridManager.toKey(x, y), char);

  if (GridManager.isWideChar(char)) {
    const rightKey = GridManager.toKey(x + 1, y);
    targetMap.delete(rightKey);
  }
};

export const placeCharInYMap = (
  targetGrid: Y.Map<string>,
  x: number,
  y: number,
  char: string
) => {
  placeCharInMap(targetGrid, x, y, char);
};
```
---
```src/store/slices/drawingSlice.ts
import type { StateCreator } from "zustand";
import type { CanvasState, DrawingSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import type { GridPoint } from "../../types";
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
    const layer = new Map<string, string>();
    points.forEach((p) => {
      placeCharInMap(layer, p.x, p.y, p.char);
    });
    set({ scratchLayer: layer });
  },

  addScratchPoints: (points) => {
    set((state) => {
      const layer = new Map(state.scratchLayer || []);
      points.forEach((p) => {
        placeCharInMap(layer, p.x, p.y, p.char);
      });
      return { scratchLayer: layer };
    });
  },

  updateScratchForShape: (tool, start, end, options) => {
    let points: GridPoint[] = [];
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
    get().setScratchLayer(points);
  },

  commitScratch: () => {
    const { scratchLayer } = get();
    if (!scratchLayer || scratchLayer.size === 0) return;

    transactWithHistory(() => {
      GridManager.iterate(scratchLayer, (char, x, y) => {
        placeCharInYMap(yMainGrid, x, y, char);
      });
    });

    set({ scratchLayer: null });
  },

  clearScratch: () => set({ scratchLayer: null }),

  clearCanvas: () => {
    transactWithHistory(() => {
      yMainGrid.clear();
    });
  },

  erasePoints: (points) => {
    transactWithHistory(() => {
      points.forEach((p) => {
        const key = GridManager.toKey(p.x, p.y);
        const char = yMainGrid.get(key);
        if (!char) {
          const leftKey = GridManager.toKey(p.x - 1, p.y);
          const leftChar = yMainGrid.get(leftKey);
          if (leftChar && GridManager.isWideChar(leftChar)) {
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
import { toast } from "sonner";
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

  addSelection: (area) => {
    set((s) => ({ selections: [...s.selections, area] }));
  },

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

  fillSelections: () => {
    const { selections, brushChar } = get();
    if (selections.length > 0) get().fillSelectionsWithChar(brushChar);
  },

  fillSelectionsWithChar: (char: string) => {
    const { selections } = get();
    const charWidth = GridManager.getCharWidth(char);

    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x += charWidth) {
            if (x + charWidth - 1 > maxX) break;
            placeCharInYMap(yMainGrid, x, y, char);
          }
        }
      });
    });
  },

  copySelectionToClipboard: () => {
    const { grid, selections } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  },

  cutSelectionToClipboard: () => {
    const { grid, selections, deleteSelection } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => {
      deleteSelection();
      toast.success("Cut!");
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

  setTextCursor: (pos) => {
    set({ textCursor: pos, selections: [] });
  },

  writeTextString: (str, startPos) => {
    const { textCursor } = get();
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

        placeCharInYMap(yMainGrid, currentX, currentY, char);
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
      const char = grid.get(GridManager.toKey(newX, textCursor.y));
      newX += GridManager.getCharWidth(char || " ");
    } else if (dx < 0) {
      const leftKey = GridManager.toKey(newX - 1, textCursor.y);
      const leftChar = grid.get(leftKey);
      if (!leftChar) {
        const farLeftChar = grid.get(GridManager.toKey(newX - 2, textCursor.y));
        newX -= farLeftChar && GridManager.isWideChar(farLeftChar) ? 2 : 1;
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

      const charAtMinus1 = grid.get(GridManager.toKey(x - 1, y));
      const charAtMinus2 = grid.get(GridManager.toKey(x - 2, y));

      if (
        !charAtMinus1 &&
        charAtMinus2 &&
        GridManager.isWideChar(charAtMinus2)
      ) {
        deletePos = { x: x - 2, y };
      }

      yMainGrid.delete(GridManager.toKey(deletePos.x, deletePos.y));
      set({ textCursor: deletePos });
    });
  },

  newlineText: () => {
    const { textCursor } = get();
    if (!textCursor) return;
    set({ textCursor: { x: textCursor.x, y: textCursor.y + 1 } });
  },
});
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
  char: z.string(),
});

export type GridPoint = z.infer<typeof GridPointSchema>;

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export type SelectionArea = z.infer<typeof SelectionAreaSchema>;

export type GridMap = Map<string, string>;

export type ToolType =
  | "select"
  | "fill"
  | "brush"
  | "eraser"
  | "box"
  | "line"
  | "stepline"
  | "circle"
  | "text";
```
