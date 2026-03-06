"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Pencil, Plus, X } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { uiClass } from "@/styles/components";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SessionTabs() {
  const {
    canvasSessions,
    activeCanvasId,
    createCanvasSession,
    switchCanvasSession,
    removeCanvasSession,
    renameCanvasSession,
  } = useCanvasStore(
    useShallow((state) => ({
      canvasSessions: state.canvasSessions,
      activeCanvasId: state.activeCanvasId,
      createCanvasSession: state.createCanvasSession,
      switchCanvasSession: state.switchCanvasSession,
      removeCanvasSession: state.removeCanvasSession,
      renameCanvasSession: state.renameCanvasSession,
    }))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canRemove = canvasSessions.length > 1;

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const commitRename = () => {
    if (!editingId) return;
    renameCanvasSession(editingId, editingName);
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

  const pendingDeleteSession = pendingDeleteId
    ? canvasSessions.find((session) => session.id === pendingDeleteId) || null
    : null;
  const createOptions = [
    { mode: "freeform" as const, label: "New Freeform", icon: Pencil },
    { mode: "structured" as const, label: "New Structured", icon: Box },
  ];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
      <div className={uiClass.sessionShell}>
        <div className="flex items-center gap-1 max-w-[min(72vw,760px)] overflow-x-auto pr-1">
          {canvasSessions.map((session) => {
            const isActive = session.id === activeCanvasId;
            const ModeIcon = session.mode === "structured" ? Box : Pencil;
            const modeLabel =
              session.mode === "structured" ? "Structured" : "Freeform";
            return (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center rounded-lg border transition-colors",
                  isActive
                    ? "bg-primary/12 border-primary/25"
                    : "bg-background/70 border-border/70 hover:bg-accent/60"
                )}
              >
                {editingId === session.id ? (
                  <input
                    ref={inputRef}
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename();
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        cancelRename();
                      }
                    }}
                    className="mx-1 h-6 w-28 rounded border border-primary/40 bg-background px-1.5 text-xs text-foreground outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => switchCanvasSession(session.id)}
                    onDoubleClick={() => startRename(session.id, session.name)}
                    className={cn(
                      "h-8 px-3 text-xs font-medium whitespace-nowrap max-w-44 outline-none flex items-center gap-1.5",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                    title={`${session.name} (${modeLabel})`}
                  >
                    <ModeIcon
                      className={cn(
                        "size-3.5 shrink-0",
                        isActive ? "text-primary/80" : "text-muted-foreground"
                      )}
                    />
                    <span className="truncate">{session.name}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingDeleteId(session.id);
                  }}
                  disabled={!canRemove}
                  className={cn(
                    "h-8 w-7 flex items-center justify-center rounded-r-lg transition-colors",
                    canRemove
                      ? "text-muted-foreground hover:text-destructive"
                      : "text-muted-foreground/40 cursor-not-allowed"
                  )}
                  aria-label={`Close ${session.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <Popover open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              tone="subtle"
              shape="square"
              size="sm"
              className="size-8 shrink-0"
              aria-label="Create new canvas"
            >
              <Plus className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            sideOffset={8}
            className={cn(uiClass.submenuPanel, "w-44 p-1")}
          >
            {createOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => {
                    createCanvasSession(option.mode);
                    setCreateMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 h-9 px-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      <AlertDialog
        open={!!pendingDeleteSession}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete This Canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteSession
                ? `Canvas "${pendingDeleteSession.name}" will be closed and removed from this session.`
                : "This canvas will be removed from this session."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDeleteSession) return;
                removeCanvasSession(pendingDeleteSession.id);
                setPendingDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
