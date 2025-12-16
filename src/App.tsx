// src/App.tsx
import React from "react";
import { useStore } from "zustand";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import type { CanvasStoreWithTemporal } from "./types";
import { AppLayout } from "./layout";
import { Toolbar } from "./components/Toolbar";

function App() {
  const { zoom, offset, tool, grid, setTool, clearCanvas } = useCanvasStore();

  const temporalStore = (useCanvasStore as CanvasStoreWithTemporal).temporal;
  const { undo, redo } = temporalStore.getState();
  const pastStates = useStore(temporalStore, (state) => state.pastStates);
  const futureStates = useStore(temporalStore, (state) => state.futureStates);

  const handleExport = () => {
    const text = exportToString(grid);
    if (!text) {
      alert("Canvas is empty!");
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!\n\n" + text);
    });
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
      clearCanvas();
    }
  };

  const statusBar = (
    <div className="pointer-events-none select-none font-mono text-xs text-gray-400 bg-white/50 p-2 rounded backdrop-blur-sm">
      Pos: {offset.x.toFixed(0)}, {offset.y.toFixed(0)} | Zoom:{" "}
      {(zoom * 100).toFixed(0)}% <br />
      Objects: {grid.size} <br />
      {tool === "text" && (
        <span className="text-blue-600 font-bold animate-pulse">
          Mode: Text Input (Click to focus)
        </span>
      )}
    </div>
  );

  return (
    <AppLayout statusBar={statusBar} canvas={<AsciiCanvas />}>
      <Toolbar
        tool={tool}
        setTool={setTool}
        onUndo={() => undo()}
        onRedo={() => redo()}
        canUndo={pastStates.length > 0}
        canRedo={futureStates.length > 0}
        onExport={handleExport}
        onClear={handleClear}
      />
    </AppLayout>
  );
}

export default App;
