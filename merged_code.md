```src/components/ToolBar/dock.tsx
"use client";

import { useState, useRef } from "react";
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
  Shapes,
} from "lucide-react";
import { MenuDock, type MenuDockItem } from "@/components/ui/menu-dock";
import { cn } from "@/lib/utils";
import type { ToolType } from "@/types";
import { useCanvasStore } from "@/store/canvasStore";
import { Input } from "@/components/ui/input";

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
  onExport: () => void;
}

export function Toolbar({ tool, setTool, onUndo, onExport }: ToolbarProps) {
  const { brushChar, setBrushChar } = useCanvasStore();
  const [lastUsedShape, setLastUsedShape] = useState<ToolType>("box");
  const inputRef = useRef<HTMLInputElement>(null);

  const shapeTools: ToolType[] = ["box", "circle", "line", "stepline"];
  const isShapeGroupActive = shapeTools.includes(tool);

  const materialPresets = ["*", "~", "x", ".", "@", "▒"];

  const getShapeIcon = (type: ToolType) => {
    switch (type) {
      case "box":
        return Square;
      case "circle":
        return CircleIcon;
      case "line":
        return Minus;
      case "stepline":
        return LineSquiggle;
      default:
        return Shapes;
    }
  };

  const CurrentShapeIcon = getShapeIcon(
    isShapeGroupActive ? tool : lastUsedShape
  );

  const menuItems: MenuDockItem[] = [
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
      subItems: [
        {
          id: "custom-input",
          label: "Custom Material",
          icon: () => (
            <div
              className="flex items-center px-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={inputRef}
                className="h-7 w-12 text-center p-0 font-mono text-sm bg-muted focus-visible:ring-1"
                placeholder="Char"
                maxLength={2}
                value={brushChar}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setBrushChar(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setTool("brush");
                  }
                }}
              />
            </div>
          ),
          onClick: () => {
            inputRef.current?.focus();
          },
        },
        ...materialPresets.map((char) => ({
          id: `brush-char-${char}`,
          label: `Material: ${char}`,
          icon: () => (
            <span className="font-mono font-bold text-lg">{char}</span>
          ),
          onClick: () => {
            setBrushChar(char);
            setTool("brush");
          },
        })),
      ],
    },
    {
      id: "shape-group",
      label: "Shapes",
      icon: CurrentShapeIcon,
      subItems: [
        {
          id: "tool-box",
          label: "Rectangle",
          icon: Square,
          onClick: () => {
            setTool("box");
            setLastUsedShape("box");
          },
        },
        {
          id: "tool-circle",
          label: "Circle",
          icon: CircleIcon,
          onClick: () => {
            setTool("circle");
            setLastUsedShape("circle");
          },
        },
        {
          id: "tool-line",
          label: "Line",
          icon: Minus,
          onClick: () => {
            setTool("line");
            setLastUsedShape("line");
          },
        },
        {
          id: "tool-stepline",
          label: "Curve",
          icon: LineSquiggle,
          onClick: () => {
            setTool("stepline");
            setLastUsedShape("stepline");
          },
        },
      ],
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
    {
      id: "undo",
      label: "Undo",
      icon: Undo2,
      onClick: onUndo,
    },
    {
      id: "export",
      label: "Export",
      icon: Download,
      onClick: onExport,
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        <MenuDock
          items={menuItems}
          variant="default"
          showLabels={false}
          activeId={isShapeGroupActive ? "shape-group" : tool}
          className={cn(
            "shadow-2xl border-primary/10 bg-background/80 backdrop-blur-md",
            "rounded-2xl"
          )}
        />
      </div>
    </div>
  );
}
```
---
```src/components/ToolBar/sidebar-left.tsx
"use client";

import * as React from "react";
import { Plus, MoreHorizontal, Settings2 } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarStandard,
} from "@/components/ui/sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { Logo } from "./left-sidebar/logo";
import { SceneTreeNode } from "./left-sidebar/sidebar-node";

export function SidebarLeft() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { sceneGraph, addNode } = useCanvasStore();

  const footer = (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Canvas Settings">
          <Settings2 className="size-4" />
          {!isCollapsed && <span>Settings</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="More options">
          <MoreHorizontal className="size-4" />
          {!isCollapsed && <span>Management</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );

  return (
    <SidebarStandard
      variant="floating"
      icon={<Logo className="h-8 w-8" />}
      title="ASCII Studio"
      footer={footer}
    >
      <ContextMenu>
        <ContextMenuTrigger className="flex-1 overflow-hidden h-full">
          <div className="flex flex-col gap-1">
            {!isCollapsed && (
              <div className="px-2 mb-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">
                  Scene Graph
                </span>
              </div>
            )}

            <div
              className={cn(
                "flex flex-col gap-0.5",
                isCollapsed && "items-center"
              )}
            >
              {sceneGraph ? (
                sceneGraph.children.map((child) => (
                  <SceneTreeNode
                    key={child.id}
                    node={child}
                    isSidebarCollapsed={isCollapsed}
                  />
                ))
              ) : (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  Loading...
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => addNode("root", "layer", "New Layer")}
          >
            <Plus className="mr-2 size-3.5" />
            New Layer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarStandard>
  );
}
```
---
```src/components/ToolBar/sidebar-right.tsx
"use client";

import * as React from "react";
import { Trash2, Share2, Settings2 } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarStandard,
} from "@/components/ui/sidebar";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasNode } from "@/types";
import { NodeProperties } from "./right-sidebar/node-properties";
import { EmptyState } from "./right-sidebar/empty-state";

const findNodeInTree = (node: CanvasNode, id: string): CanvasNode | null => {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }
  return null;
};

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof SidebarStandard>) {
  const { activeNodeId, sceneGraph, deleteNode } = useCanvasStore();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const activeNode = React.useMemo(() => {
    if (!activeNodeId || !sceneGraph) return null;
    return findNodeInTree(sceneGraph, activeNodeId);
  }, [activeNodeId, sceneGraph]);

  const footer = (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Delete Selected"
          disabled={!activeNode || activeNode.id === "root"}
          onClick={() => activeNode && deleteNode(activeNode.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          {!isCollapsed && <span>Delete Object</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Share Component" disabled={!activeNode}>
          <Share2 className="size-4" />
          {!isCollapsed && <span>Export Selection</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );

  return (
    <SidebarStandard
      variant="floating"
      side="right"
      title="Properties"
      className="pointer-events-auto"
      icon={
        <div className="flex items-center justify-center rounded-lg bg-accent p-1.5 shrink-0">
          <Settings2 className="size-4 text-accent-foreground" />
        </div>
      }
      footer={footer}
      {...props}
    >
      <div className="p-2 overflow-x-hidden">
        {activeNode ? (
          <NodeProperties node={activeNode} isCollapsed={isCollapsed} />
        ) : (
          <EmptyState />
        )}
      </div>
    </SidebarStandard>
  );
}
```
---
```src/components/ToolBar/left-sidebar/logo.tsx
import { Box } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-primary p-1 ${className}`}
    >
      <Box className="size-5 text-primary-foreground" />
    </div>
  );
}
```
---
```src/components/ToolBar/left-sidebar/sidebar-node.tsx
import * as React from "react";
import {
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasNode } from "@/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SceneTreeNodeProps {
  node: CanvasNode;
  depth?: number;
  isSidebarCollapsed?: boolean;
}

