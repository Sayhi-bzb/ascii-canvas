import { useRef, useMemo, useEffect } from "react";
import { useSize, useEventListener } from "ahooks";
import { useCanvasStore } from "../../store/canvasStore";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { GridManager } from "../../utils/grid";
import { toast } from "sonner";
import { isCtrlOrMeta } from "../../utils/event";
import { Minimap } from "./Minimap";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Copy, Scissors, Trash2, Clipboard } from "lucide-react";

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

  const size = useSize(containerRef);
  const store = useCanvasStore();
  const {
    textCursor,
    writeTextString,
    backspaceText,
    newlineText,
    indentText,
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

  useEffect(() => {
    const shouldFocus = textCursor || selections.length > 0;
    if (shouldFocus && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } else if (textareaRef.current && !shouldFocus) {
      textareaRef.current.blur();
    }
  }, [textCursor, selections.length]);

  const handleCopy = (e?: ClipboardEvent) => {
    if (selections.length > 0) {
      e?.preventDefault();
      copySelectionToClipboard();
      return;
    }
    if (textCursor) {
      e?.preventDefault();
      const key = GridManager.toKey(textCursor.x, textCursor.y);
      const cell = grid.get(key);
      const char = cell?.char || " ";
      navigator.clipboard.writeText(char).then(() => {
        toast.success("Copied Char!");
      });
    }
  };
  useEventListener("copy", handleCopy);

  const handleCut = (e?: ClipboardEvent) => {
    if (selections.length > 0) {
      e?.preventDefault();
      cutSelectionToClipboard();
      return;
    }
    if (textCursor) {
      e?.preventDefault();
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

  const performPaste = (text: string) => {
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
    } else {
      const centerX = Math.floor(
        (-store.offset.x + (size?.width || 0) / 2) / (10 * store.zoom)
      );
      const centerY = Math.floor(
        (-store.offset.y + (size?.height || 0) / 2) / (20 * store.zoom)
      );
      writeTextString(text, { x: centerX, y: centerY });
      toast.success("Pasted to center!");
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    if (isComposing.current) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text");
    if (text) performPaste(text);
  };
  useEventListener("paste", handlePaste);

  const handleMenuPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) performPaste(text);
    } catch (err) {
      toast.error("Failed to read clipboard");
    }
  };

  const textareaStyle: React.CSSProperties = useMemo(() => {
    if ((!textCursor && selections.length === 0) || !size)
      return { display: "none" };

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
    } else if (e.key === "Tab") {
      e.preventDefault();
      indentText();
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

  const canvasClassName =
    "absolute inset-0 w-full h-full block pointer-events-none";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={() => handleCopy()}
          disabled={!textCursor && selections.length === 0}
        >
          <Copy className="mr-2 size-4" />
          <span>Copy Zone</span>
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleCut()}
          disabled={!textCursor && selections.length === 0}
        >
          <Scissors className="mr-2 size-4" />
          <span>Cut Zone</span>
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleMenuPaste}>
          <Clipboard className="mr-2 size-4" />
          <span>Paste Lot</span>
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => deleteSelection()}
          className="text-destructive focus:text-destructive"
          disabled={selections.length === 0}
        >
          <Trash2 className="mr-2 size-4" />
          <span>Demolish (Delete)</span>
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
