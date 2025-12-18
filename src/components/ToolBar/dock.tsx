"use client";

import {
  MousePointer2,
  Square,
  Minus,
  Pencil,
  Eraser,
  PaintBucket,
  Undo2,
  Download,
} from "lucide-react";
import { MenuDock, type MenuDockItem } from "@/components/ui/menu-dock";
import { cn } from "@/lib/utils";
import type { ToolType } from "@/types";

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
  onExport: () => void;
}

export function Toolbar({ tool, setTool, onUndo, onExport }: ToolbarProps) {
  const menuItems: MenuDockItem[] = [
    {
      id: "select",
      label: "Select",
      icon: MousePointer2,
      onClick: () => setTool("select"),
    },
    {
      id: "brush",
      label: "Brush",
      icon: Pencil,
      onClick: () => setTool("brush"),
    },
    {
      id: "box",
      label: "Rectangle",
      icon: Square,
      onClick: () => setTool("box"),
    },
    {
      id: "line",
      label: "Line",
      icon: Minus,
      onClick: () => setTool("line"),
    },
    {
      id: "fill",
      label: "Fill",
      icon: PaintBucket,
      onClick: () => setTool("fill"),
    },
    {
      id: "eraser",
      label: "Eraser",
      icon: Eraser,
      onClick: () => setTool("eraser"),
    },
    {
      id: "undo",
      label: "Undo",
      icon: Undo2,
      onClick: onUndo,
    },
    {
      id: "export",
      label: "Export",
      icon: Download,
      onClick: onExport,
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        <MenuDock
          items={menuItems}
          variant="default"
          showLabels={false}
          activeId={tool}
          className={cn(
            "shadow-2xl border-primary/10 bg-background/80 backdrop-blur-md",
            "rounded-2xl"
          )}
        />
      </div>
    </div>
  );
}
