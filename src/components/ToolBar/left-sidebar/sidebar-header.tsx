import {
  SidebarHeader as ShadcnSidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export const SidebarHeader = () => {
  return (
    <ShadcnSidebarHeader className="h-14 border-b flex flex-row items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <div className="text-sm font-semibold tracking-tight truncate">
        ASCII Studio
      </div>
    </ShadcnSidebarHeader>
  );
};
