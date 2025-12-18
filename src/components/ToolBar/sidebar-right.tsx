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
