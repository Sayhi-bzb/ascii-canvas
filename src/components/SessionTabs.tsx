"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { uiClass } from "@/styles/components";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
      <div className={uiClass.sessionShell}>
        <div className="flex items-center gap-1 max-w-[min(72vw,760px)] overflow-x-auto pr-1">
          {canvasSessions.map((session) => {
            const isActive = session.id === activeCanvasId;
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
                      "h-8 px-3 text-xs font-medium whitespace-nowrap max-w-36 truncate outline-none",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                    title={session.name}
                  >
                    {session.name}
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

        <Button
          tone="subtle"
          shape="square"
          size="sm"
          className="size-8 shrink-0"
          onClick={() => createCanvasSession()}
          aria-label="Create new canvas"
        >
          <Plus className="size-4" />
        </Button>
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
