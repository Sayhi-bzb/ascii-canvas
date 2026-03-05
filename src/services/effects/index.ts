import { toast } from "sonner";

type ToastOptions = Parameters<typeof toast.success>[1];

const hasClipboard = () =>
  typeof navigator !== "undefined" && typeof navigator.clipboard !== "undefined";

export const clipboard = {
  async writeText(text: string) {
    if (!hasClipboard()) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },
  async writeItems(items: ClipboardItem[]) {
    if (!hasClipboard() || items.length === 0) return false;
    try {
      await navigator.clipboard.write(items);
      return true;
    } catch {
      return false;
    }
  },
  async readItems() {
    if (!hasClipboard()) return null;
    try {
      return await navigator.clipboard.read();
    } catch {
      return null;
    }
  },
  async readText() {
    if (!hasClipboard()) return null;
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  },
};

export const browser = {
  openExternal(url: string, target: "_blank" | "_self" = "_blank") {
    if (typeof window === "undefined") return null;
    return window.open(url, target, "noopener,noreferrer");
  },
};

export const feedback = {
  success(message: string, options?: ToastOptions) {
    toast.success(message, options);
  },
  error(message: string, options?: ToastOptions) {
    toast.error(message, options);
  },
  warning(message: string, options?: ToastOptions) {
    toast.warning(message, options);
  },
  dismiss() {
    toast.dismiss();
  },
};
