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
