"use client";

import { Clapperboard, Copy, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { SidebarStandard, useSidebar } from "@/components/ui/sidebar";
import { useCanvasStore } from "@/store/canvasStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function SidebarLeft() {
  const {
    canvasMode,
    animationTimeline,
    setAnimationCurrentFrame,
    insertAnimationFrame,
    duplicateAnimationFrame,
    removeAnimationFrame,
    moveAnimationFrame,
  } = useCanvasStore(
    useShallow((state) => ({
      canvasMode: state.canvasMode,
      animationTimeline: state.animationTimeline,
      setAnimationCurrentFrame: state.setAnimationCurrentFrame,
      insertAnimationFrame: state.insertAnimationFrame,
      duplicateAnimationFrame: state.duplicateAnimationFrame,
      removeAnimationFrame: state.removeAnimationFrame,
      moveAnimationFrame: state.moveAnimationFrame,
    }))
  );
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const activeFrameIndex = useMemo(() => {
    if (!animationTimeline) return -1;
    return animationTimeline.frames.findIndex(
      (frame) => frame.id === animationTimeline.currentFrameId
    );
  }, [animationTimeline]);

  if (canvasMode !== "animation" || !animationTimeline) {
    return null;
  }

  return (
    <SidebarStandard
      variant="floating"
      side="left"
      title="Frames"
      className="pointer-events-auto"
      icon={
        <div className="flex items-center justify-center rounded-lg bg-accent p-1.5 shrink-0">
          <Clapperboard className="size-4 text-accent-foreground" />
        </div>
      }
      footer={
        <div className={cn("w-full", isCollapsed && "flex justify-center")}>
          <Button
            type="button"
            tone="neutral"
            size="sm"
            className={cn(
              "w-full shadow-none",
              isCollapsed && "size-8 rounded-lg px-0"
            )}
            onClick={() => insertAnimationFrame("after")}
            aria-label="Add frame"
            title="Add frame"
          >
            <Plus className="size-4" />
            {!isCollapsed && <span>Add Frame</span>}
          </Button>
        </div>
      }
    >
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1.5 pr-1">
          {animationTimeline.frames.map((frame, index) => {
            const isActive = frame.id === animationTimeline.currentFrameId;
            const canMoveLeft = index > 0;
            const canMoveRight = index < animationTimeline.frames.length - 1;
            const canDelete = animationTimeline.frames.length > 1;

            return (
              <ContextMenu key={frame.id}>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setAnimationCurrentFrame(frame.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors outline-none",
                      isActive
                        ? "bg-primary/12 text-primary"
                        : "text-foreground hover:bg-accent/45"
                    )}
                  >
                    <span className="text-sm font-semibold">
                      F{String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.18em]",
                        isActive ? "text-primary/80" : "text-muted-foreground"
                      )}
                    >
                      {isActive ? "Current" : "\u00A0"}
                    </span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-36">
                  <ContextMenuItem onClick={() => duplicateAnimationFrame(frame.id)}>
                    <Copy className="size-4" />
                    Duplicate
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={!canMoveLeft}
                    onClick={() => moveAnimationFrame(frame.id, -1)}
                  >
                    Earlier
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={!canMoveRight}
                    onClick={() => moveAnimationFrame(frame.id, 1)}
                  >
                    Later
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    variant="destructive"
                    disabled={!canDelete}
                    onClick={() => removeAnimationFrame(frame.id)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </ScrollArea>

      {!isCollapsed && (
        <div className="px-1 pt-2 text-[11px] font-medium text-muted-foreground">
          {Math.max(activeFrameIndex + 1, 1)} / {animationTimeline.frames.length}
        </div>
      )}
    </SidebarStandard>
  );
}
