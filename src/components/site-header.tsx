import { SidebarIcon, Settings2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "./ui/breadcrumb";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useSidebar } from "./ui/sidebar";

interface SiteHeaderProps {
  onToggleRight: () => void;
  isRightOpen: boolean;
}

export function SiteHeader({ onToggleRight, isRightOpen }: SiteHeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b justify-between pr-4">
      <div className="flex h-[--header-height] w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1">
                ASCII Art Canvas
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <Button
        variant={isRightOpen ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={onToggleRight}
        title="Toggle Properties"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </header>
  );
}
