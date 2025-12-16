import React from "react";
import { useStore } from "zustand";
import {
  Download,
  Eraser,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { useCanvasStore } from "./store/canvasStore";
import { exportToString } from "./utils/export";
import type { CanvasStoreWithTemporal } from "./types";
import { AppLayout } from "./layout";

interface ToolButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}
const ToolButton = ({
  isActive,
  onClick,
  icon: Icon,
  label,
}: ToolButtonProps) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-md flex flex-col items-center gap-1 transition-all ${
      isActive
        ? "bg-slate-900 text-white shadow-md scale-105"
        : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    }`}
    title={label}
  >
    <Icon size={18} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}
const ActionButton = ({
  onClick,
  icon: Icon,
  label,
  disabled,
}: ActionButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-md flex flex-col items-center gap-1 transition-colors ${
      disabled
        ? "opacity-30 cursor-not-allowed text-slate-400 bg-white"
        : "bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-sm border border-gray-100"
    }`}
    title={label}
  >
    <Icon size={18} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

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

  // 定义各个区域的功能模块
  const toolbar = (
    <div className="flex gap-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50">
      <ToolButton
        isActive={tool === "move"}
        onClick={() => setTool("move")}
        icon={MousePointer2}
        label="Move"
      />
      <div className="w-px bg-gray-200 mx-1 h-8 self-center" />
      <ToolButton
        isActive={tool === "brush"}
        onClick={() => setTool("brush")}
        icon={Pencil}
        label="Brush"
      />
      <ToolButton
        isActive={tool === "line"}
        onClick={() => setTool("line")}
        icon={Minus}
        label="Line"
      />
      <ToolButton
        isActive={tool === "box"}
        onClick={() => setTool("box")}
        icon={Square}
        label="Box"
      />
      <ToolButton
        isActive={tool === "text"}
        onClick={() => setTool("text")}
        icon={Type}
        label="Text"
      />
      <ToolButton
        isActive={tool === "eraser"}
        onClick={() => setTool("eraser")}
        icon={Eraser}
        label="Eraser"
      />
    </div>
  );

  const actionBar = (
    <div className="flex gap-2">
      <div className="flex bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-1.5 gap-1">
        <ActionButton
          onClick={undo}
          disabled={pastStates.length === 0}
          icon={Undo2}
          label="Undo"
        />
        <ActionButton
          onClick={redo}
          disabled={futureStates.length === 0}
          icon={Redo2}
          label="Redo"
        />
      </div>
      <div className="flex bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-1.5 gap-1">
        <ActionButton onClick={handleClear} icon={Trash2} label="Clear" />
        <ActionButton onClick={handleExport} icon={Download} label="Export" />
      </div>
    </div>
  );

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
    <AppLayout
      toolbar={toolbar}
      actionBar={actionBar}
      statusBar={statusBar}
      canvas={<AsciiCanvas />}
    />
  );
}

export default App;
