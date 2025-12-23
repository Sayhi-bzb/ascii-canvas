import type { StateCreator } from "zustand";
import { toast } from "sonner";
import type { CanvasState, SelectionSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import {
  getSelectionBounds,
  getSelectionsBoundingBox,
} from "../../utils/selection";
import {
  exportSelectionToString,
  generateCanvasFromGrid,
} from "../../utils/export";
import { placeCharInYMap } from "../utils";

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
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied Text!"));
  },

  cutSelectionToClipboard: () => {
    const { grid, selections, deleteSelection } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => {
      deleteSelection();
      toast.success("Cut Text!");
    });
  },

  fillSelectionsWithChar: (char) => {
    const { selections, brushColor } = get();
    if (selections.length === 0) return;

    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            placeCharInYMap(yMainGrid, x, y, char, brushColor);
          }
        }
      });
    });
    toast.success(`Filled area with ${char}`);
  },

  copySelectionAsPngToClipboard: (showGrid = true) => {
    const { grid, selections } = get();
    if (selections.length === 0) {
      toast.error("Select an area first");
      return;
    }

    const bounds = getSelectionsBoundingBox(selections);
    const canvas = generateCanvasFromGrid(grid, {
      ...bounds,
      showGrid,
      padding: 1,
    });

    if (canvas) {
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          return;
        }
        try {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]).then(() => {
            toast.success("Copied Image!");
          });
        } catch (err) {
          console.error(err);
          toast.error("Clipboard write failed (Browser limit?)");
        }
      });
    }
  },
});
