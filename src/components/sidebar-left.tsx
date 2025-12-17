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
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="h-14 border-b justify-center px-4">
        {/* 使用标准的文本样式来替代不存在的组件 */}
        <div className="text-sm font-semibold tracking-tight">ASCII Studio</div>
      </SidebarHeader>
      <SidebarContent>
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
