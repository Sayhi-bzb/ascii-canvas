import { useKeyPress, useLocalStorageState } from "ahooks";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/ToolBar/dock";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { Suspense, lazy } from "react";
import { runRedo, runUndo } from "./store/actions/shortcutActions";
import { runAction } from "./features/actions";
import { resolveFillHotkeyChar } from "./features/input-arbiter";
import { feedback } from "./services/effects";
import { useShallow } from "zustand/react/shallow";
import { SessionTabs } from "./components/SessionTabs";

const SidebarRight = lazy(() =>
  import("./components/ToolBar/sidebar-right").then((module) => ({
    default: module.SidebarRight,
  }))
);

export default function App() {
  const { tool, setTool } = useCanvasStore(
    useShallow((state) => ({
      tool: state.tool,
      setTool: state.setTool,
    }))
  );

  const [isRightPanelOpen, setIsRightPanelOpen] = useLocalStorageState<boolean>(
    "ui-right-panel-status",
    { defaultValue: true }
  );

  const handleUndo = () => {
    runUndo();
    feedback.dismiss();
  };

  const handleRedo = () => {
    runRedo();
  };

  const runGlobalCommand = (command: "undo" | "redo", event: KeyboardEvent) => {
    const result = runAction(command, {
      source: "global-hotkey",
      onUndo: handleUndo,
      onRedo: handleRedo,
    });
    if (result.succeeded) event.preventDefault();
  };

  useKeyPress(["meta.z", "ctrl.z"], (e) => {
    runGlobalCommand("undo", e);
  });

  useKeyPress(["meta.shift.z", "ctrl.shift.z", "meta.y", "ctrl.y"], (e) => {
    runGlobalCommand("redo", e);
  });

  useKeyPress(
    (event) => resolveFillHotkeyChar(event) !== null,
    (event) => {
      const fillChar = resolveFillHotkeyChar(event);
      if (!fillChar) return;
      const result = runAction("fill-selection-char", {
        source: "global-hotkey",
        fillChar,
      });
      if (result.succeeded) event.preventDefault();
    },
    {
      events: ["keydown"],
    }
  );

  return (
    <SidebarProvider className="flex h-full w-full overflow-hidden">
      <SidebarInset className="relative flex flex-1 flex-col overflow-hidden">
        <SessionTabs />
        <AppLayout
          canvas={<AsciiCanvas onUndo={handleUndo} onRedo={handleRedo} />}
        >
          <Toolbar
            tool={tool}
            setTool={setTool}
            onUndo={handleUndo}
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
