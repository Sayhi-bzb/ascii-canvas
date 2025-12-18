"use client";

import * as React from "react";
import { Plus, MoreHorizontal, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
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
    <Sidebar variant="floating" collapsible="icon" className="z-40">
      <SidebarHeader
        className={cn(
          "flex py-4 transition-all duration-300",
          isCollapsed
            ? "flex-col items-center justify-center gap-y-4"
            : "flex-row items-center justify-between px-4"
        )}
      >
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 shrink-0" />
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-sm tracking-tight"
            >
              ASCII Studio
            </motion.span>
          )}
        </div>

        <motion.div
          layout
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-col-reverse" : "flex-row"
          )}
        >
          <SidebarTrigger />
        </motion.div>
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
