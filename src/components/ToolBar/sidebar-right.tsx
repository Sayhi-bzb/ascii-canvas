"use client";

import { Library, Trash2, Github, Eye, EyeOff, Target } from "lucide-react";
import { SidebarStandard, useSidebar } from "@/components/ui/sidebar";
import { CharLibrary } from "./right-sidebar/char-library";
import { useCanvasStore } from "@/store/canvasStore";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarRight() {
  const { clearCanvas, showGrid, setShowGrid, setOffset, setZoom } =
    useCanvasStore();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const handleResetView = () => {
    setZoom(() => 1);
    setOffset(() => ({ x: 0, y: 0 }));
  };

  return (
    <SidebarStandard
      variant="floating"
      side="right"
      title="Library"
      className="pointer-events-auto"
      icon={
        <div className="flex items-center justify-center rounded-lg bg-accent p-1.5 shrink-0">
          <Library className="size-4 text-accent-foreground" />
        </div>
      }
      footer={
        <div
          className={cn(
            "flex w-full transition-all duration-300",
            isCollapsed ? "flex-col items-center gap-2" : "flex-col gap-2"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between w-full px-1",
              isCollapsed && "flex-col gap-2"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1",
                isCollapsed && "flex-col"
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-8 transition-colors",
                      showGrid ? "text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => setShowGrid(!showGrid)}
                  >
                    {showGrid ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {showGrid ? "Hide Grid" : "Show Grid"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={handleResetView}
                  >
                    <Target className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Reset View</TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() => window.open("https://github.com", "_blank")}
                >
                  <Github className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Source Code</TooltipContent>
            </Tooltip>
          </div>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size={isCollapsed ? "icon" : "default"}
                    className={cn(
                      "justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors",
                      isCollapsed ? "size-8 justify-center" : "w-full h-8 px-2"
                    )}
                  >
                    <Trash2 className="size-4" />
                    {!isCollapsed && (
                      <span className="font-medium text-xs">Clear Canvas</span>
                    )}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="left">Clear Canvas</TooltipContent>
              )}
            </Tooltip>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Issuing a Demolition Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will completely clear the current blueprint. All ASCII
                  structures will be dismantled. This can be undone via Ctrl+Z.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearCanvas}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm Demolition
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    >
      <CharLibrary />
    </SidebarStandard>
  );
}
