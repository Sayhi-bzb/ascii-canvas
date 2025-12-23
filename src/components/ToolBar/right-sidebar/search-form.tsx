"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar";
import { useLibraryStore } from "@/components/ToolBar/right-sidebar/useLibraryStore";

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  const { searchQuery, setSearchQuery } = useLibraryStore();

  return (
    <form {...props} onSubmit={(e) => e.preventDefault()}>
      <SidebarGroup className="py-2 border-b">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search Blueprint
          </Label>
          <SidebarInput
            id="search"
            placeholder="Search characters (e.g. 'copy', 'arrow')..."
            className="pl-8 bg-muted/50 focus-visible:bg-background transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 opacity-50 select-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              ESC
            </button>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  );
}
