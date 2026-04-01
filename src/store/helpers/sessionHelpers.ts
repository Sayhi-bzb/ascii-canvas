import type { CanvasSession } from "../interfaces";
import type { CanvasMode } from "../../types";
import type { StructuredNode } from "../../types";

export const resolveNextSessionName = (sessions: CanvasSession[]) => {
  let maxIndex = 0;
  sessions.forEach((session) => {
    const match = session.name.match(/^Canvas\s+(\d+)$/i);
    if (!match) return;
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      maxIndex = Math.max(maxIndex, value);
    }
  });
  return `Canvas ${maxIndex + 1}`;
};

export const createSessionId = (sessions: CanvasSession[]) => {
  const existing = new Set(sessions.map((session) => session.id));
  while (true) {
    const next = `canvas-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    if (!existing.has(next)) return next;
  }
};

type ActiveSnapshot = {
  mode: CanvasMode;
  scene: StructuredNode[];
  grid: [string, { char: string; color: string }][];
};

export const withActiveCanvasSnapshot = (
  sessions: CanvasSession[],
  activeCanvasId: string,
  snapshot: ActiveSnapshot
) => {
  return sessions.map((session) =>
    session.id === activeCanvasId
      ? {
          ...session,
          mode: snapshot.mode,
          scene: snapshot.scene,
          grid: snapshot.grid,
        }
      : session
  );
};

export const normalizeSessionMode = (mode: unknown): CanvasMode => {
  return mode === "structured" ? "structured" : "freeform";
};
