"use client";

import { useState, useRef } from "react";
import {
  MousePointer2,
  Square,
  Minus,
  Pencil,
  Eraser,
  PaintBucket,
  Undo2,
  Download,
  LineSquiggle,
  Circle as CircleIcon,
  Shapes,
} from "lucide-react";
import { MenuDock, type MenuDockItem } from "@/components/ui/menu-dock";
import { cn } from "@/lib/utils";
import type { ToolType } from "@/types";
import { useCanvasStore } from "@/store/canvasStore";
import { Input } from "@/components/ui/input";

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onUndo: () => void;
  onExport: () => void;
}

export function Toolbar({ tool, setTool, onUndo, onExport }: ToolbarProps) {
  const { brushChar, setBrushChar } = useCanvasStore();
  const [lastUsedShape, setLastUsedShape] = useState<ToolType>("box");
  const inputRef = useRef<HTMLInputElement>(null);

  const shapeTools: ToolType[] = ["box", "circle", "line", "stepline"];
  const isShapeGroupActive = shapeTools.includes(tool);

  const materialPresets = ["*", "~", "x", ".", "@", "▒"];

  const getShapeIcon = (type: ToolType) => {
    switch (type) {
      case "box":
        return Square;
      case "circle":
        return CircleIcon;
      case "line":
        return Minus;
      case "stepline":
        return LineSquiggle;
      default:
        return Shapes;
    }
  };

  const CurrentShapeIcon = getShapeIcon(
    isShapeGroupActive ? tool : lastUsedShape
  );

  const menuItems: MenuDockItem[] = [
    {
      id: "select",
      label: "Select",
      icon: MousePointer2,
      onClick: () => setTool("select"),
    },
    {
      id: "brush",
      label: `Brush (${brushChar})`,
      icon: Pencil,
      onClick: () => setTool("brush"),
      subItems: [
        {
          id: "custom-input",
          label: "Custom Material",
          icon: () => (
            <div
              className="flex items-center px-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={inputRef}
                className="h-7 w-12 text-center p-0 font-mono text-sm bg-muted focus-visible:ring-1"
                placeholder="Char"
                maxLength={2}
                value={brushChar}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setBrushChar(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setTool("brush");
                  }
                }}
              />
            </div>
          ),
          onClick: () => {
            inputRef.current?.focus();
          },
        },
        ...materialPresets.map((char) => ({
          id: `brush-char-${char}`,
          label: `Material: ${char}`,
          icon: () => (
            <span className="font-mono font-bold text-lg">{char}</span>
          ),
          onClick: () => {
            setBrushChar(char);
            setTool("brush");
          },
        })),
      ],
    },
    {
      id: "shape-group",
      label: "Shapes",
      icon: CurrentShapeIcon,
      subItems: [
        {
          id: "tool-box",
          label: "Rectangle",
          icon: Square,
          onClick: () => {
            setTool("box");
            setLastUsedShape("box");
          },
        },
        {
          id: "tool-circle",
          label: "Circle",
          icon: CircleIcon,
          onClick: () => {
            setTool("circle");
            setLastUsedShape("circle");
          },
        },
        {
          id: "tool-line",
          label: "Line",
          icon: Minus,
          onClick: () => {
            setTool("line");
            setLastUsedShape("line");
          },
        },
        {
          id: "tool-stepline",
          label: "Curve",
          icon: LineSquiggle,
          onClick: () => {
            setTool("stepline");
            setLastUsedShape("stepline");
          },
        },
      ],
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
          activeId={isShapeGroupActive ? "shape-group" : tool}
          className={cn(
            "shadow-2xl border-primary/10 bg-background/80 backdrop-blur-md",
            "rounded-2xl"
          )}
        />
      </div>
    </div>
  );
}
