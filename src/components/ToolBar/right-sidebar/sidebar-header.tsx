import { X } from "lucide-react";
import {
  SidebarHeader as ShadcnSidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export const SidebarHeader = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <ShadcnSidebarHeader className="h-14 border-b flex flex-row items-center justify-between px-4">
      <div className="text-sm font-semibold tracking-tight">Properties</div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 -mr-2"
        onClick={toggleSidebar}
      >
        <X className="h-4 w-4" />
      </Button>
    </ShadcnSidebarHeader>
  );
};
