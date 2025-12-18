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
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasNode } from "@/types";
import { cn } from "@/lib/utils";

const SceneTreeNode = ({
  node,
  depth = 0,
}: {
  node: CanvasNode;
  depth?: number;
}) => {
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
      case "root":
        return <Box className="size-3.5" />;
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

  const baseClasses = cn(
    "flex w-full items-center gap-2 p-1.5 cursor-pointer rounded-md transition-all text-sm group select-none relative",
    isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
    !node.isVisible && "opacity-50"
  );

  const nodeContent = (
    <div className={baseClasses} onClick={handleSelect}>
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

      {/* 快捷操作区：仅在 Hover 或非默认状态时显示 */}
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
              {node.children.map((child: CanvasNode) => (
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
      <SidebarHeader className="h-14 border-b justify-center px-4">
        <div className="text-sm font-semibold tracking-tight">ASCII Studio</div>
      </SidebarHeader>

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
                sceneGraph.children.map((child: CanvasNode) => (
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
