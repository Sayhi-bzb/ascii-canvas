import { useRef, useMemo, useEffect } from "react";
import { useSize, useEventListener } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { GridManager } from "../../utils/grid";
import { toast } from "sonner";
import { isCtrlOrMeta } from "../../utils/event";
import { Minimap } from "./Minimap";

interface AsciiCanvasProps {
  onUndo: () => void;
  onRedo: () => void;
}

export const AsciiCanvas = ({ onUndo, onRedo }: AsciiCanvasProps) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposing = useRef(false);

  // 这里的 size 会根据容器的实际排版大小进行上报
  const size = useSize(containerRef);
  const store = useCanvasStore();
  const {
    textCursor,
    writeTextString,
    backspaceText,
    newlineText,
    moveTextCursor,
    setTextCursor,
    selections,
    deleteSelection,
    grid,
    erasePoints,
    copySelectionToClipboard,
    cutSelectionToClipboard,
  } = store;

  const { draggingSelection } = useCanvasInteraction(store, containerRef);

  useCanvasRenderer(
    {
      bg: bgCanvasRef,
      scratch: scratchCanvasRef,
      ui: uiCanvasRef,
    },
    size,
    store,
    draggingSelection
  );

  // 修复核心：只要有光标或者有选区，就必须保持焦点以接收键盘事件（如 Delete）
  useEffect(() => {
    const shouldFocus = textCursor || selections.length > 0;
    if (shouldFocus && textareaRef.current) {
      // 使用 setTimeout 确保在渲染周期完成后获取焦点
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } else if (textareaRef.current && !shouldFocus) {
      // 只有在既没有光标也没有选区时（例如切换到笔刷工具），才放弃焦点
      textareaRef.current.blur();
    }
  }, [textCursor, selections.length]); // 监听 selections 长度变化

  const handleCopy = (e: ClipboardEvent) => {
    if (selections.length > 0) {
      e.preventDefault();
      copySelectionToClipboard();
      return;
    }
    if (textCursor) {
      e.preventDefault();
      const key = GridManager.toKey(textCursor.x, textCursor.y);
      const cell = grid.get(key);
      const char = cell?.char || " ";
      navigator.clipboard.writeText(char).then(() => {
        toast.success("Copied Char!");
      });
    }
  };
  useEventListener("copy", handleCopy);

  const handleCut = (e: ClipboardEvent) => {
    if (selections.length > 0) {
      e.preventDefault();
      cutSelectionToClipboard();
      return;
    }
    if (textCursor) {
      e.preventDefault();
      const key = GridManager.toKey(textCursor.x, textCursor.y);
      const cell = grid.get(key);
      const char = cell?.char || " ";
      navigator.clipboard.writeText(char).then(() => {
        erasePoints([textCursor]);
        toast.success("Cut Char!");
      });
    }
  };
  useEventListener("cut", handleCut);

  const handlePaste = (e: ClipboardEvent) => {
    if (isComposing.current) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text");
    if (!text) return;
    let pasteStartPos = textCursor;
    if (!pasteStartPos && selections.length > 0) {
      const firstSelection = selections[0];
      pasteStartPos = {
        x: Math.min(firstSelection.start.x, firstSelection.end.x),
        y: Math.min(firstSelection.start.y, firstSelection.end.y),
      };
    }
    if (pasteStartPos) {
      writeTextString(text, pasteStartPos);
      toast.success("Pasted!");
    }
  };
  useEventListener("paste", handlePaste);

  const textareaStyle: React.CSSProperties = useMemo(() => {
    // 即使没有 textCursor，如果有 selections，我们也需要 input 存在以便接收按键
    // 但我们可以把它藏得更深一点，或者保持原样，因为 opacity 是 0
    if ((!textCursor && selections.length === 0) || !size)
      return { display: "none" };

    // 如果只有选区没有光标，我们将 textarea 定位到选区左上角，或者屏幕中心
    let targetX = 0;
    let targetY = 0;

    if (textCursor) {
      const pos = GridManager.gridToScreen(
        textCursor.x,
        textCursor.y,
        store.offset.x,
        store.offset.y,
        store.zoom
      );
      targetX = pos.x;
      targetY = pos.y;
    } else if (selections.length > 0) {
      // 简单的定位兜底，防止输入法弹出在奇怪的位置
      const sel = selections[0];
      const pos = GridManager.gridToScreen(
        sel.start.x,
        sel.start.y,
        store.offset.x,
        store.offset.y,
        store.zoom
      );
      targetX = pos.x;
      targetY = pos.y;
    }

    return {
      position: "absolute",
      left: `${targetX}px`,
      top: `${targetY}px`,
      width: "1px",
      height: "1px",
      opacity: 0,
      pointerEvents: "none",
      zIndex: -1,
    };
  }, [textCursor, selections, store.offset, store.zoom, size]);

  const handleCompositionStart = () => {
    isComposing.current = true;
  };
  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>
  ) => {
    isComposing.current = false;
    const value = e.data;
    if (value) {
      writeTextString(value);
      if (textareaRef.current) textareaRef.current.value = "";
    }
  };
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing.current) return;
    const textarea = e.currentTarget;
    const value = textarea.value;
    if (value) {
      writeTextString(value);
      textarea.value = "";
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (isComposing.current) return;
    const isUndo =
      isCtrlOrMeta(e) && !e.shiftKey && e.key.toLowerCase() === "z";
    const isRedo =
      (isCtrlOrMeta(e) && e.shiftKey && e.key.toLowerCase() === "z") ||
      (isCtrlOrMeta(e) && e.key.toLowerCase() === "y");
    if (isUndo) {
      e.preventDefault();
      onUndo();
      return;
    }
    if (isRedo) {
      e.preventDefault();
      onRedo();
      return;
    }

    // 优先处理选区删除：无论是 Delete 还是 Backspace
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selections.length > 0
    ) {
      e.preventDefault();
      deleteSelection();
      return;
    }

    if (e.key === "Backspace") {
      if (textCursor) {
        e.preventDefault();
        backspaceText();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      newlineText();
    } else if (e.key.startsWith("Arrow") && textCursor) {
      e.preventDefault();
      const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      moveTextCursor(dx, dy);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTextCursor(null);
    }
  };

  // 城市规划核心修正：强制 Canvas 占满父容器，不留缝隙
  const canvasClassName =
    "absolute inset-0 w-full h-full block pointer-events-none";

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }}
      className="relative w-screen h-screen overflow-hidden bg-background touch-none select-none cursor-default"
    >
      <canvas ref={bgCanvasRef} className={canvasClassName} />
      <canvas ref={scratchCanvasRef} className={canvasClassName} />
      <canvas ref={uiCanvasRef} className={canvasClassName} />

      <Minimap containerSize={size} />

      <textarea
        ref={textareaRef}
        style={textareaStyle}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
    </div>
  );
};
