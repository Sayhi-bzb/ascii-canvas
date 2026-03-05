import type { Point } from "@/types";
import { browser } from "@/services/effects";
import { APP_SOURCE_URL } from "@/lib/constants";
import type { SidebarActionId } from "./types";
import {
  actionSucceeded,
  actionUnhandled,
  type ActionResult,
} from "@/features/actions/result";

type RunSidebarActionOptions = {
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  setZoom: (updater: (prev: number) => number) => void;
  setOffset: (updater: (prev: Point) => Point) => void;
  sourceCodeUrl?: string;
};

export const runSidebarAction = (
  actionId: SidebarActionId,
  options: RunSidebarActionOptions
): ActionResult => {
  switch (actionId) {
    case "toggle-grid":
      options.setShowGrid(!options.showGrid);
      return actionSucceeded();
    case "reset-view":
      options.setZoom(() => 1);
      options.setOffset(() => ({ x: 0, y: 0 }));
      return actionSucceeded();
    case "open-source-code":
      browser.openExternal(options.sourceCodeUrl ?? APP_SOURCE_URL);
      return actionSucceeded();
    default:
      return actionUnhandled("unknown-sidebar-action");
  }
};
