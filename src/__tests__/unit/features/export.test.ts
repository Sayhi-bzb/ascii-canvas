import { describe, expect, it } from "vitest";
import {
  buildAnimationExchangeDocument,
  exportAnimationToJSON,
} from "@/features/export/utils/export";
import { normalizeAnimationTimeline } from "@/store/helpers/animationHelpers";

describe("export utilities", () => {
  it("builds a stable animation exchange document", () => {
    const timeline = normalizeAnimationTimeline({
      fps: 12,
      loop: true,
      frames: [
        {
          id: "f1",
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
          cells: [{ x: 1, y: 2, char: "@", color: "#ff0000" }],
        },
      ],
    });
  });

  it("serializes the animation exchange document without editor-only fields", () => {
    const timeline = normalizeAnimationTimeline({
      frames: [{ id: "f1", grid: [] }],
      currentFrameId: "f1",
    });

    const json = exportAnimationToJSON({ width: 64, height: 64 }, timeline);
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe("ascii-animation");
    expect(parsed.playback).toEqual({
      fps: timeline.fps,
      loop: timeline.loop,
    });
    expect(parsed.frames[0]).not.toHaveProperty("id");
    expect(parsed.frames[0]).not.toHaveProperty("index");
  });
});
