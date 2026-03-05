import { useRef, useMemo, useEffect } from 'react';
import { useSize, useEventListener } from 'ahooks';
import { useCanvasStore } from '../../store/canvasStore';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useCanvasRenderer } from './hooks/useCanvasRenderer';
import { GridManager } from '../../utils/grid';
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
import {
  canRunManagedClipboardCommand,
  resolveHistoryShortcutCommand,
  runEditorCommand,
} from '../../store/actions/editorCommands';

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
    copySelectionAsPng,
    canCopyOrCut,
  } = store;

  const { draggingSelection } = useCanvasInteraction(store, containerRef);

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

  const handleStandardCopy = (e?: ClipboardEvent) => {
    runEditorCommand('copy', {
      source: e ? 'clipboard-event' : 'context-menu',
      clipboardEvent: e,
      managedTextarea: textareaRef.current,
    });
  };

  const handleRichCopy = () => {
    runEditorCommand('copy-rich', { source: 'context-menu' });
  };

  const handleCut = (e?: ClipboardEvent) => {
    runEditorCommand('cut', {
      source: e ? 'clipboard-event' : 'context-menu',
      clipboardEvent: e,
      managedTextarea: textareaRef.current,
    });
  };

  useEventListener('copy', handleStandardCopy);
  useEventListener('cut', handleCut);
  useEventListener('paste', (e: ClipboardEvent) => {
    if (!canRunManagedClipboardCommand(textareaRef.current)) return;
    e.preventDefault();
    runEditorCommand('paste', {
      source: 'clipboard-event',
      clipboardEvent: e,
      managedTextarea: textareaRef.current,
    });
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
    const historyCommand = resolveHistoryShortcutCommand(e);
    if (historyCommand) {
      e.preventDefault();
      runEditorCommand(historyCommand, {
        source: 'canvas-keydown',
        managedTextarea: textareaRef.current,
        onUndo,
        onRedo,
      });
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
          disabled={!canCopyOrCut()}
        >
          <Copy className="mr-2 size-4" />
          <span>Copy as Text</span>
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleRichCopy} disabled={!canCopyOrCut()}>
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
          disabled={!canCopyOrCut()}
        >
          <Scissors className="mr-2 size-4" />
          <span>Cut Zone</span>
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            runEditorCommand('paste', { source: 'context-menu' });
          }}
        >
          <Clipboard className="mr-2 size-4" />
          <span>Paste Lot</span>
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={deleteSelection}
          variant="destructive"
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
