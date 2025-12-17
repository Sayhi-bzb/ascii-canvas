import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/Toolbar";
import { undoManager } from "./lib/yjs-setup";

function App() {
  const {
    zoom,
    offset,
    tool,
    grid,
    textCursor,
    setTool,
    clearCanvas,
    // ✨ 获取新指令
    fillSelectionsWithChar,
  } = useCanvasStore();

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;

      // 处理撤销/重做
      if (isCtrlOrMeta && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return; // 处理完就返回
      }
      if (
        (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === "z") ||
        (isCtrlOrMeta && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        handleRedo();
        return; // 处理完就返回
      }

      // ✨ 新增：处理选区内输入
      // 条件：1. 按键是单个字符 2. 没有按下Ctrl/Meta/Alt 3. 有选区 4. 当前没有文本光标
      const { selections, textCursor } = useCanvasStore.getState();
      if (
        !isCtrlOrMeta &&
        !isAlt &&
        e.key.length === 1 &&
        selections.length > 0 &&
        !textCursor
      ) {
        e.preventDefault();
        fillSelectionsWithChar(e.key);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [fillSelectionsWithChar]); // 添加依赖

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

  const statusBar = (
    <div className="pointer-events-none select-none font-mono text-xs text-gray-400 bg-white/50 p-2 rounded backdrop-blur-sm">
      Pos: {offset.x.toFixed(0)}, {offset.y.toFixed(0)} | Zoom:{" "}
      {(zoom * 100).toFixed(0)}% <br />
      Objects: {grid.size} <br />
      {!!textCursor && (
        <span className="text-blue-600 font-bold animate-pulse">
          Mode: Text Input (Click to focus)
        </span>
      )}
    </div>
  );

  return (
    <AppLayout
      statusBar={statusBar}
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
  );
}

export default App;
