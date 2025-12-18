import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useKeyPress } from "ahooks";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/Toolbar";
import { undoManager } from "./lib/yjs-setup";
import { isCtrlOrMeta } from "./utils/event";

import { SidebarLeft } from "./components/sidebar-left";
import { SidebarRight } from "./components/sidebar-right";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { SiteHeader } from "./components/site-header";

function App() {
  const {
    tool,
    grid,
    setTool,
    clearCanvas,
    fillSelectionsWithChar,
    copySelectionToClipboard,
    cutSelectionToClipboard,
  } = useCanvasStore();

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  useEffect(() => {
    const updateStackStatus = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };

    undoManager.on("stack-item-added", updateStackStatus);
    undoManager.on("stack-item-popped", updateStackStatus);

    return () => {
      undoManager.off("stack-item-added", updateStackStatus);
      undoManager.off("stack-item-popped", updateStackStatus);
    };
  }, []);

  const handleUndo = () => {
    undoManager.undo();
    toast.dismiss();
  };

  const handleRedo = () => {
    undoManager.redo();
  };

  useKeyPress(["meta.z", "ctrl.z"], (e) => {
    e.preventDefault();
    handleUndo();
  });

  useKeyPress(["meta.shift.z", "ctrl.shift.z", "meta.y", "ctrl.y"], (e) => {
    e.preventDefault();
    handleRedo();
  });

  useKeyPress(["meta.c", "ctrl.c"], (e) => {
    e.preventDefault();
    copySelectionToClipboard();
  });

  useKeyPress(["meta.x", "ctrl.x"], (e) => {
    e.preventDefault();
    cutSelectionToClipboard();
  });

  useKeyPress(
    (event) => !isCtrlOrMeta(event) && !event.altKey && event.key.length === 1,
    (event) => {
      const { selections, textCursor } = useCanvasStore.getState();
      if (selections.length > 0 && !textCursor) {
        event.preventDefault();
        fillSelectionsWithChar(event.key);
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

  const handleClear = () => {
    clearCanvas();
    toast.success("Canvas Cleared", {
      description: "Start fresh!",
    });
  };

  return (
    <div className="[--header-height:3.5rem] h-full w-full">
      <SidebarProvider className="flex flex-col h-full">
        <SiteHeader
          isRightOpen={isRightPanelOpen}
          onToggleRight={() => setIsRightPanelOpen(!isRightPanelOpen)}
        />
        <div className="flex flex-1 overflow-hidden relative">
          <SidebarLeft />

          <SidebarInset className="h-full w-full overflow-hidden">
            <AppLayout
              canvas={<AsciiCanvas onUndo={handleUndo} onRedo={handleRedo} />}
            >
              <Toolbar
                tool={tool}
                setTool={setTool}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                onExport={handleExport}
                onClear={handleClear}
              />
            </AppLayout>
          </SidebarInset>

          <SidebarProvider
            open={isRightPanelOpen}
            onOpenChange={setIsRightPanelOpen}
            className="absolute top-0 right-0 h-full w-auto min-h-0 z-50 pointer-events-none"
          >
            <SidebarRight />
          </SidebarProvider>
        </div>
      </SidebarProvider>
    </div>
  );
}

export default App;
