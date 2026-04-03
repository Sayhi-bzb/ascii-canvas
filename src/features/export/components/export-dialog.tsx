"use client";

import { useMemo, useState } from "react";
import { Copy, Download, FileJson2, Film, ImageIcon } from "lucide-react";
import type {
  AnimationCanvasSize,
  AnimationTimeline,
  CanvasMode,
  GridMap,
  StructuredNode,
} from "@/types";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { clipboard, feedback } from "@/services/effects";
import { cn } from "@/lib/utils";
import { ExportPreview } from "./export-preview";
import { AnimationExportPreview } from "./animation-export-preview";
import {
  downloadTextFile,
  buildAnimationExchangeDocument,
  exportAnimationToGIF,
  exportAnimationToJSON,
  exportStructuredF12Text,
  exportToPNG,
  exportToString,
} from "../utils/export";

type ExportDialogProps = {
  grid: GridMap;
  canvasMode: CanvasMode;
  structuredScene: StructuredNode[];
  canvasBounds: AnimationCanvasSize | null;
  animationTimeline: AnimationTimeline | null;
  exportShowGrid: boolean;
  setExportShowGrid: (show: boolean) => void;
};

export function ExportDialog({
  grid,
  canvasMode,
  structuredScene,
  canvasBounds,
  animationTimeline,
  exportShowGrid,
  setExportShowGrid,
}: ExportDialogProps) {
  const shouldExportStructured = canvasMode === "structured";
  const shouldExportAnimation = canvasMode === "animation";
  const [wrapPreview, setWrapPreview] = useState(false);
  const [animationView, setAnimationView] = useState<"preview" | "json">("preview");
  const textExport = useMemo(
    () =>
      shouldExportAnimation && canvasBounds && animationTimeline
        ? exportAnimationToJSON(canvasBounds, animationTimeline)
        : shouldExportStructured
        ? exportStructuredF12Text(structuredScene)
        : exportToString(grid),
    [
      shouldExportAnimation,
      canvasBounds,
      animationTimeline,
      shouldExportStructured,
      structuredScene,
      grid,
    ]
  );
  const lineCount = useMemo(
    () => (textExport ? textExport.split("\n").length : 0),
    [textExport]
  );
  const charCount = textExport.length;
  const animationDocument = useMemo(() => {
    if (!shouldExportAnimation || !canvasBounds || !animationTimeline) return null;
    return buildAnimationExchangeDocument(canvasBounds, animationTimeline);
  }, [animationTimeline, canvasBounds, shouldExportAnimation]);

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                tone="subtle"
                shape="square"
                size="md"
                className="size-8 text-muted-foreground hover:text-primary transition-colors"
              >
                <Download className="size-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">
            {shouldExportAnimation ? "Export Animation" : "Export Blueprint"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-xl gap-0 p-0 max-h-[85vh] overflow-hidden border-none shadow-2xl">
        <div className="bg-muted/30 p-5 pb-3">
          <DialogHeader>
            <DialogTitle className="text-base">Export</DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-widest">
              ASCII Metropolis
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 py-4 space-y-4 min-h-0">
          <div
            className={cn(
              "w-full relative group min-w-0",
              shouldExportStructured || shouldExportAnimation ? "h-72" : "aspect-video"
            )}
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur opacity-25" />
            <div className="relative h-full border rounded-xl bg-background overflow-hidden shadow-inner p-3 min-w-0">
              {shouldExportAnimation && canvasBounds && animationTimeline ? (
                <div className="flex h-full min-w-0 flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Animation Export
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {animationDocument?.type} · v{animationDocument?.version}
                      </div>
                    </div>
                    <div className="inline-flex rounded-xl border border-border bg-muted/25 p-1">
                      {[
                        { value: "preview" as const, label: "Preview" },
                        { value: "json" as const, label: "JSON" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAnimationView(option.value)}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                            animationView === option.value
                              ? "bg-primary/12 text-primary"
                              : "text-muted-foreground hover:bg-accent/45 hover:text-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1">
                    {animationView === "preview" ? (
                      <AnimationExportPreview
                        size={canvasBounds}
                        timeline={animationTimeline}
                      />
                    ) : (
                      <div className="h-full min-w-0 rounded-lg border border-border bg-muted/20 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-2 py-1.5">
                          <div className="text-[10px] font-medium text-muted-foreground">
                            {lineCount} lines · {charCount} chars
                          </div>
                          <Button
                            tone={wrapPreview ? "primary" : "neutral"}
                            size="sm"
                            onClick={() => setWrapPreview((prev) => !prev)}
                            className="h-5 px-2 rounded text-[9px] uppercase font-bold"
                          >
                            Wrap {wrapPreview ? "ON" : "OFF"}
                          </Button>
                        </div>

                        <div className="min-h-0 flex-1 p-2">
                          <pre
                            className={cn(
                              "h-full w-full overflow-auto rounded-md bg-background p-2 font-mono text-[10px] leading-relaxed text-foreground min-w-0",
                              wrapPreview ? "whitespace-pre-wrap break-words" : "whitespace-pre"
                            )}
                          >
                            {textExport ||
                              '{\n  "type": "ascii-animation",\n  "version": 1,\n  "frames": []\n}'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : shouldExportStructured ? (
                <div className="h-full min-w-0 rounded-lg border border-border bg-muted/20 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-2 py-1.5">
                    <div className="text-[10px] font-medium text-muted-foreground">
                      {lineCount} lines · {charCount} chars
                    </div>
                    <Button
                      tone={wrapPreview ? "primary" : "neutral"}
                      size="sm"
                      onClick={() => setWrapPreview((prev) => !prev)}
                      className="h-5 px-2 rounded text-[9px] uppercase font-bold"
                    >
                      Wrap {wrapPreview ? "ON" : "OFF"}
                    </Button>
                  </div>

                  <div className="min-h-0 flex-1 p-2">
                    <pre
                      className={cn(
                        "h-full w-full overflow-auto rounded-md bg-background p-2 font-mono text-[10px] leading-relaxed text-foreground min-w-0",
                        wrapPreview ? "whitespace-pre-wrap break-words" : "whitespace-pre"
                      )}
                    >
                      {textExport ||
                        '<canvas\n  mode="structured"\n  nodes="0"\n>\n</canvas>'}
                    </pre>
                  </div>
                </div>
              ) : (
                <ExportPreview />
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-2">
            {shouldExportAnimation && canvasBounds && animationTimeline ? (
              <div className="grid w-full grid-cols-3 gap-2">
                <ActionButton
                  tone="neutral"
                  size="full"
                  shape="auto"
                  icon={Copy}
                  label="Copy JSON"
                  subLabel="schema"
                  className="border rounded-2xl"
                  onAction={async () => {
                    const copied = await clipboard.writeText(textExport);
                    if (!copied) {
                      feedback.error("Copy failed", {
                        description: "Could not write animation JSON to clipboard.",
                      });
                    }
                    return copied;
                  }}
                />
                <ActionButton
                  tone="neutral"
                  size="full"
                  shape="auto"
                  icon={FileJson2}
                  label="Save JSON"
                  subLabel="exchange"
                  className="border rounded-2xl"
                  onAction={() =>
                    downloadTextFile(`ascii-animation-${Date.now()}.json`, textExport)
                  }
                />
                <ActionButton
                  tone="neutral"
                  size="full"
                  shape="auto"
                  icon={Film}
                  label="Save GIF"
                  subLabel="animated"
                  className="border rounded-2xl"
                  onAction={async () => {
                    const saved = await exportAnimationToGIF(
                      canvasBounds,
                      animationTimeline
                    );
                    if (!saved) {
                      feedback.error("GIF export failed", {
                        description: "Could not encode animation frames into a GIF.",
                      });
                    }
                    return saved;
                  }}
                />
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ActionButton
                      tone="neutral"
                      size="md"
                      icon={Copy}
                      className="border-2 rounded-xl"
                      onAction={async () => {
                        const copied = await clipboard.writeText(textExport);
                        if (!copied) {
                          feedback.error("Copy failed", {
                            description: "Could not write text to clipboard.",
                          });
                        }
                        return copied;
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Copy Text
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <ActionButton
                      tone="neutral"
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
            )}
          </div>

          {!shouldExportAnimation && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
              <span className="text-xs font-medium text-muted-foreground">
                Print Grid on PNG
              </span>
              <Button
                tone={exportShowGrid ? "primary" : "neutral"}
                size="sm"
                onClick={() => setExportShowGrid(!exportShowGrid)}
                className="h-6 px-2 rounded-md text-[10px] uppercase font-bold"
              >
                {exportShowGrid ? "ON" : "OFF"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
