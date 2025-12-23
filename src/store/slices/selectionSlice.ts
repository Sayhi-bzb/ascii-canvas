import type { StateCreator } from "zustand";
import type { CanvasState, SelectionSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getSelectionBounds } from "../../utils/selection";
import {
  exportSelectionToString,
  copySelectionToPngClipboard,
} from "../../utils/export";
import { placeCharInYMap } from "../utils";
import { toast } from "sonner";
import type { GridCell } from "../../types";

export const createSelectionSlice: StateCreator<
  CanvasState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selections: [],
  addSelection: (area) => set((s) => ({ selections: [...s.selections, area] })),
  clearSelections: () => set({ selections: [] }),

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

  copySelectionToClipboard: () => {
    const { grid, selections } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy text: ", err);
    });
  },

  cutSelectionToClipboard: () => {
    const { grid, selections, deleteSelection } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        deleteSelection();
      })
      .catch((err) => {
        console.error("Failed to cut text: ", err);
      });
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
