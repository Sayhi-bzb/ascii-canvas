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
