import {
  EXPORT_PADDING,
  CELL_WIDTH,
  CELL_HEIGHT,
  FONT_SIZE,
  BACKGROUND_COLOR,
  GRID_COLOR,
} from "@/lib/constants";
import type { GridMap, SelectionArea, StructuredNode } from "@/types";
import { GridManager } from "@/utils/grid";
import { getSelectionsBoundingBox } from "@/utils/selection";
import { clipboard } from "@/services/effects";
import { buildStructuredTree, getStructuredNodeBounds } from "@/utils/structured";

const generateStringFromBounds = (
  grid: GridMap,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): string => {
  const lines: string[] = [];

  for (let y = minY; y <= maxY; y++) {
    let line = "";
    for (let x = minX; x <= maxX; x++) {
      const cell = grid.get(GridManager.toKey(x, y));
      if (cell) {
        line += cell.char;
        if (GridManager.getCharWidth(cell.char) === 2) x++;
      } else {
        line += " ";
      }
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
};

export const exportToString = (grid: GridMap) => {
  if (grid.size === 0) return "";
  const { minX, maxX, minY, maxY } = GridManager.getGridBounds(grid);

  return generateStringFromBounds(
    grid,
    minX - EXPORT_PADDING,
    maxX + EXPORT_PADDING,
    minY - EXPORT_PADDING,
    maxY + EXPORT_PADDING
  );
};

export const exportSelectionToString = (
  grid: GridMap,
  selections: SelectionArea[]
) => {
  if (selections.length === 0) return "";
  const { minX, maxX, minY, maxY } = getSelectionsBoundingBox(selections);
  return generateStringFromBounds(grid, minX, maxX, minY, maxY);
};

export const exportSelectionToJSON = (
  grid: GridMap,
  selections: SelectionArea[]
) => {
  if (selections.length === 0) return null;
  const { minX, minY, maxX, maxY } = getSelectionsBoundingBox(selections);

  const cells: { x: number; y: number; char: string; color: string }[] = [];

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cell = grid.get(GridManager.toKey(x, y));
      if (cell) {
        cells.push({
          x: x - minX,
          y: y - minY,
          char: cell.char,
          color: cell.color,
        });
      }
    }
  }

  return JSON.stringify({
    type: "ascii-metropolis-zone",
    version: 1,
    cells,
  });
};

