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
import { runRedo, runUndo } from "./store/actions/shortcutActions";
import { runEditorCommand } from "./store/actions/editorCommands";

const SidebarRight = lazy(() =>
  import("./components/ToolBar/sidebar-right").then((module) => ({
    default: module.SidebarRight,
  }))
);

export default function App() {
  const { tool, grid, setTool } = useCanvasStore();

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

  const runGlobalCommand = (
    command: "undo" | "redo" | "copy" | "cut",
    event: KeyboardEvent
  ) => {
    const handled = runEditorCommand(command, {
      source: "global-hotkey",
      onUndo: handleUndo,
      onRedo: handleRedo,
    });
    if (handled) event.preventDefault();
  };

  useKeyPress(["meta.z", "ctrl.z"], (e) => {
    runGlobalCommand("undo", e);
  });

  useKeyPress(["meta.shift.z", "ctrl.shift.z", "meta.y", "ctrl.y"], (e) => {
    runGlobalCommand("redo", e);
  });

  useKeyPress(["meta.c", "ctrl.c"], (e) => {
    runGlobalCommand("copy", e);
  });

  useKeyPress(["meta.x", "ctrl.x"], (e) => {
    runGlobalCommand("cut", e);
  });

  useKeyPress(
    (event) => !isCtrlOrMeta(event) && !event.altKey && event.key.length === 1,
    (event) => {
      const handled = runEditorCommand("fill-selection-char", {
        source: "global-hotkey",
        fillChar: event.key,
      });
      if (handled) event.preventDefault();
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
