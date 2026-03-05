import { toast } from "sonner";
import { useKeyPress, useLocalStorageState } from "ahooks";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/ToolBar/dock";
import { isCtrlOrMeta } from "./utils/event";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { Suspense, lazy } from "react";
import { shouldIgnoreClipboardShortcut } from "./utils/dom-focus";
import { runRedo, runUndo } from "./store/actions/shortcutActions";

const SidebarRight = lazy(() =>
  import("./components/ToolBar/sidebar-right").then((module) => ({
    default: module.SidebarRight,
  }))
);

export default function App() {
  const {
    tool,
    grid,
    setTool,
    fillSelectionsWithChar,
    copySelection,
    cutSelection,
    canCopyOrCut,
  } = useCanvasStore();

  const [isRightPanelOpen, setIsRightPanelOpen] = useLocalStorageState<boolean>(
    "ui-right-panel-status",
    { defaultValue: true }
  );

  const handleUndo = () => {
    runUndo();
    toast.dismiss();
  };

  const handleRedo = () => {
    runRedo();
  };

  useKeyPress(["meta.z", "ctrl.z"], (e) => {
    if (shouldIgnoreClipboardShortcut(document.activeElement)) return;
    e.preventDefault();
    handleUndo();
  });

  useKeyPress(["meta.shift.z", "ctrl.shift.z", "meta.y", "ctrl.y"], (e) => {
    if (shouldIgnoreClipboardShortcut(document.activeElement)) return;
    e.preventDefault();
    handleRedo();
  });

  useKeyPress(["meta.c", "ctrl.c"], (e) => {
    if (shouldIgnoreClipboardShortcut(document.activeElement)) return;
    if (!canCopyOrCut()) return;
    e.preventDefault();
    void copySelection();
  });

  useKeyPress(["meta.x", "ctrl.x"], (e) => {
    if (shouldIgnoreClipboardShortcut(document.activeElement)) return;
    if (!canCopyOrCut()) return;
    e.preventDefault();
    void cutSelection();
  });

  useKeyPress(
    (event) => !isCtrlOrMeta(event) && !event.altKey && event.key.length === 1,
    (event) => {
      const { selections, textCursor } = useCanvasStore.getState();
      if (selections.length > 0 && !textCursor) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          event.preventDefault();
          fillSelectionsWithChar(event.key);
        }
      }
    },
    {
      events: ["keydown"],
    }
  );

  const handleExport = () => {
    const text = exportToString(grid);
    if (!text) {
      toast.warning("Canvas is empty!", {
        description: "Draw something before exporting.",
      });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!", {
        description: `${text.length} characters ready to paste.`,
      });
    });
  };

  return (
    <SidebarProvider className="flex h-full w-full overflow-hidden">
      <SidebarInset className="relative flex flex-1 flex-col overflow-hidden">
        <AppLayout
          canvas={<AsciiCanvas onUndo={handleUndo} onRedo={handleRedo} />}
        >
          <Toolbar
            tool={tool}
            setTool={setTool}
            onUndo={handleUndo}
            onExport={handleExport}
          />
        </AppLayout>

        <div className="absolute top-0 right-0 h-full pointer-events-none z-50">
          <SidebarProvider
            open={isRightPanelOpen}
            onOpenChange={setIsRightPanelOpen}
            className="h-full items-end"
          >
            <Suspense fallback={<div className="w-0" />}>
              <SidebarRight />
            </Suspense>
          </SidebarProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
