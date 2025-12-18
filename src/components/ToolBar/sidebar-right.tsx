import * as React from "react";
import { X, Lock, Eye, EyeOff, Unlock } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasNode } from "@/types";

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
  const { toggleSidebar } = useSidebar();
  const { activeNodeId, sceneGraph } = useCanvasStore();

  const activeNode = React.useMemo(() => {
    if (!activeNodeId || !sceneGraph) return null;
    return findNodeInTree(sceneGraph, activeNodeId);
  }, [activeNodeId, sceneGraph]);

  const hasSelection = !!activeNode;
  const isRoot = activeNode?.type === "root";

  // TODO: 这里未来需要接入 updateNode Action 来真正修改数据
  return (
    <Sidebar
      collapsible="offcanvas"
      side="right"
      className="absolute right-0 top-0 z-40 border-l bg-sidebar pointer-events-auto"
      {...props}
    >
      <SidebarHeader className="h-14 border-b flex flex-row items-center justify-between px-4">
        <div className="text-sm font-semibold tracking-tight">Properties</div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-2"
          onClick={toggleSidebar}
        >
          <X className="h-4 w-4" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="p-4 overflow-x-hidden">
        {hasSelection ? (
          <div className="flex flex-col gap-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate max-w-[120px]">
                {activeNode.name}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled
                >
                  {activeNode.isLocked ? (
                    <Lock className="size-3" />
                  ) : (
                    <Unlock className="size-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled
                >
                  {activeNode.isVisible ? (
                    <Eye className="size-3" />
                  ) : (
                    <EyeOff className="size-3" />
                  )}
                </Button>
              </div>
            </div>

            <SidebarSeparator className="mx-0" />

            {/* Geometry */}
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
                    value={activeNode.x}
                    disabled // 暂时禁用，直到实现 updateNode
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
                    value={activeNode.y}
                    disabled // 暂时禁用
                    className="h-8 text-xs px-2"
                  />
                </div>
              </div>
            </div>

            <SidebarSeparator className="mx-0" />

            {/* Type Specific Info */}
            <div className="grid gap-4">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                Info
              </div>
              <div className="grid gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize font-medium">
                    {activeNode.type}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">ID</span>
                  <span
                    className="font-mono text-[10px] text-muted-foreground/60 truncate max-w-[100px]"
                    title={activeNode.id}
                  >
                    {activeNode.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-center gap-2 text-muted-foreground/60">
            <div className="p-3 border-2 border-dashed rounded-lg">
              <div className="size-8 rounded bg-muted/50" />
            </div>
            <p className="text-xs font-medium">Select an object</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
