import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  // TODO: 后续接入 store 状态
  const hasSelection = false;

  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh border-l lg:flex"
      {...props}
    >
      <SidebarHeader className="h-14 border-b justify-center px-4">
        <div className="text-sm font-semibold tracking-tight">Properties</div>
      </SidebarHeader>
      <SidebarContent className="p-4">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="width"
                    className="text-[10px] text-muted-foreground uppercase"
                  >
                    W
                  </Label>
                  <Input
                    id="width"
                    defaultValue="250"
                    className="h-8 text-xs px-2"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="height"
                    className="text-[10px] text-muted-foreground uppercase"
                  >
                    H
                  </Label>
                  <Input
                    id="height"
                    defaultValue="150"
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
