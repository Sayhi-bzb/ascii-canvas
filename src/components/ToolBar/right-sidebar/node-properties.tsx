import { Lock, Eye, EyeOff, Unlock, Trash2, Copy } from "lucide-react";
import {
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
        <span className="text-sm font-semibold truncate max-w-[140px]">
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
            <span className="font-mono text-[10px] text-muted-foreground/60 truncate max-w-[100px]">
              {node.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
