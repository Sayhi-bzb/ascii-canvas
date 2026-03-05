"use client";

import { Copy, Download, ImageIcon } from "lucide-react";
import type { GridMap } from "@/types";
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
import { ExportPreview } from "../export-preview";
import { exportToPNG, exportToString } from "@/utils/export";

type ExportDialogProps = {
  grid: GridMap;
  exportShowGrid: boolean;
  setExportShowGrid: (show: boolean) => void;
};

export function ExportDialog({
  grid,
  exportShowGrid,
  setExportShowGrid,
}: ExportDialogProps) {
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
          <TooltipContent side="left">Export Blueprint</TooltipContent>
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
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur opacity-25" />
            <div className="relative h-full border rounded-xl bg-background overflow-hidden shadow-inner p-3">
              <ExportPreview />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-2">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ActionButton
                    tone="neutral"
                    size="md"
                    icon={Copy}
                    className="border-2 rounded-xl"
                    onAction={async () => {
                      const copied = await clipboard.writeText(exportToString(grid));
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
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
