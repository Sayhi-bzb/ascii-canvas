import { Box } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-primary p-1 ${className}`}
    >
      <Box className="size-5 text-primary-foreground" />
    </div>
  );
}
