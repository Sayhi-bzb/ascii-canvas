export type SidebarActionId =
  | "toggle-grid"
  | "reset-view"
  | "open-source-code";

export type SidebarActionMeta = {
  id: SidebarActionId;
  label: string;
};
