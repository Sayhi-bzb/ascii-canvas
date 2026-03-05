import type { SidebarActionId, SidebarActionMeta } from "./types";

export const SIDEBAR_ACTION_META: Record<SidebarActionId, SidebarActionMeta> = {
  "toggle-grid": { id: "toggle-grid", label: "Show Workspace Grid" },
  "reset-view": { id: "reset-view", label: "Reset View" },
  "open-source-code": { id: "open-source-code", label: "Source Code" },
};
