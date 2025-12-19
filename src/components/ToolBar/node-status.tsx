import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusIconProps {
  active: boolean;
  className?: string;
}

export const VisibilityIcon = ({ active, className }: StatusIconProps) => {
  const Icon = active ? Eye : EyeOff;
  return <Icon className={cn("shrink-0", className)} />;
};

export const LockIcon = ({ active, className }: StatusIconProps) => {
  const Icon = active ? Lock : Unlock;
  return <Icon className={cn("shrink-0", className)} />;
};
