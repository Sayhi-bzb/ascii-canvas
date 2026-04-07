import type { CanvasSession } from "@/store/interfaces";
import {
  getAnimationFrameEntries,
  normalizeAnimationCanvasSize,
  normalizeAnimationTimeline,
} from "@/store/helpers/animationHelpers";
import type { GridCell, StructuredNode } from "@/types";
import { GridManager } from "@/utils/grid";
import { sceneToGridEntries } from "@/utils/structured";
import type {
  AsciiCanvasAnimationDocumentV1,
  AsciiCanvasDocumentV1,
  AsciiCanvasFreeformDocumentV1,
  AsciiCanvasProtocolCellV1,
  AsciiCanvasProtocolNodeV1,
  AsciiCanvasStructuredDocumentV1,
} from "./types";
import { isAsciiCanvasDocument } from "./validation";

export interface ProtocolImportSnapshot {
  mode: AsciiCanvasDocumentV1["mode"];
  scene: StructuredNode[];
  grid: [string, GridCell][];
  size?: CanvasSession["size"];
  timeline?: CanvasSession["timeline"];
}

export interface ProtocolSessionOptions {
  id?: string;
  name?: string;
}

const toGridEntries = (cells: AsciiCanvasProtocolCellV1[]) => {
  const entries = new Map<string, GridCell>();

  cells.forEach((cell) => {
    entries.set(GridManager.toKey(cell.x, cell.y), {
      char: cell.char,
      color: cell.color,
    });
  });

  return Array.from(entries.entries());
};

const cloneStructuredProtocolNode = (
  node: AsciiCanvasProtocolNodeV1
): StructuredNode => {
  switch (node.type) {
    case "box":
      return {
        type: "box",
        id: node.id,
        order: node.order,
        start: { ...node.start },
        end: { ...node.end },
        style: { color: node.style.color },
        ...(node.name ? { name: node.name } : {}),
      };
    case "line":
      return {
        type: "line",
        id: node.id,
        order: node.order,
        start: { ...node.start },
        end: { ...node.end },
        axis: node.axis,
        style: { color: node.style.color },
      };
    case "text":
      return {
        type: "text",
        id: node.id,
        order: node.order,
        position: { ...node.position },
        text: node.text,
        style: { color: node.style.color },
      };
  }
};

const getSessionName = (
  document: AsciiCanvasDocumentV1,
  name?: string
) => {
  if (name?.trim()) return name.trim();
  switch (document.mode) {
    case "animation":
      return "Imported Animation";
    case "structured":
      return "Imported Structured";
    case "freeform":
      return "Imported Canvas";
  }
};

const getSessionId = (document: AsciiCanvasDocumentV1, id?: string) => {
  if (id?.trim()) return id.trim();
  return `imported-${document.mode}`;
};

const importFreeformDocument = (
  document: AsciiCanvasFreeformDocumentV1
): ProtocolImportSnapshot => {
  return {
    mode: "freeform",
    scene: [],
    grid: toGridEntries(document.cells),
  };
};

const importAnimationDocument = (
  document: AsciiCanvasAnimationDocumentV1
): ProtocolImportSnapshot => {
  const size = normalizeAnimationCanvasSize(document.size);
  const timeline = normalizeAnimationTimeline({
    currentFrameId: document.frames[0]?.id,
    fps: document.playback.fps,
    loop: document.playback.loop,
    frames: document.frames.map((frame) => ({
      id: frame.id,
      name: frame.name,
      grid: toGridEntries(frame.cells),
    })),
  });

  return {
    mode: "animation",
    scene: [],
    size,
    timeline,
    grid: getAnimationFrameEntries(timeline, timeline.currentFrameId),
  };
};

const importStructuredDocument = (
  document: AsciiCanvasStructuredDocumentV1
): ProtocolImportSnapshot => {
  const scene = document.nodes.map(cloneStructuredProtocolNode);
  return {
    mode: "structured",
    scene,
    grid: sceneToGridEntries(scene),
  };
};

export const parseProtocolDocument = (
  raw: string | unknown
): AsciiCanvasDocumentV1 => {
  const parsed =
    typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;

  if (!isAsciiCanvasDocument(parsed)) {
    throw new Error("Invalid ascii-canvas-document payload.");
  }

  return parsed;
};

export const protocolDocumentToSnapshot = (
  document: AsciiCanvasDocumentV1
): ProtocolImportSnapshot => {
  switch (document.mode) {
    case "freeform":
      return importFreeformDocument(document);
    case "animation":
      return importAnimationDocument(document);
    case "structured":
      return importStructuredDocument(document);
  }
};

export const protocolDocumentToSession = (
  document: AsciiCanvasDocumentV1,
  options: ProtocolSessionOptions = {}
): CanvasSession => {
  const snapshot = protocolDocumentToSnapshot(document);
  const baseSession = {
    id: getSessionId(document, options.id),
    name: getSessionName(document, options.name),
    mode: snapshot.mode,
    scene: snapshot.scene,
    grid: snapshot.grid,
  } satisfies Omit<CanvasSession, "size" | "timeline">;

  if (snapshot.mode === "animation") {
    return {
      ...baseSession,
      size: snapshot.size,
      timeline: snapshot.timeline,
    };
  }

  return baseSession;
};
