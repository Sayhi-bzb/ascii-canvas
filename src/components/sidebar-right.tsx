import * as React from "react";
import { X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar } = useSidebar();
  const hasSelection = false;

  return (
    <Sidebar
      collapsible="offcanvas"
      side="right"
      className="absolute right-0 top-0 h-full z-40 border-l bg-sidebar pointer-events-auto"
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

      {/* 修正点：增加 overflow-x-hidden 防止水平滚动条 */}
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
