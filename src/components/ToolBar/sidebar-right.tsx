"use client";

import * as React from "react";
import { Library } from "lucide-react";
import { SidebarStandard } from "@/components/ui/sidebar";
import { CharLibrary } from "./right-sidebar/char-library";

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof SidebarStandard>) {
  return (
    <SidebarStandard
      variant="floating"
      side="right"
      title="Library"
      className="pointer-events-auto"
      icon={
        <div className="flex items-center justify-center rounded-lg bg-accent p-1.5 shrink-0">
          <Library className="size-4 text-accent-foreground" />
        </div>
      }
    >
      {/* 
          注意：这里直接放置 CharLibrary。
          SidebarStandard 内部的 SidebarContent 已经处理了 flex-1 和 overflow-auto。
          不要在这里再包裹任何带有 overflow-hidden 的 div。
      */}
      <CharLibrary />
    </SidebarStandard>
  );
}
