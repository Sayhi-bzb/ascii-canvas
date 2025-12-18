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
```src/components/ToolBar/left-sidebar/sidebar-header.tsx
import { SidebarHeader as ShadcnSidebarHeader } from "@/components/ui/sidebar";

export const SidebarHeader = () => {
  return (
    <ShadcnSidebarHeader className="h-14 border-b justify-center px-4">
      <div className="text-sm font-semibold tracking-tight">ASCII Studio</div>
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

interface SceneTreeNodeProps {
  node: CanvasNode;
  depth?: number;
}

export const SceneTreeNode = ({ node, depth = 0 }: SceneTreeNodeProps) => {
  const { activeNodeId, setActiveNode, addNode, deleteNode, updateNode } =
    useCanvasStore();

  const isActive = activeNodeId === node.id;

  const getIcon = () => {
    switch (node.type) {
      case "layer":
        return <Layers className="size-3.5 text-blue-500" />;
      case "group":
        return <Folder className="size-3.5 text-yellow-500" />;
      case "item":
        return <FileText className="size-3.5 text-gray-500" />;
      default:
        return <Box className="size-3.5" />;
    }
  };

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNode(node.id, { isVisible: !node.isVisible });
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNode(node.id, { isLocked: !node.isLocked });
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNode(node.id);
  };

  const hasChildren = node.children && node.children.length > 0;

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
          className="size-6 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={toggleVisibility}
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
          className="size-6 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={toggleLock}
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
          <Collapsible defaultOpen className="w-full" data-state="open">
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
import { Button } from "@/components/ui/button";
import type { CanvasNode } from "@/types";

interface NodePropertiesProps {
  node: CanvasNode;
}

export const NodeProperties = ({ node }: NodePropertiesProps) => {
  const isRoot = node.type === "root";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate max-w-[120px]">
          {node.name}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
            {node.isLocked ? (
              <Lock className="size-3" />
            ) : (
              <Unlock className="size-3" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
            {node.isVisible ? (
              <Eye className="size-3" />
            ) : (
              <EyeOff className="size-3" />
            )}
          </Button>
        </div>
      </div>

      <SidebarSeparator className="mx-0" />

      <div className="grid gap-4">
        <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          Transform {isRoot && "(Locked)"}
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
              value={node.x}
              disabled
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
              value={node.y}
              disabled
              className="h-8 text-xs px-2"
            />
          </div>
        </div>
      </div>

      <SidebarSeparator className="mx-0" />

      <div className="grid gap-4">
        <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          Info
        </div>
        <div className="grid gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Type</span>
            <span className="capitalize font-medium">{node.type}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">ID</span>
            <span
              className="font-mono text-[10px] text-muted-foreground/60 truncate max-w-[100px]"
              title={node.id}
            >
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
import { X } from "lucide-react";
import {
  SidebarHeader as ShadcnSidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export const SidebarHeader = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <ShadcnSidebarHeader className="h-14 border-b flex flex-row items-center justify-between px-4">
      <div className="text-sm font-semibold tracking-tight">Properties</div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 -mr-2"
        onClick={toggleSidebar}
      >
        <X className="h-4 w-4" />
      </Button>
    </ShadcnSidebarHeader>
  );
};
```
---
```src/components/ToolBar/sidebar-left.tsx
import * as React from "react";
import { Layers, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useCanvasStore } from "@/store/canvasStore";
import { SidebarHeader } from "./left-sidebar/sidebar-header";
import { SceneTreeNode } from "./left-sidebar/sidebar-node";

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { sceneGraph, addNode } = useCanvasStore();

  return (
    <Sidebar
      collapsible="offcanvas"
      side="left"
      className="absolute left-0 top-0 z-40 border-r"
      {...props}
    >
      <SidebarHeader />

      <ContextMenu>
        <ContextMenuTrigger className="flex-1 overflow-hidden h-full">
          <SidebarContent className="overflow-x-hidden h-full">
            <SidebarMenu className="p-2">
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip="Layers">
                  <Layers className="h-4 w-4" />
                  <span>Layers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarSeparator />

            <div className="px-2 mt-2 flex flex-col gap-0.5">
              {sceneGraph ? (
                sceneGraph.children.map((child) => (
                  <SceneTreeNode key={child.id} node={child} />
                ))
              ) : (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  Loading...
                </div>
              )}
            </div>
          </SidebarContent>
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

      <SidebarRail />
    </Sidebar>
  );
}
```
---
```src/components/ToolBar/sidebar-right.tsx
import * as React from "react";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
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
  const { activeNodeId, sceneGraph } = useCanvasStore();

  const activeNode = React.useMemo(() => {
    if (!activeNodeId || !sceneGraph) return null;
    return findNodeInTree(sceneGraph, activeNodeId);
  }, [activeNodeId, sceneGraph]);

  return (
    <Sidebar
      collapsible="offcanvas"
      side="right"
      className="absolute right-0 top-0 z-40 border-l bg-sidebar pointer-events-auto"
      {...props}
    >
      <SidebarHeader />
      <SidebarContent className="p-4 overflow-x-hidden">
        {activeNode ? <NodeProperties node={activeNode} /> : <EmptyState />}
      </SidebarContent>
    </Sidebar>
  );
}
```
