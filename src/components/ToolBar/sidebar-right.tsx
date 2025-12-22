"use client";

import {
  Library,
  Trash2,
  Github,
  Eye,
  EyeOff,
  Target,
  Download,
  Copy,
  ImageIcon,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { exportToString, exportToPNG } from "@/utils/export";
import { ExportPreview } from "./export-preview";
import { ActionButton } from "@/components/ui/action-button";

export function SidebarRight() {
  const { grid, clearCanvas, showGrid, setShowGrid, setOffset, setZoom } =
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
            "flex w-full flex-col gap-2",
            isCollapsed && "items-center"
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
              <Dialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Download className="size-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Export Blueprint
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <DialogContent className="sm:max-w-xs gap-0 p-0 overflow-hidden border-none shadow-2xl">
                  <div className="bg-muted/30 p-5 pb-3">
                    <DialogHeader>
                      <DialogTitle className="text-base">Export</DialogTitle>
                      <DialogDescription className="text-[10px] uppercase tracking-widest">
                        ASCII Metropolis
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    <div className="aspect-video w-full relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur opacity-25"></div>
                      <div className="relative h-full border rounded-xl bg-background overflow-hidden shadow-inner p-3">
                        <ExportPreview />
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 py-2">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ActionButton
                              variant="outline"
                              size="md"
                              icon={Copy}
                              className="border-2 rounded-xl"
                              onAction={() =>
                                navigator.clipboard.writeText(
                                  exportToString(grid)
                                )
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Copy Text
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ActionButton
                              variant="outline"
                              size="md"
                              icon={ImageIcon}
                              className="border-2 rounded-xl"
                              onAction={() => exportToPNG(grid)}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Save Image
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">
                        Workspace Grid
                      </span>
                      <Button
                        variant={showGrid ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setShowGrid(!showGrid)}
                        className="h-6 px-2 rounded-md text-[10px] uppercase font-bold"
                      >
                        {showGrid ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <TooltipProvider>
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
              </TooltipProvider>
            </div>

            <TooltipProvider>
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
            </TooltipProvider>
          </div>

          <AlertDialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size={isCollapsed ? "icon" : "default"}
                      className={cn(
                        "justify-start gap-2 text-destructive hover:bg-destructive/10 transition-colors",
                        isCollapsed
                          ? "size-8 justify-center"
                          : "w-full h-8 px-2"
                      )}
                    >
                      <Trash2 className="size-4" />
                      {!isCollapsed && (
                        <span className="font-medium text-xs">
                          Clear Canvas
                        </span>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="left">Clear Canvas</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Issuing a Demolition Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will completely clear the current blueprint.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearCanvas}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm
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
