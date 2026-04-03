"use client";

import { Clapperboard, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder } from "motion/react";
import { useShallow } from "zustand/react/shallow";
import { SidebarStandard, useSidebar } from "@/components/ui/sidebar";
import { useCanvasStore } from "@/store/canvasStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    animationIsPlaying,
    setAnimationCurrentFrame,
    insertAnimationFrame,
    renameAnimationFrame,
    duplicateAnimationFrame,
    removeAnimationFrame,
    reorderAnimationFrames,
  } = useCanvasStore(
    useShallow((state) => ({
      canvasMode: state.canvasMode,
      animationTimeline: state.animationTimeline,
      animationIsPlaying: state.animationIsPlaying,
      setAnimationCurrentFrame: state.setAnimationCurrentFrame,
      insertAnimationFrame: state.insertAnimationFrame,
      renameAnimationFrame: state.renameAnimationFrame,
      duplicateAnimationFrame: state.duplicateAnimationFrame,
      removeAnimationFrame: state.removeAnimationFrame,
      reorderAnimationFrames: state.reorderAnimationFrames,
    }))
  );
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [sidebarCurrentFrameId, setSidebarCurrentFrameId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  useEffect(() => {
    if (!animationTimeline) {
      setSidebarCurrentFrameId(null);
      return;
    }

    if (
      sidebarCurrentFrameId &&
      animationTimeline.frames.some((frame) => frame.id === sidebarCurrentFrameId)
    ) {
      if (!animationIsPlaying) {
        setSidebarCurrentFrameId(animationTimeline.currentFrameId);
      }
      return;
    }

    setSidebarCurrentFrameId(animationTimeline.currentFrameId);
  }, [animationIsPlaying, animationTimeline, sidebarCurrentFrameId]);

  const activeFrameIndex = useMemo(() => {
    if (!animationTimeline) return -1;
    return animationTimeline.frames.findIndex(
      (frame) => frame.id === sidebarCurrentFrameId
    );
  }, [animationTimeline, sidebarCurrentFrameId]);

  const frameOrder = useMemo(
    () => animationTimeline?.frames.map((frame) => frame.id) ?? [],
    [animationTimeline]
  );

  if (canvasMode !== "animation" || !animationTimeline) {
    return null;
  }

  const startRename = (frameId: string, frameName: string) => {
    setAnimationCurrentFrame(frameId);
    setEditingId(frameId);
    setEditingName(frameName);
  };

  const commitRename = () => {
    if (!editingId) return;
    renameAnimationFrame(editingId, editingName);
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

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
        <Reorder.Group
          as="div"
          axis="y"
          values={frameOrder}
          onReorder={reorderAnimationFrames}
          className="flex flex-col gap-1.5 pr-1"
        >
          {animationTimeline.frames.map((frame) => {
            const isActive = frame.id === sidebarCurrentFrameId;
            const canDelete = animationTimeline.frames.length > 1;
            const isEditing = frame.id === editingId;
            const frameRowClassName = cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors outline-none",
              isActive
                ? "bg-primary/12 text-primary"
                : "text-foreground hover:bg-accent/45"
            );

            return (
              <Reorder.Item
                key={frame.id}
                value={frame.id}
                className="list-none"
                dragListener={!isEditing}
              >
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    {isEditing ? (
                      <div className={frameRowClassName}>
                        <Input
                          ref={inputRef}
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onBlur={commitRename}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commitRename();
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              cancelRename();
                            }
                          }}
                          className="h-8 border-none bg-background/90 px-2 text-sm font-semibold shadow-none focus-visible:ring-1"
                        />
                        <span
                          className={cn(
                            "ml-3 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em]",
                            isActive ? "text-primary/80" : "text-muted-foreground"
                          )}
                        >
                          {isActive ? "Current" : "\u00A0"}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAnimationCurrentFrame(frame.id)}
                        onDoubleClick={() => startRename(frame.id, frame.name)}
                        className={cn(frameRowClassName, "cursor-grab active:cursor-grabbing")}
                      >
                        <span className="truncate text-sm font-semibold">
                          {frame.name}
                        </span>
                        <span
                          className={cn(
                            "ml-3 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em]",
                            isActive ? "text-primary/80" : "text-muted-foreground"
                          )}
                        >
                          {isActive ? "Current" : "\u00A0"}
                        </span>
                      </button>
                    )}
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-36">
                    <ContextMenuItem onClick={() => startRename(frame.id, frame.name)}>
                      <Pencil className="size-4" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => duplicateAnimationFrame(frame.id)}>
                      <Copy className="size-4" />
                      Duplicate
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
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </ScrollArea>

      {!isCollapsed && (
        <div className="px-1 pt-2 text-[11px] font-medium text-muted-foreground">
          {Math.max(activeFrameIndex + 1, 1)} / {animationTimeline.frames.length}
        </div>
      )}
    </SidebarStandard>
  );
}
