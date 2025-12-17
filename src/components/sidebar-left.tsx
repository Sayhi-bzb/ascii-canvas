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
      // 关键修改：
      // 1. absolute: 绝对定位，脱离文档流
      // 2. left-0 top-0: 紧贴左上角（相对于父容器，即 Header 下方的那个 relative div）
      // 3. h-full: 填满高度
      // 4. z-40: 确保在画布之上
      // 5. border-r: 恢复右边框，视觉分隔
      className="absolute left-0 top-0 h-full border-r bg-sidebar z-40"
      {...props}
    >
      <SidebarHeader className="h-14 border-b justify-center px-4">
        <div className="text-sm font-semibold tracking-tight">ASCII Studio</div>
      </SidebarHeader>

      {/* 内容部分保持不变 */}
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
