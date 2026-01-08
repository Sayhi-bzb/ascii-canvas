import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useSize, useEventListener } from 'ahooks';
import { useCanvasStore } from '../../store/canvasStore';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useCanvasRenderer } from './hooks/useCanvasRenderer';
import { GridManager } from '../../utils/grid';
import { isCtrlOrMeta } from '../../utils/event';
import { Minimap } from './Minimap';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { Copy, Scissors, Trash2, Clipboard, Image, Palette } from 'lucide-react';
import { exportSelectionToString, exportSelectionToJSON } from '../../utils/export';

const MIME_RICH_DATA = 'web application/x-ascii-metropolis';

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
    pasteRichData,
    backspaceText,
    newlineText,
    indentText,
    moveTextCursor,
    setTextCursor,
    selections,
    deleteSelection,
    grid,
    erasePoints,
    copySelectionAsPng,
  } = store;

  const { draggingSelection } = useCanvasInteraction(store, containerRef);

  const shouldIgnoreClipboardEvent = () => {
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement) return false;
    const tagName = activeElement.tagName.toLowerCase();
    if (tagName === 'input') return true;
    if (tagName === 'textarea') {
      return activeElement !== textareaRef.current;
    }
    return activeElement.isContentEditable;
  };

  useCanvasRenderer(
    { bg: bgCanvasRef, scratch: scratchCanvasRef, ui: uiCanvasRef },
    size,
    store,
    draggingSelection
  );

  useEffect(() => {
    const shouldFocus = textCursor || selections.length > 0;
    if (shouldFocus && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    } else if (textareaRef.current && !shouldFocus) {
      textareaRef.current.blur();
    }
  }, [textCursor, selections.length]);

  const getTransferData = useCallback(() => {
    if (selections.length > 0) {
      return {
        plain: exportSelectionToString(grid, selections),
        rich: exportSelectionToJSON(grid, selections),
      };
    } else if (textCursor) {
      const cell = grid.get(GridManager.toKey(textCursor.x, textCursor.y));
      const char = cell?.char || ' ';
      return {
        plain: char,
        rich: JSON.stringify({
          type: 'ascii-metropolis-zone',
          version: 1,
          cells: [{ x: 0, y: 0, char, color: cell?.color || store.brushColor }],
        }),
      };
    }
    return null;
  }, [grid, selections, textCursor, store.brushColor]);

  const writeClipboard = useCallback(
    async (plain: string, rich?: string | null, syncEvent?: ClipboardEvent) => {
      if (syncEvent?.clipboardData) {
        syncEvent.preventDefault();
        syncEvent.clipboardData.setData('text/plain', plain);
        if (rich) syncEvent.clipboardData.setData(MIME_RICH_DATA, rich);
      } else {
        const clipboardMap: Record<string, Blob> = {
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        };
        if (rich)
          clipboardMap[MIME_RICH_DATA] = new Blob([rich], {
            type: MIME_RICH_DATA,
          });

        try {
          await navigator.clipboard.write([new ClipboardItem(clipboardMap)]);
        } catch {
          navigator.clipboard.writeText(plain);
        }
      }
    },
    []
  );

  const handleStandardCopy = (e?: ClipboardEvent) => {
    if (e && shouldIgnoreClipboardEvent()) return;
    const data = getTransferData();
    if (data) writeClipboard(data.plain, null, e);
  };

  const handleRichCopy = () => {
    const data = getTransferData();
    if (data) writeClipboard(data.plain, data.rich);
  };

  const handleCut = (e?: ClipboardEvent) => {
    if (e && shouldIgnoreClipboardEvent()) return;
    handleStandardCopy(e);
    deleteSelection();
    if (textCursor) erasePoints([textCursor]);
  };

  const performPaste = async (eventDataTransfer?: DataTransfer) => {
    try {
      if (eventDataTransfer) {
        const richData = eventDataTransfer.getData(MIME_RICH_DATA);
        if (richData) return pasteRichData(JSON.parse(richData).cells);
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes(MIME_RICH_DATA)) {
          const blob = await item.getType(MIME_RICH_DATA);
          return pasteRichData(JSON.parse(await blob.text()).cells);
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) writeTextString(text);
    } catch {
      // Fail silently
    }
  };

  useEventListener('copy', handleStandardCopy);
  useEventListener('cut', handleCut);
  useEventListener('paste', (e: ClipboardEvent) => {
    if (shouldIgnoreClipboardEvent()) return;
    e.preventDefault();
    performPaste(e.clipboardData || undefined);
  });

  const textareaStyle: React.CSSProperties = useMemo(() => {
    if ((!textCursor && selections.length === 0) || !size) return { display: 'none' };
    const pos = textCursor
      ? GridManager.gridToScreen(
          textCursor.x,
          textCursor.y,
          store.offset.x,
          store.offset.y,
          store.zoom
        )
      : GridManager.gridToScreen(
          selections[0].start.x,
          selections[0].start.y,
          store.offset.x,
          store.offset.y,
          store.zoom
        );

    return {
      position: 'absolute',
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      width: '1px',
      height: '1px',
      opacity: 0,
      pointerEvents: 'none',
      zIndex: -1,
    };
  }, [textCursor, selections, store.offset, store.zoom, size]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (isComposing.current) return;
    const isUndo = isCtrlOrMeta(e) && !e.shiftKey && e.key.toLowerCase() === 'z';
    const isRedo =
      (isCtrlOrMeta(e) && e.shiftKey && e.key.toLowerCase() === 'z') ||
      (isCtrlOrMeta(e) && e.key.toLowerCase() === 'y');

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
    if ((e.key === 'Delete' || e.key === 'Backspace') && selections.length > 0) {
      e.preventDefault();
      deleteSelection();
      return;
    }

    if (e.key === 'Backspace') {
      if (textCursor) {
        e.preventDefault();
        backspaceText();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      newlineText();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      indentText();
    } else if (e.key.startsWith('Arrow') && textCursor) {
      e.preventDefault();
      const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      moveTextCursor(dx, dy);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTextCursor(null);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          style={{ touchAction: 'none' }}
          className="relative w-screen h-screen overflow-hidden bg-background touch-none select-none cursor-default"
        >
          <canvas
            ref={bgCanvasRef}
            className="absolute inset-0 w-full h-full block pointer-events-none"
          />
          <canvas
            ref={scratchCanvasRef}
            className="absolute inset-0 w-full h-full block pointer-events-none"
          />
          <canvas
            ref={uiCanvasRef}
            className="absolute inset-0 w-full h-full block pointer-events-none"
          />
          <Minimap containerSize={size} />
          <textarea
            ref={textareaRef}
            style={textareaStyle}
            onCompositionStart={() => {
              isComposing.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposing.current = false;
              if (e.data) writeTextString(e.data);
              if (textareaRef.current) textareaRef.current.value = '';
            }}
            onInput={(e) => {
              if (!isComposing.current && e.currentTarget.value) {
                writeTextString(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
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
          onClick={() => handleStandardCopy()}
          disabled={!textCursor && selections.length === 0}
        >
          <Copy className="mr-2 size-4" />
          <span>Copy as Text</span>
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleRichCopy} disabled={!textCursor && selections.length === 0}>
          <Palette className="mr-2 size-4" />
          <span>Copy with Color</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => copySelectionAsPng(true)}
          disabled={selections.length === 0}
        >
          <Image className="mr-2 size-4" />
          <span>Snapshot (PNG)</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleCut()}
          disabled={!textCursor && selections.length === 0}
        >
          <Scissors className="mr-2 size-4" />
          <span>Cut Zone</span>
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => performPaste()}>
          <Clipboard className="mr-2 size-4" />
          <span>Paste Lot</span>
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={deleteSelection}
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
