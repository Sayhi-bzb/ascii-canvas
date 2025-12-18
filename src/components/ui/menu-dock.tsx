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

type IconComponentType = React.ElementType<{ className?: string }>;

export interface MenuDockItem {
  label: string;
  icon: IconComponentType;
  onClick?: () => void;
  id?: string;
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
      items && Array.isArray(items) && items.length >= 2 && items.length <= 8;
    return isValid ? items : defaultItems;
  }, [items]);

  const [internalActiveIndex, setInternalActiveIndex] = useState(0);

  const activeIndex = useMemo(() => {
    if (activeId !== undefined) {
      const index = finalItems.findIndex(
        (item) => (item.id || item.label) === activeId
      );
      return index !== -1 ? index : 0;
    }
    return internalActiveIndex;
  }, [activeId, finalItems, internalActiveIndex]);

  // 存储下划线的物理参数
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

      if (activeButton && container) {
        const btnRect = activeButton.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (orientation === "horizontal") {
          // 如果显示标签，下划线宽度等于按钮内文字/内容宽度（大约占 60%）
          // 如果不显示标签，下划线固定为 24px (w-6)
          const width = showLabels ? btnRect.width * 0.6 : 24;
          const left =
            btnRect.left - containerRect.left + (btnRect.width - width) / 2;

          setIndicatorStyle({
            width,
            left,
            top: 0, // 水平模式下 top 由 CSS bottom 控制
            height: 2, // h-0.5
          });
        } else {
          // 垂直模式逻辑
          const height = 24; // h-6
          const top =
            btnRect.top - containerRect.top + (btnRect.height - height) / 2;
          setIndicatorStyle({
            width: 4, // w-1
            left: 4, // left-1
            top,
            height,
          });
        }
      }
    };

    // 立即更新并监听
    updateIndicator();
    const timer = setTimeout(updateIndicator, 50); // 确保容器渲染后的二次校准
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

          return (
            <Tooltip key={`${item.label}-${index}`}>
              <TooltipTrigger asChild>
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
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    setInternalActiveIndex(index);
                    item.onClick?.();
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
              </TooltipTrigger>
              <TooltipContent
                side={orientation === "horizontal" ? "top" : "right"}
                className="capitalize"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* 统一的物理定位下划线/指示器 */}
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
