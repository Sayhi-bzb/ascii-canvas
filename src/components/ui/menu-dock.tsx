"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Home, Briefcase, Calendar, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type IconComponentType = React.ElementType<{ className?: string }>;

export interface MenuDockItem {
  label: string;
  icon: IconComponentType;
  onClick?: () => void;
  id?: string;
  subItems?: MenuDockItem[];
}

export interface MenuDockProps {
  items?: MenuDockItem[];
  className?: string;
  variant?: "default" | "compact" | "large";
  orientation?: "horizontal" | "vertical";
  showLabels?: boolean;
  animated?: boolean;
  activeId?: string;
}

const defaultItems: MenuDockItem[] = [
  { label: "home", icon: Home },
  { label: "work", icon: Briefcase },
  { label: "calendar", icon: Calendar },
  { label: "security", icon: Shield },
  { label: "settings", icon: Settings },
];

export const MenuDock: React.FC<MenuDockProps> = ({
  items,
  className,
  variant = "default",
  orientation = "horizontal",
  showLabels = true,
  activeId,
}) => {
  const finalItems = useMemo(() => {
    const isValid =
      items && Array.isArray(items) && items.length >= 2 && items.length <= 12;
    return isValid ? items : defaultItems;
  }, [items]);

  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const [openSubMenuId, setOpenSubMenuId] = useState<string | null>(null);

  const activeIndex = useMemo(() => {
    if (activeId !== undefined) {
      const index = finalItems.findIndex(
        (item) => (item.id || item.label) === activeId
      );
      return index !== -1 ? index : 0;
    }
    return internalActiveIndex;
  }, [activeId, finalItems, internalActiveIndex]);

  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    left: 0,
    top: 0,
    height: 0,
  });

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeButton = itemRefs.current[activeIndex];
      const container = activeButton?.parentElement;

      const navContainer = activeButton?.closest("nav");

      if (activeButton && navContainer) {
        const btnRect = activeButton.getBoundingClientRect();
        const containerRect = navContainer.getBoundingClientRect();

        if (orientation === "horizontal") {
          const width = showLabels ? btnRect.width * 0.6 : 24;
          const left =
            btnRect.left - containerRect.left + (btnRect.width - width) / 2;

          setIndicatorStyle({
            width,
            left,
            top: 0,
            height: 2,
          });
        } else {
          const height = 24;
          const top =
            btnRect.top - containerRect.top + (btnRect.height - height) / 2;
          setIndicatorStyle({
            width: 4,
            left: 4,
            top,
            height,
          });
        }
      }
    };

    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      clearTimeout(timer);
    };
  }, [activeIndex, finalItems, showLabels, orientation]);

  const getVariantStyles = () => {
    switch (variant) {
      case "compact":
        return {
          container: "p-1",
          item: "p-2 min-w-10",
          icon: "h-4 w-4",
          text: "text-xs",
        };
      case "large":
        return {
          container: "p-3",
          item: "p-3 min-w-16",
          icon: "h-6 w-6",
          text: "text-base",
        };
      default:
        return {
          container: "p-2",
          item: "p-2 min-w-14",
          icon: "h-5 w-5",
          text: "text-sm",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <TooltipProvider delayDuration={200}>
      <nav
        className={cn(
          "relative inline-flex items-center rounded-xl bg-card border shadow-sm transition-all duration-300",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          styles.container,
          className
        )}
        role="navigation"
      >
        {finalItems.map((item, index) => {
          const isActive = index === activeIndex;
          const IconComponent = item.icon;
          const hasSubMenu = item.subItems && item.subItems.length > 0;
          const itemId = item.id || item.label;

          const MainButton = (
            <button
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg transition-all duration-200",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                styles.item,
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                hasSubMenu && openSubMenuId === itemId && "bg-muted/50"
              )}
              onClick={() => {
                if (!hasSubMenu) {
                  setInternalActiveIndex(index);
                  item.onClick?.();
                }
              }}
              aria-label={item.label}
              type="button"
            >
              <div
                className={cn(
                  "flex items-center justify-center",
                  orientation === "horizontal" && showLabels ? "mb-1" : ""
                )}
              >
                <IconComponent className={cn(styles.icon)} />
              </div>

              {showLabels && (
                <span
                  className={cn(
                    "font-medium capitalize whitespace-nowrap",
                    styles.text
                  )}
                >
                  {item.label}
                </span>
              )}
            </button>
          );

          if (hasSubMenu) {
            return (
              <Popover
                key={`${item.label}-${index}`}
                open={openSubMenuId === itemId}
                onOpenChange={(open) => setOpenSubMenuId(open ? itemId : null)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>{MainButton}</PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent
                    side={orientation === "horizontal" ? "top" : "right"}
                    className="capitalize"
                  >
                    {item.label}
                  </TooltipContent>
                </Tooltip>

                <PopoverContent
                  side="top"
                  align="center"
                  className="w-auto p-1.5 flex gap-1 rounded-xl bg-card/90 backdrop-blur-md border shadow-xl"
                  sideOffset={10}
                >
                  {item.subItems?.map((subItem, subIndex) => {
                    const SubIcon = subItem.icon;
                    return (
                      <Tooltip key={`sub-${subIndex}`}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              subItem.onClick?.();
                              setOpenSubMenuId(null);
                              setInternalActiveIndex(index);
                            }}
                            className={cn(
                              "p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors",
                              "text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            )}
                          >
                            <SubIcon className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{subItem.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <Tooltip key={`${item.label}-${index}`}>
              <TooltipTrigger asChild>{MainButton}</TooltipTrigger>
              <TooltipContent
                side={orientation === "horizontal" ? "top" : "right"}
                className="capitalize"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div
          className={cn(
            "absolute bg-primary rounded-full transition-all duration-300 ease-out pointer-events-none",
            orientation === "horizontal" ? "bottom-1" : "left-1"
          )}
          style={{
            width: `${indicatorStyle.width}px`,
            height: `${indicatorStyle.height}px`,
            left:
              orientation === "horizontal"
                ? `${indicatorStyle.left}px`
                : undefined,
            top:
              orientation === "vertical"
                ? `${indicatorStyle.top}px`
                : undefined,
          }}
        />
      </nav>
    </TooltipProvider>
  );
};
