"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ClearCanvasDialogProps = {
  isCollapsed: boolean;
  onConfirm: () => void;
};

export function ClearCanvasDialog({ isCollapsed, onConfirm }: ClearCanvasDialogProps) {
  return (
    <AlertDialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                tone="subtle"
                shape={isCollapsed ? "square" : "auto"}
                size={isCollapsed ? "md" : "sm"}
                className={cn(
                  "justify-start gap-2 text-destructive hover:bg-destructive/10 transition-colors",
                  isCollapsed ? "size-8 justify-center" : "w-full h-8 px-2"
                )}
              >
                <Trash2 className="size-4" />
                {!isCollapsed && (
                  <span className="font-medium text-xs">Clear Canvas</span>
                )}
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="left">Clear Canvas</TooltipContent>}
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
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

