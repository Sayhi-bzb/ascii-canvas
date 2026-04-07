import { describe, expect, it } from "vitest";
import {
  buildAnimationExchangeDocument,
  buildProtocolExportDocument,
  exportAnimationFrameToAnsi,
  exportAnimationToJSON,
  exportProtocolToJSON,
  exportToAnsi,
} from "@/features/export/utils/export";
import { normalizeAnimationTimeline } from "@/store/helpers/animationHelpers";
import type { GridMap, StructuredNode } from "@/types";

describe("export utilities", () => {
  it("builds a stable animation exchange document", () => {
    const timeline = normalizeAnimationTimeline({
      fps: 12,
      loop: true,
      frames: [
        {
          id: "f1",
          name: "Idle",
          grid: [["1,2", { char: "@", color: "#ff0000" }]],
        },
      ],
      currentFrameId: "f1",
    });

    const document = buildAnimationExchangeDocument(
      { width: 80, height: 25 },
      timeline
    );

    expect(document).toEqual({
      type: "ascii-animation",
      version: 1,
      size: { width: 80, height: 25 },
      playback: {
        fps: 12,
        loop: true,
      },
      frames: [
        {
          name: "Idle",
          cells: [{ x: 1, y: 2, char: "@", color: "#ff0000" }],
        },
      ],
    });
  });

  it("serializes the animation exchange document without editor-only fields", () => {
    const timeline = normalizeAnimationTimeline({
      frames: [{ id: "f1", name: "Frame 1", grid: [] }],
      currentFrameId: "f1",
    });

    const json = exportAnimationToJSON({ width: 64, height: 64 }, timeline);
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe("ascii-animation");
    expect(parsed.playback).toEqual({
      fps: timeline.fps,
      loop: timeline.loop,
    });
    expect(parsed.frames[0]).toHaveProperty("name", "Frame 1");
    expect(parsed.frames[0]).not.toHaveProperty("id");
    expect(parsed.frames[0]).not.toHaveProperty("index");
  });

  it("builds a freeform protocol export document", () => {
    const grid: GridMap = new Map([
      ["1,2", { char: "@", color: "#ff0000" }],
      ["0,0", { char: "#", color: "#00ff00" }],
    ]);

    const document = buildProtocolExportDocument({
      canvasMode: "freeform",
      grid,
      structuredScene: [],
      canvasBounds: null,
      animationTimeline: null,
    });

    expect(document).toEqual({
      type: "ascii-canvas-document",
      version: 1,
      mode: "freeform",
      cells: [
        { x: 0, y: 0, char: "#", color: "#00ff00" },
        { x: 1, y: 2, char: "@", color: "#ff0000" },
      ],
    });
    expect(document).not.toHaveProperty("selections");
    expect(document).not.toHaveProperty("scratchLayer");
  });

  it("serializes the animation protocol document", () => {
    const timeline = normalizeAnimationTimeline({
      fps: 8,
      loop: false,
      frames: [
        {
          id: "f1",
          name: "Frame 1",
          grid: [["2,3", { char: "*", color: "#ffaa00" }]],
        },
      ],
      currentFrameId: "f1",
    });

    const json = exportProtocolToJSON({
      canvasMode: "animation",
      grid: new Map(),
      structuredScene: [],
      canvasBounds: { width: 64, height: 64 },
      animationTimeline: timeline,
    });
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe("ascii-canvas-document");
    expect(parsed.version).toBe(1);
    expect(parsed.mode).toBe("animation");
    expect(parsed.playback).toEqual({ fps: 8, loop: false });
    expect(parsed.frames[0]).toHaveProperty("id", "f1");
    expect(parsed.frames[0]).toHaveProperty("name", "Frame 1");
    expect(parsed.frames[0].cells[0]).toEqual({
      x: 2,
      y: 3,
      char: "*",
      color: "#ffaa00",
    });
  });

  it("serializes the structured protocol document", () => {
    const scene: StructuredNode[] = [
      {
        id: "box-1",
        type: "box",
        order: 1,
        start: { x: 0, y: 0 },
        end: { x: 4, y: 4 },
        name: "Box",
        style: { color: "#111111" },
      },
      {
        id: "text-1",
        type: "text",
        order: 2,
        position: { x: 1, y: 1 },
        text: "Hi",
        style: { color: "#ffffff" },
      },
    ];

    const json = exportProtocolToJSON({
      canvasMode: "structured",
      grid: new Map(),
      structuredScene: scene,
      canvasBounds: null,
      animationTimeline: null,
    });
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe("ascii-canvas-document");
    expect(parsed.version).toBe(1);
    expect(parsed.mode).toBe("structured");
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.nodes[0]).toMatchObject({
      id: "box-1",
      type: "box",
      name: "Box",
      style: { color: "#111111" },
    });
    expect(parsed.nodes[1]).toMatchObject({
      id: "text-1",
      type: "text",
      text: "Hi",
      style: { color: "#ffffff" },
    });
  });

  it("serializes protocol JSON in monochrome when color export is disabled", () => {
    const json = exportProtocolToJSON({
      canvasMode: "freeform",
      grid: new Map([["1,2", { char: "@", color: "#ff0000" }]]),
      structuredScene: [],
      canvasBounds: null,
      animationTimeline: null,
      includeColor: false,
    });
    const parsed = JSON.parse(json);

    expect(parsed.cells).toEqual([
      { x: 1, y: 2, char: "@", color: "#000000" },
    ]);
  });

  it("exports ANSI truecolor runs and merges adjacent cells with the same color", () => {
    const grid: GridMap = new Map([
      ["0,0", { char: "A", color: "#ff0000" }],
      ["1,0", { char: "B", color: "#ff0000" }],
      ["2,0", { char: "C", color: "#00ff00" }],
    ]);

    expect(exportToAnsi(grid)).toBe(
      "\u001b[38;2;255;0;0mAB\u001b[38;2;0;255;0mC\u001b[0m"
    );
  });

  it("supports short hex ANSI colors and falls back to default text on invalid colors", () => {
    const grid: GridMap = new Map([
      ["0,0", { char: "A", color: "#0f0" }],
      ["1,0", { char: "B", color: "oklch(0.7 0.2 120)" }],
    ]);

    expect(exportToAnsi(grid)).toBe("\u001b[38;2;0;255;0mA\u001b[0mB\u001b[0m");
  });

  it("exports ANSI without escape colors when color export is disabled", () => {
    const grid: GridMap = new Map([
      ["0,0", { char: "A", color: "#ff0000" }],
      ["1,0", { char: "B", color: "#00ff00" }],
    ]);

    expect(exportToAnsi(grid, { includeColor: false })).toBe("AB");
  });

  it("preserves wide-character stepping in ANSI export", () => {
    const grid: GridMap = new Map([
      ["0,0", { char: "你", color: "#ffffff" }],
      ["2,0", { char: "A", color: "#ffffff" }],
    ]);

    expect(exportToAnsi(grid)).toBe("\u001b[38;2;255;255;255m你A\u001b[0m");
  });

  it("exports animation frames as fixed-size ANSI output", () => {
    const ansi = exportAnimationFrameToAnsi(
      { width: 3, height: 2 },
      [["1,0", { char: "@", color: "#ff0000" }]]
    );

    expect(ansi).toBe(
      " \u001b[38;2;255;0;0m@\u001b[0m \u001b[0m\n   "
    );
  });
});
