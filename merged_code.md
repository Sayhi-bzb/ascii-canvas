```src/components/ToolBar/sidebar-right.tsx
import * as React from "react";
import { X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar } = useSidebar();
  const hasSelection = false;

  return (
    <Sidebar
      collapsible="offcanvas"
      side="right"
      className="absolute right-0 top-0 z-40 border-l bg-sidebar pointer-events-auto"
      {...props}
    >
      <SidebarHeader className="h-14 border-b flex flex-row items-center justify-between px-4">
        <div className="text-sm font-semibold tracking-tight">Properties</div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-2"
          onClick={toggleSidebar}
        >
          <X className="h-4 w-4" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="p-4 overflow-x-hidden">
        {hasSelection ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                Layout
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="pos-x"
                    className="text-[10px] text-muted-foreground uppercase"
                  >
                    X
                  </Label>
                  <Input
                    id="pos-x"
                    defaultValue="120"
                    className="h-8 text-xs px-2"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="pos-y"
                    className="text-[10px] text-muted-foreground uppercase"
                  >
                    Y
                  </Label>
                  <Input
                    id="pos-y"
                    defaultValue="80"
                    className="h-8 text-xs px-2"
                  />
                </div>
              </div>
            </div>

            <SidebarSeparator className="mx-0" />

            <div className="grid gap-4">
              <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                Appearance
              </div>
              <div className="grid gap-1.5">
                <Label
                  htmlFor="char-content"
                  className="text-[10px] text-muted-foreground uppercase"
                >
                  Character
                </Label>
                <Input
                  id="char-content"
                  defaultValue="#"
                  className="h-8 text-xs px-2"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-center gap-2 text-muted-foreground/60">
            <div className="p-3 border-2 border-dashed rounded-lg">
              <div className="size-8 rounded bg-muted/50" />
            </div>
            <p className="text-xs font-medium">Select an object</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
```
---
```src/components/ToolBar/sidebar-left.tsx
import * as React from "react";
import { Layers, Component, Book, ChevronRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      side="left"
      className="absolute left-0 top-0 z-40 border-r"
      {...props}
    >
      <SidebarHeader className="h-14 border-b justify-center px-4">
        <div className="text-sm font-semibold tracking-tight">ASCII Studio</div>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarMenu className="p-2">
          <SidebarMenuItem>
            <SidebarMenuButton isActive tooltip="Manage layers">
              <Layers className="h-4 w-4" />
              <span>Layers</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Reusable assets">
              <Component className="h-4 w-4" />
              <span>Assets</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Document pages">
              <Book className="h-4 w-4" />
              <span>Pages</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        <Collapsible defaultOpen className="px-2 mt-2">
          <CollapsibleTrigger asChild>
            <div className="flex w-full items-center justify-between p-2 cursor-pointer hover:bg-muted/50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Page 1
                </span>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="py-1 pl-4">
            <div className="flex flex-col gap-0.5 text-sm">
              <div className="rounded-md px-2 py-1.5 hover:bg-muted cursor-default">
                Background Layer
              </div>
              <div className="rounded-md bg-accent px-2 py-1.5 text-accent-foreground cursor-default font-medium">
                Active Canvas
              </div>
              <div className="rounded-md px-2 py-1.5 hover:bg-muted cursor-default">
                Annotation Overlay
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
```
