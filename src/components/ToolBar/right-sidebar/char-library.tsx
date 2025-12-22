"use client";

import { useMemo } from "react";
import {
  ChevronRight,
  Square,
  LayoutGrid,
  Accessibility,
  Fingerprint,
  Smile,
  Box,
} from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const genRange = (start: number, count: number) =>
  Array.from({ length: count }, (_, i) => String.fromCodePoint(start + i));

export function CharLibrary() {
  const { brushChar, setBrushChar, setTool } = useCanvasStore();

  const library = useMemo(
    () => [
      {
        name: "Box Drawing",
        icon: Square,
        chars: genRange(0x2500, 128),
        isActive: true,
      },
      {
        name: "Block Elements",
        icon: LayoutGrid,
        chars: genRange(0x2580, 32),
        isActive: false,
      },
      {
        name: "Accessibility",
        icon: Accessibility,
        chars: genRange(0x2800, 256),
        isActive: false,
      },
      {
        name: "Nerd Icons",
        icon: Fingerprint,
        chars: [...genRange(0xe700, 40), ...genRange(0xf000, 50)],
        isActive: false,
      },
      {
        name: "Smileys",
        icon: Smile,
        chars: genRange(0x1f600, 80),
        isActive: false,
      },
      {
        name: "Objects",
        icon: Box,
        chars: genRange(0x1f300, 80),
        isActive: false,
      },
    ],
    []
  );

  const handleSelect = (char: string) => {
    setBrushChar(char);
    setTool("brush");
    toast.success(`Copyed: ${char}`, {
      duration: 800,
      position: "top-right",
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>ASCII Materials</SidebarGroupLabel>
      <SidebarMenu>
        {library.map((group) => (
          <Collapsible
            key={group.name}
            asChild
            defaultOpen={group.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={group.name} className="font-medium">
                <group.icon className="size-4 text-muted-foreground" />
                <span>{group.name}</span>
              </SidebarMenuButton>

              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
                  <ChevronRight className="size-4" />
                  <span className="sr-only">Toggle</span>
                </SidebarMenuAction>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {/* 
                  这里是关键： grid 布局中的每个按钮通过 font-mono 类名
                  继承了我们在 index.css 中定义的 Maple Mono 字体。
                */}
                <div className="grid grid-cols-4 gap-1 p-2 bg-muted/20 rounded-md mt-1">
                  {group.chars.map((char, idx) => (
                    <button
                      key={`${group.name}-${idx}`}
                      onClick={() => handleSelect(char)}
                      className={cn(
                        "h-9 w-full flex items-center justify-center rounded-sm transition-all font-mono text-base border",
                        brushChar === char
                          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-95"
                          : "bg-background hover:border-primary/30 hover:bg-accent text-foreground border-transparent"
                      )}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
