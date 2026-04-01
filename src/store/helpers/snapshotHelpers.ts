import type { GridCell, StructuredNode } from "../../types";
import { normalizeScene } from "@/utils/structured";

export const cloneStructuredNode = (node: StructuredNode): StructuredNode => {
  if (node.type === "text") {
    return {
      ...node,
      position: { ...node.position },
      style: { ...node.style },
    };
  }
  return {
    ...node,
    start: { ...node.start },
    end: { ...node.end },
    style: { ...node.style },
  };
};

export const cloneScene = (scene: StructuredNode[]) => {
  return scene.map((node) => cloneStructuredNode(node));
};

export const normalizeAndCloneScene = (scene: StructuredNode[]) => {
  return cloneScene(normalizeScene(scene));
};

export const serializeGrid = (grid: Map<string, GridCell>) => {
  return Array.from(grid.entries());
};

export const createMapFromEntries = (entries: [string, GridCell][]) => {
  return new Map<string, GridCell>(entries);
};

export const isSameCell = (a?: GridCell, b?: GridCell) => {
  if (!a || !b) return false;
  return a.char === b.char && a.color === b.color;
};

export const isPoint = (value: unknown): value is { x: number; y: number } => {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<{ x: unknown; y: unknown }>;
  return typeof point.x === "number" && typeof point.y === "number";
};

export const toStructuredNode = (value: unknown): StructuredNode | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<StructuredNode>;
  if (typeof raw.id !== "string") return null;
  if (typeof raw.order !== "number") return null;
  if (
    !raw.style ||
    typeof raw.style !== "object" ||
    typeof (raw.style as { color?: unknown }).color !== "string"
  ) {
    return null;
  }

  if (raw.type === "box" || raw.type === "line") {
    if (!isPoint(raw.start) || !isPoint(raw.end)) return null;
    if (raw.type === "box" && raw.name !== undefined && typeof raw.name !== "string") {
      return null;
    }
    if (
      raw.type === "line" &&
      raw.axis !== "horizontal" &&
      raw.axis !== "vertical"
    ) {
      return null;
    }
    return cloneStructuredNode(raw as StructuredNode);
  }

  if (raw.type === "text") {
    if (!isPoint(raw.position) || typeof raw.text !== "string") return null;
    return cloneStructuredNode(raw as StructuredNode);
  }

  return null;
};
