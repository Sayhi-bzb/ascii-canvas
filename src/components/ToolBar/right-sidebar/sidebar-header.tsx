"use client";

import { Settings2 } from "lucide-react";
import {
  SidebarHeader as ShadcnSidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const SidebarHeader = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <ShadcnSidebarHeader
      className={cn(
        "flex py-4",
        isCollapsed
          ? "flex-col items-center justify-center gap-y-4"
          : "flex-row items-center justify-between px-4 border-b"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center rounded-lg bg-accent p-1.5 shrink-0">
          <Settings2 className="size-4 text-accent-foreground" />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-sm tracking-tight whitespace-nowrap">
            Properties
          </span>
        )}
      </div>

      <div
        className={cn(
          "flex items-center gap-2",
          isCollapsed ? "flex-col-reverse" : "flex-row"
        )}
      >
        <SidebarTrigger />
      </div>
    </ShadcnSidebarHeader>
  );
};
