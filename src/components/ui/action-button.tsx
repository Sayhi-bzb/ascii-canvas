"use client";
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import { CheckIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        muted: "bg-muted text-muted-foreground",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "size-8 rounded-lg [&_svg]:size-4",
        sm: "size-6 [&_svg]:size-3",
        md: "size-10 rounded-lg [&_svg]:size-4.5",
        lg: "size-12 rounded-xl [&_svg]:size-6",
        full: "w-full h-20 flex-col gap-2 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ActionButtonProps
  extends HTMLMotionProps<"button">,
    VariantProps<typeof buttonVariants> {
  icon: LucideIcon;
  label?: string;
  subLabel?: string;
  delay?: number;
  onAction: () => void | Promise<void>;
}

export function ActionButton({
  icon: Icon,
  label,
  subLabel,
  className,
  size,
  variant,
  delay = 2000,
  onAction,
  ...props
}: ActionButtonProps) {
  const [isSuccess, setIsSuccess] = React.useState(false);
  const CurrentIcon = isSuccess ? CheckIcon : Icon;

  const handlePress = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isSuccess) return;
    if (props.onClick) props.onClick(e);
    await onAction();
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), delay);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
      onClick={handlePress}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isSuccess ? "check" : "icon"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col items-center justify-center"
        >
          <CurrentIcon
            className={cn(
              size === "full"
                ? "size-5"
                : size === "lg"
                ? "size-6"
                : size === "md"
                ? "size-4"
                : "size-3.5"
            )}
          />
          {size === "full" && label && (
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">{label}</span>
              {subLabel && (
                <span className="text-[10px] opacity-60 uppercase tracking-tighter">
                  {subLabel}
                </span>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
