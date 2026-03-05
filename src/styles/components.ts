import { cn } from "@/lib/utils";
import { rx } from "@/styles/recipes";

export const uiClass = {
  toolbarShell: cn(
    rx.surface({ kind: "overlay", elevated: true }),
    "relative flex items-center gap-1 p-1.5 rounded-2xl backdrop-blur-md border-primary/10 pointer-events-auto"
  ),
  submenuPanel: cn(
    rx.surface({ kind: "overlay", elevated: true }),
    "w-auto p-1 flex flex-col gap-0.5 z-50 overflow-hidden min-w-[100px]"
  ),
};
