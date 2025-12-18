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
