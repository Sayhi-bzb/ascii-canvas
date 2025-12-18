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
