"use client";

import { useEffect } from "react";
import { Eye, EyeOff, Github, Library, Target } from "lucide-react";
import { SidebarStandard, useSidebar } from "@/components/ui/sidebar";
import { CharLibrary } from "./right-sidebar/char-library";
import { SearchForm } from "./right-sidebar/search-form";
import { useCanvasStore } from "@/store/canvasStore";
import { useLibraryStore } from "@/components/ToolBar/right-sidebar/useLibraryStore";
import { SIDEBAR_ACTION_META, runSidebarAction } from "@/features/sidebar-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportDialog } from "./sidebar-right/export-dialog";
import { HandbookDialog } from "./sidebar-right/handbook-dialog";
import { ClearCanvasDialog } from "./sidebar-right/clear-canvas-dialog";
import { useShallow } from "zustand/react/shallow";

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
  } = useCanvasStore(
    useShallow((state) => ({
      grid: state.grid,
      clearCanvas: state.clearCanvas,
      showGrid: state.showGrid,
      setShowGrid: state.setShowGrid,
      exportShowGrid: state.exportShowGrid,
      setExportShowGrid: state.setExportShowGrid,
      setOffset: state.setOffset,
      setZoom: state.setZoom,
    }))
  );

  const { fetchLibrary } = useLibraryStore();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

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
        <div className={cn("flex w-full flex-col gap-2", isCollapsed && "items-center")}>
          <div
            className={cn(
              "flex items-center justify-between w-full px-1",
              isCollapsed && "flex-col gap-2"
            )}
          >
            <div className={cn("flex items-center gap-1", isCollapsed && "flex-col")}>
              <ExportDialog
                grid={grid}
                exportShowGrid={exportShowGrid}
                setExportShowGrid={setExportShowGrid}
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      tone="subtle"
                      shape="square"
                      size="md"
                      className={cn(
                        "size-8 transition-colors",
                        showGrid ? "text-primary" : "text-muted-foreground"
                      )}
                      onClick={() =>
                        runSidebarAction("toggle-grid", {
                          showGrid,
                          setShowGrid,
                          setZoom,
                          setOffset,
                        })
                      }
                    >
                      {showGrid ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {showGrid
                      ? "Hide Workspace Grid"
                      : SIDEBAR_ACTION_META["toggle-grid"].label}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      tone="subtle"
                      shape="square"
                      size="md"
                      className="size-8 text-muted-foreground"
                      onClick={() =>
                        runSidebarAction("reset-view", {
                          showGrid,
                          setShowGrid,
                          setZoom,
                          setOffset,
                        })
                      }
                    >
                      <Target className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {SIDEBAR_ACTION_META["reset-view"].label}
                  </TooltipContent>
                </Tooltip>

                <HandbookDialog />
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    tone="subtle"
                    shape="square"
                    size="md"
                    className="size-8 text-muted-foreground"
                    onClick={() =>
                      runSidebarAction("open-source-code", {
                        showGrid,
                        setShowGrid,
                        setZoom,
                        setOffset,
                      })
                    }
                  >
                    <Github className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {SIDEBAR_ACTION_META["open-source-code"].label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <ClearCanvasDialog isCollapsed={isCollapsed} onConfirm={clearCanvas} />
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
