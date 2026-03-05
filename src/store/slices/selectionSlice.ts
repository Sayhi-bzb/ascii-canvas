import type { StateCreator } from "zustand";
import type { CanvasState, SelectionSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getSelectionBounds } from "../../utils/selection";
import {
  copySelectionToPngClipboard,
} from "../../utils/export";
import { placeCharInYMap } from "../utils";
import { toast } from "sonner";
import type { GridCell } from "../../types";
import {
  buildClipboardPayload,
  hasClipboardSource,
  readClipboardPayload,
  writeClipboardPayload,
} from "../actions/clipboardActions";

export const createSelectionSlice: StateCreator<
  CanvasState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selections: [],
  addSelection: (area) => set((s) => ({ selections: [...s.selections, area] })),
  clearSelections: () => set({ selections: [] }),
  clearInteractionState: () => set({ selections: [], textCursor: null }),
  canCopyOrCut: () => {
    const { selections, textCursor } = get();
    return hasClipboardSource(selections, textCursor);
  },

  deleteSelection: () => {
    const { selections } = get();
    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            yMainGrid.delete(GridManager.toKey(x, y));
          }
        }
      });
    });
  },

  copySelection: async (options) => {
    const { grid, selections, textCursor, brushColor } = get();
    const payload = buildClipboardPayload(grid, selections, textCursor, brushColor);
    if (!payload) return;
    await writeClipboardPayload(payload, {
      event: options?.event,
      withRich: !!options?.rich,
    });
  },

  cutSelection: async (options) => {
    const {
      grid,
      selections,
      textCursor,
      brushColor,
      deleteSelection,
      erasePoints,
    } = get();
    const payload = buildClipboardPayload(grid, selections, textCursor, brushColor);
    if (!payload) return;

    const copied = await writeClipboardPayload(payload, {
      event: options?.event,
      withRich: false,
    });
    if (!copied) return;

    if (selections.length > 0) {
      deleteSelection();
    } else if (textCursor) {
      erasePoints([textCursor]);
    }
  },

  pasteFromClipboard: async (options) => {
    const { pasteRichData, writeTextString } = get();
    const payload = await readClipboardPayload(options?.eventDataTransfer);

    if (payload.richCells) {
      pasteRichData(payload.richCells);
      return;
    }

    if (payload.plainText) {
      writeTextString(payload.plainText);
    }
  },

  copySelectionAsPng: async (withGrid) => {
    const { grid, selections } = get();
    if (selections.length === 0) return;
    try {
      await copySelectionToPngClipboard(grid, selections, withGrid);
      toast.success("Snapshot Copied", {
        description: "Image with grid lines is ready to paste.",
      });
    } catch {
      toast.error("Snapshot Failed", {
        description: "Could not write image to clipboard.",
      });
    }
  },

  fillSelectionsWithChar: (char) => {
    const { selections, brushColor } = get();
    if (selections.length === 0) return;

    const charWidth = GridManager.getCharWidth(char);

    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x += charWidth) {
            if (x + charWidth - 1 > maxX) break;
            placeCharInYMap(yMainGrid, x, y, char, brushColor);
          }
        }
      });
    });
  },

  fillArea: (area) => {
    const { brushColor } = get();
    const { minX, maxX, minY, maxY } = getSelectionBounds(area);

    transactWithHistory(() => {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const key = GridManager.toKey(x, y);
          const existingCell = yMainGrid.get(key) as GridCell | undefined;

          if (existingCell) {
            yMainGrid.set(key, {
              char: existingCell.char,
              color: brushColor,
            });
          }
        }
      }
    });
  },
});
