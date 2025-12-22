"use client";

import { useMemo } from "react";
import {
  ChevronRight,
  Square,
  LayoutGrid,
  Accessibility,
  Fingerprint,
  Smile,
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const MATERIAL_BLUEPRINTS = [
  {
    name: "Nerd Symbols",
    icon: Fingerprint,
    ranges: [
      [0xe700, 0xe7c5],
      [0xf000, 0xf2e0],
      [0xe0b0, 0xe0b3],
    ],
    isActive: false,
  },
  {
    name: "Box Drawing",
    icon: Square,
    ranges: [[0x2500, 0x257f]],
    isActive: true,
  },
  {
    name: "Block Elements",
    icon: LayoutGrid,
    ranges: [[0x2580, 0x259f]],
    isActive: false,
  },
  {
    name: "Braille Icons",
    icon: Accessibility,
    ranges: [[0x2800, 0x28ff]],
    isActive: false,
  },
  {
    name: "Emoticons",
    icon: Smile,
    ranges: [[0x1f600, 0x1f64f]],
    isActive: false,
  },
];

const generateChars = (ranges: number[][]): string[] => {
  return ranges.flatMap(([start, end]) =>
    Array.from({ length: end - start + 1 }, (_, i) =>
      String.fromCodePoint(start + i)
    )
  );
};

export function CharLibrary() {
  const { brushChar, setBrushChar, setTool } = useCanvasStore();

  const library = useMemo(
    () =>
      MATERIAL_BLUEPRINTS.map((category) => ({
        ...category,
        chars: generateChars(category.ranges),
      })),
    []
  );

  const handleSelect = (char: string) => {
    setBrushChar(char);
    setTool("brush");
    toast.success(`Selected: ${char}`, {
      duration: 800,
      position: "top-right",
    });
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {library.map((group) => (
          <Collapsible
            key={group.name}
            asChild
            defaultOpen={group.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={group.name} className="font-medium">
                  <group.icon className="size-4 text-muted-foreground" />
                  <span>{group.name}</span>
                  <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>

              <CollapsibleContent>
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
