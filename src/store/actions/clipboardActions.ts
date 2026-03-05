import { exportSelectionToJSON, exportSelectionToString } from "../../utils/export";
import { GridManager } from "../../utils/grid";
import type { GridMap, Point, SelectionArea } from "../../types";
import type { RichTextCell } from "../interfaces";

export const MIME_RICH_DATA = "web application/x-ascii-metropolis";

interface ClipboardPayload {
  plain: string;
  rich: string | null;
}

export const hasClipboardSource = (
  selections: SelectionArea[],
  textCursor: Point | null
) => {
  return selections.length > 0 || !!textCursor;
};

export const buildClipboardPayload = (
  grid: GridMap,
  selections: SelectionArea[],
  textCursor: Point | null,
  brushColor: string
): ClipboardPayload | null => {
  if (!hasClipboardSource(selections, textCursor)) return null;

  if (selections.length > 0) {
    return {
      plain: exportSelectionToString(grid, selections),
      rich: exportSelectionToJSON(grid, selections),
    };
  }

  if (!textCursor) return null;
  const cell = grid.get(GridManager.toKey(textCursor.x, textCursor.y));
  const char = cell?.char || " ";
  return {
    plain: char,
    rich: JSON.stringify({
      type: "ascii-metropolis-zone",
      version: 1,
      cells: [{ x: 0, y: 0, char, color: cell?.color || brushColor }],
    }),
  };
};

interface WriteClipboardOptions {
  event?: ClipboardEvent;
  withRich?: boolean;
}

export const writeClipboardPayload = async (
  payload: ClipboardPayload,
  options: WriteClipboardOptions = {}
) => {
  const { event, withRich = false } = options;

  if (event?.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData("text/plain", payload.plain);
    if (withRich && payload.rich) {
      event.clipboardData.setData(MIME_RICH_DATA, payload.rich);
    }
    return true;
  }

  try {
    if (withRich && payload.rich) {
      const clipboardMap: Record<string, Blob> = {
        "text/plain": new Blob([payload.plain], { type: "text/plain" }),
        [MIME_RICH_DATA]: new Blob([payload.rich], {
          type: MIME_RICH_DATA,
        }),
      };

      try {
        await navigator.clipboard.write([new ClipboardItem(clipboardMap)]);
      } catch {
        await navigator.clipboard.writeText(payload.plain);
      }
      return true;
    }

    await navigator.clipboard.writeText(payload.plain);
    return true;
  } catch {
    return false;
  }
};

const parseRichClipboardText = (rawText: string): RichTextCell[] | null => {
  if (!rawText) return null;
  try {
    const parsed = JSON.parse(rawText) as {
      cells?: RichTextCell[];
    };
    if (!Array.isArray(parsed.cells)) return null;
    return parsed.cells;
  } catch {
    return null;
  }
};

const readRichClipboardCells = async (
  eventDataTransfer?: DataTransfer
): Promise<RichTextCell[] | null> => {
  if (eventDataTransfer) {
    const richData = eventDataTransfer.getData(MIME_RICH_DATA);
    const parsed = parseRichClipboardText(richData);
    if (parsed) return parsed;
  }

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (!item.types.includes(MIME_RICH_DATA)) continue;
      const blob = await item.getType(MIME_RICH_DATA);
      const parsed = parseRichClipboardText(await blob.text());
      if (parsed) return parsed;
    }
  } catch {
    // Ignore rich clipboard read failures and fall back to plain text.
  }

  return null;
};

export const readClipboardPayload = async (eventDataTransfer?: DataTransfer) => {
  const richCells = await readRichClipboardCells(eventDataTransfer);
  if (richCells) return { richCells, plainText: null as string | null };

  if (eventDataTransfer) {
    const text = eventDataTransfer.getData("text/plain");
    if (text) return { richCells: null, plainText: text };
  }

  try {
    const text = await navigator.clipboard.readText();
    if (text) return { richCells: null, plainText: text };
  } catch {
    // Ignore clipboard permission failures.
  }

  return { richCells: null, plainText: null };
};
