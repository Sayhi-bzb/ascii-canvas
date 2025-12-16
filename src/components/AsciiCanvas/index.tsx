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
  // 新增：引入一个标记，用来记录“是否正在使用中文输入法选词”
  const isComposing = useRef(false);

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

  // 自动聚焦逻辑
  useEffect(() => {
    if (tool === "text" && textCursor && textareaRef.current) {
      // 稍微延迟聚焦，防止点击事件冲突
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
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
      // 关键：确保输入法候选框能出现在正确位置
      zIndex: -1,
    };
  }, [textCursor, store.offset, store.zoom, size]);

  // --- W3C 标准中文输入处理流程 ---

  // 1. 选词开始：比如按下了 's' 准备打 '是'
  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  // 2. 选词结束：用户按下了空格或回车，选定了 '是'
  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>
  ) => {
    isComposing.current = false;
    // 获取最终确认的汉字
    const value = e.data;
    if (value) {
      writeTextString(value);
      // 清空输入框，准备下一次输入
      if (textareaRef.current) textareaRef.current.value = "";
    }
  };

  // 3. 常规输入：处理英文、数字，或者中文输入法确认后的数据流
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    // 如果正在选词（isComposing 为 true），直接无视这个事件！
    // 这就完美解决了 "s" 和 "是" 同时出现的问题
    if (isComposing.current) {
      return;
    }

    const textarea = e.currentTarget;
    const value = textarea.value;

    // 只有在非选词状态下，才处理输入
    if (value) {
      writeTextString(value);
      textarea.value = "";
    }
  };

  // 4. 按键处理：只负责功能键（回车、删除、方向），不负责字符输入
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();

    // 如果正在选词，不要处理任何功能键（比如回车可能是确认选词，不应该是换行）
    if (isComposing.current) return;

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
    // 注意：这里不再有 writeTextChar 的调用，全部交给 handleInput 和 compositionEnd
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