export const copySelectionToPngClipboard = async (
  grid: GridMap,
  selections: SelectionArea[],
  showGrid: boolean = true
) => {
  if (selections.length === 0) return;

  const { minX, maxX, minY, maxY } = getSelectionsBoundingBox(selections);
  const padding = 1;

  const cols = maxX - minX + 1 + padding * 2;
  const rows = maxY - minY + 1 + padding * 2;

  const width = cols * CELL_WIDTH;
  const height = rows * CELL_HEIGHT;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  if (showGrid) {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    for (let i = 0; i <= cols; i++) {
      const x = i * CELL_WIDTH;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    for (let i = 0; i <= rows; i++) {
      const y = i * CELL_HEIGHT;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  ctx.font = `${FONT_SIZE}px 'Maple Mono NF CN', monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  for (let y = minY - padding; y <= maxY + padding; y++) {
    for (let x = minX - padding; x <= maxX + padding; x++) {
      const cell = grid.get(GridManager.toKey(x, y));
      if (!cell) continue;

      const drawX = (x - (minX - padding)) * CELL_WIDTH;
      const drawY = (y - (minY - padding)) * CELL_HEIGHT;
      const wide = GridManager.isWideChar(cell.char);

      ctx.fillStyle = cell.color;
      ctx.fillText(
        cell.char,
        drawX + (wide ? CELL_WIDTH : CELL_WIDTH / 2),
        drawY + CELL_HEIGHT / 2
      );
    }
  }

  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 1.0)
    );

    if (blob) {
      const copied = await clipboard.writeItems([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      if (!copied) {
        throw new Error("Unable to write PNG to clipboard");
      }
    }
  } catch (err) {
    console.error("Failed to copy image to clipboard", err);
    throw err;
  }
};

export const exportToPNG = (grid: GridMap, showGrid: boolean = false) => {
  if (grid.size === 0) return false;

  const { minX, maxX, minY, maxY } = GridManager.getGridBounds(grid);
  const padding = 2;
  const width = (maxX - minX + 1 + padding * 2) * CELL_WIDTH;
  const height = (maxY - minY + 1 + padding * 2) * CELL_HEIGHT;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  if (showGrid) {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    const gridWidth = maxX - minX + 1 + padding * 2;
    const gridHeight = maxY - minY + 1 + padding * 2;
    for (let x = 0; x <= gridWidth; x++) {
      ctx.moveTo(x * CELL_WIDTH, 0);
      ctx.lineTo(x * CELL_WIDTH, height);
    }
    for (let y = 0; y <= gridHeight; y++) {
      ctx.moveTo(0, y * CELL_HEIGHT);
      ctx.lineTo(width, y * CELL_HEIGHT);
    }
    ctx.stroke();
  }

  ctx.font = `${FONT_SIZE}px 'Maple Mono NF CN', monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  GridManager.iterate(grid, (cell, x, y) => {
    const drawX = (x - minX + padding) * CELL_WIDTH;
    const drawY = (y - minY + padding) * CELL_HEIGHT;
    const wide = GridManager.isWideChar(cell.char);

    ctx.fillStyle = cell.color;
    ctx.fillText(
      cell.char,
      drawX + (wide ? CELL_WIDTH : CELL_WIDTH / 2),
      drawY + CELL_HEIGHT / 2
    );
  });

  const link = document.createElement("a");
  link.download = `ascii-city-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  return true;
};

const escapeAttr = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};

const formatBounds = (node: StructuredNode) => {
  const bounds = getStructuredNodeBounds(node);
  return `${bounds.x},${bounds.y},${bounds.width},${bounds.height}`;
};

const emitTag = (
  lines: string[],
  tag: string,
  attrs: Array<[string, string]>,
  indent: string,
  selfClose: boolean
) => {
  lines.push(`${indent}<${tag}`);
  attrs.forEach(([name, value]) => {
    lines.push(`${indent}  ${name}="${value}"`);
  });
  lines.push(`${indent}${selfClose ? "/>" : ">"}`);
};

export const exportStructuredF12Text = (scene: StructuredNode[]) => {
  const { roots, childrenById } = buildStructuredTree(scene);
  const lines: string[] = [];

  const emitNode = (node: StructuredNode, depth: number) => {
    const indent = "  ".repeat(depth);
    const commonAttrs: Array<[string, string]> = [
      ["id", escapeAttr(node.id)],
      ["bounds", formatBounds(node)],
      ["style", `color:${escapeAttr(node.style.color)}`],
    ];

    if (node.type === "box") {
      const boxAttrs =
        node.name && node.name.trim()
          ? [...commonAttrs, ["name", escapeAttr(node.name)] as [string, string]]
          : commonAttrs;
      emitTag(lines, "box", boxAttrs, indent, false);
      const children = childrenById.get(node.id) || [];
      children.forEach((child) => emitNode(child, depth + 1));
      lines.push(`${indent}</box>`);
      return;
    }

    if (node.type === "line") {
      emitTag(
        lines,
        "line",
        [
          ...commonAttrs,
          ["from", `${node.start.x},${node.start.y}`],
          ["to", `${node.end.x},${node.end.y}`],
          ["axis", node.axis],
        ],
        indent,
        true
      );
      return;
    }

    emitTag(
      lines,
      "text",
      [
        ...commonAttrs,
        ["at", `${node.position.x},${node.position.y}`],
        ["text", escapeAttr(node.text)],
      ],
      indent,
      true
    );
  };

  emitTag(
    lines,
    "canvas",
    [
      ["mode", "structured"],
      ["nodes", String(scene.length)],
    ],
    "",
    false
  );
  roots.forEach((node) => emitNode(node, 1));
  lines.push("</canvas>");
  return lines.join("\n");
};
