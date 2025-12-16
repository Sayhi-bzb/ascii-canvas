import React from "react";
import {
  File,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  Eraser,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "./ui/button-group";
import type { ToolType } from "../types";

interface ToolButtonProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
}

interface ActionButtonProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface FileButtonProps {
  onExport: () => void;
  onClear: () => void;
}

export const Toolbar = ({
  tool,
  setTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onClear,
}: ToolButtonProps & ActionButtonProps & FileButtonProps) => {
  const tools: { name: ToolType; label: string; icon: React.ElementType }[] = [
    { name: "move", label: "Move", icon: MousePointer2 },
    { name: "brush", label: "Brush", icon: Pencil },
    { name: "line", label: "Line", icon: Minus },
    { name: "box", label: "Box", icon: Square },
    { name: "text", label: "Text", icon: Type },
    { name: "eraser", label: "Eraser", icon: Eraser },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <ButtonGroup className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-1.5">
          {/* File Group */}
          <ButtonGroup>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <File size={20} />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>File</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="top" align="start" className="mb-2">
                <DropdownMenuItem onClick={onExport}>
                  <p>Export</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClear} className="text-red-500">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Clear</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

          <ButtonGroupSeparator />

          {/* Tools Group */}
          <ButtonGroup>
            {tools.map((t) => (
              <Tooltip key={t.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant={tool === t.name ? "default" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setTool(t.name)}
                  >
                    <t.icon size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </ButtonGroup>

          <ButtonGroupSeparator />

          {/* History Group */}
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo</p>
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </ButtonGroup>
      </div>
    </TooltipProvider>
  );
};
