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
```src/components/ToolBar/left-sidebar/sidebar-header.tsx
import {
  SidebarHeader as ShadcnSidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export const SidebarHeader = () => {
  return (
    <ShadcnSidebarHeader className="h-14 border-b flex flex-row items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <div className="text-sm font-semibold tracking-tight truncate">
        ASCII Studio
      </div>
    </ShadcnSidebarHeader>
  );
};
```
---
```src/components/ToolBar/left-sidebar/sidebar-node.tsx
import * as React from "react";
import {
  Layers,
  ChevronRight,
  Box,
  FileText,
  Folder,
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
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
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

  const getIcon = () => {
    switch (node.type) {
      case "layer":
        return <Layers className="size-4 text-blue-500" />;
      case "group":
        return <Folder className="size-4 text-yellow-500" />;
      case "item":
        return <FileText className="size-4 text-gray-500" />;
      default:
        return <Box className="size-4" />;
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNode(node.id);
  };

  const hasChildren = node.children && node.children.length > 0;

  // 如果侧边栏收缩，只显示图标
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
            {getIcon()}
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
        {getIcon()}
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
      <ContextMenuTrigger>
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
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <Plus className="size-3.5" />
            <span>Add Child</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              onClick={() => addNode(node.id, "layer", "New Layer")}
            >
              Layer
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => addNode(node.id, "group", "New Group")}
            >
              Group
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => addNode(node.id, "item", "New Canvas")}
            >
              Canvas Item
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={node.id === "root"}
          onClick={() => deleteNode(node.id)}
          className="gap-2"
        >
          <Trash2 className="size-3.5" />
          <span>Delete Node</span>
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
---
```src/components/ToolBar/right-sidebar/sidebar-header.tsx
"use client";

import { Settings2 } from "lucide-react";
import {
  SidebarHeader as ShadcnSidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const SidebarHeader = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <ShadcnSidebarHeader
      className={cn(
        "flex py-4",
        isCollapsed
          ? "flex-col items-center justify-center gap-y-4"
          : "flex-row items-center justify-between px-4 border-b"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center rounded-lg bg-accent p-1.5 shrink-0">
          <Settings2 className="size-4 text-accent-foreground" />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-sm tracking-tight whitespace-nowrap">
            Properties
          </span>
        )}
      </div>

      <div
        className={cn(
          "flex items-center gap-2",
          isCollapsed ? "flex-col-reverse" : "flex-row"
        )}
      >
        <SidebarTrigger />
      </div>
    </ShadcnSidebarHeader>
  );
};
```
---
```src/components/ToolBar/dock.tsx
"use client";

import {
  MousePointer2,
  Square,
  Minus,
  Pencil,
  Eraser,
  PaintBucket,
  Undo2,
  Download,
} from "lucide-react";
import { MenuDock, type MenuDockItem } from "@/components/ui/menu-dock";
import { cn } from "@/lib/utils";
import type { ToolType } from "@/types";

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
  onExport: () => void;
  // 移除了未使用的 onRedo, canUndo, canRedo, onClear 等合同条约
}

export function Toolbar({ tool, setTool, onUndo, onExport }: ToolbarProps) {
  // 精选 8 个核心功能位，确保下划线标线绝对对齐
  const menuItems: MenuDockItem[] = [
    {
      id: "select",
      label: "Select (V)",
      icon: MousePointer2,
      onClick: () => setTool("select"),
    },
    {
      id: "brush",
      label: "Brush (B)",
      icon: Pencil,
      onClick: () => setTool("brush"),
    },
    {
      id: "box",
      label: "Rectangle (R)",
      icon: Square,
      onClick: () => setTool("box"),
    },
    {
      id: "line",
      label: "Line (L)",
      icon: Minus,
      onClick: () => setTool("line"),
    },
    {
      id: "fill",
      label: "Fill (F)",
      icon: PaintBucket,
      onClick: () => setTool("fill"),
    },
    {
      id: "eraser",
      label: "Eraser (E)",
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
          activeId={tool}
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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
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

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="z-40 transition-none"
    >
      <SidebarHeader
        className={cn(
          "flex py-4",
          isCollapsed
            ? "flex-col items-center justify-center gap-y-4"
            : "flex-row items-center justify-between px-4"
        )}
      >
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-sm tracking-tight whitespace-nowrap">
              ASCII Studio
            </span>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-col-reverse" : "flex-row"
          )}
        >
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-2 px-2 py-2">
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
              onClick={() => addNode("root", "layer", "New Top Layer")}
            >
              <Plus className="mr-2 size-3.5" />
              New Top Layer
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </SidebarContent>

      <SidebarFooter className="p-2">
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
      </SidebarFooter>
    </Sidebar>
  );
}
```
---
```src/components/ToolBar/sidebar-right.tsx
"use client";

import * as React from "react";
import { Trash2, Share2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasNode } from "@/types";
import { SidebarHeader } from "./right-sidebar/sidebar-header";
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
}: React.ComponentProps<typeof Sidebar>) {
  const { activeNodeId, sceneGraph, deleteNode } = useCanvasStore();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const activeNode = React.useMemo(() => {
    if (!activeNodeId || !sceneGraph) return null;
    return findNodeInTree(sceneGraph, activeNodeId);
  }, [activeNodeId, sceneGraph]);

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      side="right"
      /* transition-none 强制宽度瞬间切换，不产生平滑缩放效果 */
      className="z-40 pointer-events-auto transition-none"
      {...props}
    >
      <SidebarHeader />

      <SidebarContent className="p-4 overflow-x-hidden">
        {activeNode ? (
          <NodeProperties node={activeNode} isCollapsed={isCollapsed} />
        ) : (
          <EmptyState />
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
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
      </SidebarFooter>
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
