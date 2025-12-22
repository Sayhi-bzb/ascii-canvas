"use client";

import * as React from "react";
import { Library } from "lucide-react";
import { SidebarStandard } from "@/components/ui/sidebar";
import { CharLibrary } from "./right-sidebar/char-library";

export function SidebarRight() {
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
      <CharLibrary />
    </SidebarStandard>
  );
}