export const SceneTreeNode = ({
  node,
  depth = 0,
  isSidebarCollapsed,
}: SceneTreeNodeProps) => {
  const { activeNodeId, setActiveNode, addNode, deleteNode, updateNode } =
    useCanvasStore();

  const isActive = activeNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNode(node.id);
  };

  if (isSidebarCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center size-9 rounded-md cursor-pointer transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted/50",
              !node.isVisible && "opacity-50"
            )}
            onClick={handleSelect}
          >
            <Layers
              className={cn(
                "size-4",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{node.name}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const nodeContent = (
    <div
      className={cn(
        "flex w-full items-center gap-2 p-1.5 cursor-pointer rounded-md transition-all text-sm group select-none relative",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
        !node.isVisible && "opacity-50"
      )}
      onClick={handleSelect}
    >
      <div
        className="flex items-center gap-2 flex-1 min-w-0"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {hasChildren && (
          <div className="size-4 flex items-center justify-center">
            <ChevronRight
              className={cn(
                "size-3 transition-transform text-muted-foreground",
                "group-data-[state=open]:rotate-90"
              )}
            />
          </div>
        )}
        {!hasChildren && <div className="size-4" />}
        <Layers
          className={cn(
            "size-4",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span
          className={cn("truncate", isActive ? "font-semibold" : "font-normal")}
        >
          {node.name}
        </span>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 h-6 w-6 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            updateNode(node.id, { isVisible: !node.isVisible });
          }}
        >
          {node.isVisible ? (
            <Eye className="size-3" />
          ) : (
            <EyeOff className="size-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 h-6 w-6 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            updateNode(node.id, { isLocked: !node.isLocked });
          }}
        >
          {node.isLocked ? (
            <Lock className="size-3" />
          ) : (
            <Unlock className="size-3" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger className="w-full">
        {hasChildren ? (
          <Collapsible defaultOpen className="w-full">
            <CollapsibleTrigger asChild>{nodeContent}</CollapsibleTrigger>
            <CollapsibleContent>
              {node.children.map((child) => (
                <SceneTreeNode key={child.id} node={child} depth={depth + 1} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          nodeContent
        )}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem
          className="gap-2"
          onClick={() => addNode(node.id, "layer", "New Layer")}
        >
          <Plus className="size-3.5" />
          <span>Add Layer</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={node.id === "root"}
          onClick={() => deleteNode(node.id)}
          className="gap-2"
        >
          <Trash2 className="size-3.5" />
          <span>Delete Layer</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
```
---
```src/components/ToolBar/right-sidebar/empty-state.tsx
export const EmptyState = () => {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-2 text-muted-foreground/60">
      <div className="p-3 border-2 border-dashed rounded-lg">
        <div className="size-8 rounded bg-muted/50" />
      </div>
      <p className="text-xs font-medium">Select an object</p>
    </div>
  );
};
```
---
```src/components/ToolBar/right-sidebar/node-properties.tsx
import { Lock, Eye, EyeOff, Unlock } from "lucide-react";
import { SidebarSeparator } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CanvasNode } from "@/types";

interface NodePropertiesProps {
  node: CanvasNode;
  isCollapsed?: boolean;
}

export const NodeProperties = ({ node, isCollapsed }: NodePropertiesProps) => {
  const isRoot = node.type === "root";

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <div
          className="size-2 rounded-full bg-blue-500 animate-pulse"
          title="Object Selected"
        />
        <SidebarSeparator />
        <div className="flex flex-col gap-2">
          {node.isLocked ? (
            <Lock className="size-4 text-muted-foreground" />
          ) : (
            <Unlock className="size-4 text-muted-foreground" />
          )}
          {node.isVisible ? (
            <Eye className="size-4 text-muted-foreground" />
          ) : (
            <EyeOff className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold truncate max-w-35">
          {node.name}
        </span>
      </div>

      <SidebarSeparator className="mx-0" />

      <div className="grid gap-4">
        <div className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">
          Transform {isRoot && "(Fixed)"}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label
              htmlFor="pos-x"
              className="text-[10px] text-muted-foreground uppercase font-bold"
            >
              X
            </Label>
            <Input
              id="pos-x"
              value={node.x}
              disabled
              className="h-8 text-xs bg-muted/30"
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="pos-y"
              className="text-[10px] text-muted-foreground uppercase font-bold"
            >
              Y
            </Label>
            <Input
              id="pos-y"
              value={node.y}
              disabled
              className="h-8 text-xs bg-muted/30"
            />
          </div>
        </div>
      </div>

      <SidebarSeparator className="mx-0" />

      <div className="grid gap-4">
        <div className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">
          Hierarchy
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs items-center">
            <span className="text-muted-foreground">Type</span>
            <span className="capitalize font-medium px-2 py-0.5 bg-secondary rounded text-[10px]">
              {node.type}
            </span>
          </div>
          <div className="flex justify-between text-xs items-center">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-[10px] text-muted-foreground/60 truncate max-w-25">
              {node.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```
