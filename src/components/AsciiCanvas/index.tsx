import { useRef, useMemo } from "react";
import { useSize } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";

export const AsciiCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useSize(containerRef);
  const store = useCanvasStore();

  const { bind, draggingSelection } = useCanvasInteraction(store, containerRef);
  useCanvasRenderer(canvasRef, size, store, draggingSelection);

  const cursorClass = useMemo(() => {
    switch (store.tool) {
      case "text":
        return "cursor-text";
      case "select":
        return "cursor-default";
      case "fill":
        return "cursor-cell";
      default:
        return "cursor-crosshair";
    }
  }, [store.tool]);

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className={`w-full h-full overflow-hidden bg-gray-50 touch-none select-none ${cursorClass}`}
      {...bind}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
