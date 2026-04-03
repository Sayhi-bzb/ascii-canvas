"use client";

import {
  CircleHelp,
  Info,
  Keyboard,
  Maximize,
  Mouse,
  Move,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HandbookDialog() {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              tone="subtle"
              shape="square"
              size="md"
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
              <span>Mayor&apos;s Handbook v2.0</span>
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
                    <span className="text-muted-foreground text-[10px]">+</span>
                    <Mouse className="size-3" />
                  </div>
                </div>
                <div className="bg-muted/50 p-2 rounded-md flex justify-between items-center">
                  <span>Zoom</span>
                  <div className="flex gap-1">
                    <kbd className="bg-background px-1.2 py-0.5 rounded border text-[9px] font-mono shadow-sm">
                      Ctrl
                    </kbd>
                    <span className="text-muted-foreground text-[10px]">+</span>
                    <span className="font-mono text-[10px]">Scroll</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Maximize className="size-4" /> Rapid Zoning (Selection)
              </h4>
              <div className="bg-primary/5 border border-primary p-3 rounded-lg text-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">Anchor Surveying</p>
                    <p className="text-muted-foreground">
                      Click a point, then{" "}
                      <kbd className="font-mono bg-muted px-1 rounded">
                        Shift + Click
                      </kbd>{" "}
                      another to instantly frame the lot.
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-start border-t border-primary pt-2">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">Mass Pouring (Fill)</p>
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
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <div className="flex flex-col">
                    <span className="font-medium">Setback Inheritance</span>
                    <span className="text-[10px] text-muted-foreground">
                      Auto-aligns newline with previous indentation
                    </span>
                  </div>
                  <kbd className="bg-muted px-2 py-0.5 rounded border text-[10px] font-mono">
                    Enter
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <div className="flex flex-col">
                    <span className="font-medium">Modular Paving</span>
                    <span className="text-[10px] text-muted-foreground">
                      Instantly pavs 2 grids of vacant space
                    </span>
                  </div>
                  <kbd className="bg-muted px-2 py-0.5 rounded border text-[10px] font-mono">
                    Tab
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground italic">Quick Undo</span>
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
                <strong className="text-foreground">Pro Tip:</strong> Use the{" "}
                <span className="font-bold underline">Select tool</span> to place
                the cursor. Once a zoning box is active, typing acts as a fill
                command instead of cursor placement.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

