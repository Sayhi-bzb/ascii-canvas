"use client";

import { useEffect } from "react";
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
  CircleHelp,
  Keyboard,
  Mouse,
  Move,
  Type,
  Maximize,
  Info,
} from "lucide-react";
import { SidebarStandard, useSidebar } from "@/components/ui/sidebar";
import { CharLibrary } from "./right-sidebar/char-library";
import { SearchForm } from "./right-sidebar/search-form";
import { useCanvasStore } from "@/store/canvasStore";
import { useLibraryStore } from "@/components/ToolBar/right-sidebar/useLibraryStore";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export function SidebarRight() {
  const {
    grid,
    clearCanvas,
    showGrid,
    setShowGrid,
    exportShowGrid,
    setExportShowGrid,
    setOffset,
    setZoom,
  } = useCanvasStore();

  const { fetchLibrary } = useLibraryStore();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

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
                              onAction={() => exportToPNG(grid, exportShowGrid)}
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
                        Print Grid on PNG
                      </span>
                      <Button
                        variant={exportShowGrid ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setExportShowGrid(!exportShowGrid)}
                        className="h-6 px-2 rounded-md text-[10px] uppercase font-bold"
                      >
                        {exportShowGrid ? "ON" : "OFF"}
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
                    {showGrid ? "Hide Workspace Grid" : "Show Workspace Grid"}
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

                <Dialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary"
                        >
                          <CircleHelp className="size-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">User Manual</TooltipContent>
                  </Tooltip>
                  <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
                    <div className="bg-muted/30 p-5 pb-4 border-b">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Keyboard className="size-5 text-primary" />
                          <span>Mayor's Handbook v2.0</span>
                        </DialogTitle>
                        <DialogDescription>
                          Advanced protocols for your ASCII Metropolis.
                        </DialogDescription>
                      </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[65vh] overflow-y-auto">
                      <div className="p-5 space-y-6">
                        <section className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                            <Move className="size-4" /> Navigation & Viewport
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-muted/50 p-2 rounded-md flex justify-between items-center">
                              <span>Pan View</span>
                              <div className="flex gap-1 items-center">
                                <kbd className="bg-background px-1.2 py-0.5 rounded border text-[9px] font-mono shadow-sm">
                                  Space
                                </kbd>
                                <span className="text-muted-foreground text-[10px]">
                                  +
                                </span>
                                <Mouse className="size-3" />
                              </div>
                            </div>
                            <div className="bg-muted/50 p-2 rounded-md flex justify-between items-center">
                              <span>Zoom</span>
                              <div className="flex gap-1">
                                <kbd className="bg-background px-1.2 py-0.5 rounded border text-[9px] font-mono shadow-sm">
                                  Ctrl
                                </kbd>
                                <span className="text-muted-foreground text-[10px]">
                                  +
                                </span>
                                <span className="font-mono text-[10px]">
                                  Scroll
                                </span>
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                            <Maximize className="size-4" /> Rapid Zoning
                            (Selection)
                          </h4>
                          <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-xs space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="font-bold text-foreground">
                                  Anchor Surveying
                                </p>
                                <p className="text-muted-foreground">
                                  Click a point, then{" "}
                                  <kbd className="font-mono bg-muted px-1 rounded">
                                    Shift + Click
                                  </kbd>{" "}
                                  another to instantly frame the lot.
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-between items-start border-t border-primary/10 pt-2">
                              <div className="space-y-1">
                                <p className="font-bold text-foreground">
                                  Mass Pouring (Fill)
                                </p>
                                <p className="text-muted-foreground">
                                  Select an area and{" "}
                                  <span className="text-primary font-bold">
                                    press any character
                                  </span>{" "}
                                  to fill the entire sector instantly.
                                </p>
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                            <Type className="size-4" /> Construction & Typing
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Setback Inheritance
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Auto-aligns newline with previous indentation
                                </span>
                              </div>
                              <kbd className="bg-muted px-2 py-0.5 rounded border text-[10px] font-mono">
                                Enter
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Modular Paving
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Instantly pavs 2 grids of vacant space
                                </span>
                              </div>
                              <kbd className="bg-muted px-2 py-0.5 rounded border text-[10px] font-mono">
                                Tab
                              </kbd>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground italic">
                                Quick Undo
                              </span>
                              <div className="flex gap-1">
                                <kbd className="bg-muted px-1.5 py-0.5 rounded border text-[10px] font-mono">
                                  Ctrl
                                </kbd>
                                <span className="text-muted-foreground">+</span>
                                <kbd className="bg-muted px-1.5 py-0.5 rounded border text-[10px] font-mono">
                                  Z
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </section>

                        <div className="flex gap-2 p-3 rounded-md bg-accent/50 border border-border">
                          <Info className="size-4 text-primary shrink-0" />
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            <strong className="text-foreground">
                              Pro Tip:
                            </strong>{" "}
                            Use the{" "}
                            <span className="font-bold underline">
                              Select tool
                            </span>{" "}
                            to place the cursor. Once a zoning box is active,
                            typing acts as a fill command instead of cursor
                            placement.
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
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
      <div className="flex flex-col h-full">
        {!isCollapsed && <SearchForm />}
        <ScrollArea className="flex-1">
          <CharLibrary />
        </ScrollArea>
      </div>
    </SidebarStandard>
  );
}
