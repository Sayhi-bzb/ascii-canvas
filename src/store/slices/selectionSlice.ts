import type { StateCreator } from "zustand";
import { toast } from "sonner";
import type { CanvasState, SelectionSlice } from "../interfaces";
import { transactWithHistory, yMainGrid } from "../../lib/yjs-setup";
import { GridManager } from "../../utils/grid";
import { getSelectionBounds } from "../../utils/selection";
import { exportSelectionToString } from "../../utils/export";
import { placeCharInYMap } from "../utils";

export const createSelectionSlice: StateCreator<
  CanvasState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selections: [],

  addSelection: (area) => {
    set((s) => ({ selections: [...s.selections, area] }));
  },

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

  fillSelections: () => {
    const { selections, brushChar } = get();
    if (selections.length > 0) get().fillSelectionsWithChar(brushChar);
  },

  fillSelectionsWithChar: (char: string) => {
    const { selections } = get();
    const charWidth = GridManager.getCharWidth(char);

    transactWithHistory(() => {
      selections.forEach((area) => {
        const { minX, maxX, minY, maxY } = getSelectionBounds(area);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x += charWidth) {
            if (x + charWidth - 1 > maxX) break;
            placeCharInYMap(yMainGrid, x, y, char);
          }
        }
      });
    });
  },

  copySelectionToClipboard: () => {
    const { grid, selections } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  },

  cutSelectionToClipboard: () => {
    const { grid, selections, deleteSelection } = get();
    if (selections.length === 0) return;
    const text = exportSelectionToString(grid, selections);
    navigator.clipboard.writeText(text).then(() => {
      deleteSelection();
      toast.success("Cut!");
    });
  },
});
