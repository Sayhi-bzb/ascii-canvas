import { useRef, useMemo, useEffect } from "react";
import { useSize, useEventListener } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { gridToScreen } from "../../utils/math";
import { exportSelectionToString } from "../../utils/export";
import { toast } from "sonner";

export const AsciiCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const size = useSize(containerRef);
  const store = useCanvasStore();
  const {
    tool,
    textCursor,
    writeTextString,
    backspaceText,
    newlineText,
    moveTextCursor,
    setTextCursor,
    selections,
    grid,
  } = store;

  const { bind, draggingSelection, isSpacePanning } = useCanvasInteraction(
    store,
    containerRef
  );
  useCanvasRenderer(canvasRef, size, store, draggingSelection);

  useEffect(() => {
    if (tool === "text" && textCursor && textareaRef.current) {
      textareaRef.current.focus();
    } else if (textareaRef.current) {
      textareaRef.current.blur();
    }
  }, [tool, textCursor]);

  const handleCopy = (e: ClipboardEvent) => {
    if (selections.length > 0) {
      e.preventDefault();
      const selectedText = exportSelectionToString(grid, selections);
      navigator.clipboard.writeText(selectedText).then(() => {
        toast.success("Selection copied!", {
          description: `${selectedText.length} characters copied.`,
        });
      });
    }
  };

  useEventListener("copy", handleCopy);

  const cursorClass = useMemo(() => {
    if (isSpacePanning) {
      return "cursor-grab";
    }
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
  }, [store.tool, isSpacePanning]);

  const textareaStyle: React.CSSProperties = useMemo(() => {
    if (!textCursor || !size) return { display: "none" };

    const { x, y } = gridToScreen(
      textCursor.x,
      textCursor.y,
      store.offset.x,
      store.offset.y,
      store.zoom
    );

    return {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: "1px",
      height: "1px",
      opacity: 0,
      pointerEvents: "none",
    };
  }, [textCursor, store.offset, store.zoom, size]);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const value = textarea.value;
    if (value) {
      writeTextString(value);
      textarea.value = "";
    }
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    e.stopPropagation(); // Prevent global listeners from firing
    if (e.key === "Backspace") {
      e.preventDefault();
      backspaceText();
    } else if (e.key === "Enter") {
      e.preventDefault();
      newlineText();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveTextCursor(0, -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveTextCursor(0, 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveTextCursor(-1, 0);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moveTextCursor(1, 0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTextCursor(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className={`w-full h-full overflow-hidden bg-gray-50 touch-none select-none ${cursorClass}`}
      {...bind}
    >
      <canvas ref={canvasRef} />
      <textarea
        ref={textareaRef}
        style={textareaStyle}
        onInput={handleTextareaInput}
        onKeyDown={handleTextareaKeyDown}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
    </div>
  );
};
