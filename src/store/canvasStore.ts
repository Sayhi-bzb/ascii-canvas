import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  MIN_ZOOM,
  MAX_ZOOM,
  COLOR_PRIMARY_TEXT,
  DEFAULT_BRUSH_CHAR,
} from "../lib/constants";
import { undoManager, yMainGrid, transactWithHistory } from "../lib/yjs-setup";
import type { CanvasSession, CanvasState } from "./interfaces";
import type { GridCell } from "../types";
import { normalizeBrushChar } from "../utils/characters";
import {
  createDrawingSlice,
  createTextSlice,
  createSelectionSlice,
} from "./slices";

export type { CanvasState };

const DEFAULT_SESSION_ID = "canvas-1";
const DEFAULT_SESSION_NAME = "Canvas 1";

const rebuildGridFromYMap = () => {
  const nextGrid = new Map<string, GridCell>();
  yMainGrid.forEach((value, key) => {
    nextGrid.set(key, value as GridCell);
  });
  return nextGrid;
};

const serializeGrid = (grid: Map<string, GridCell>) => {
  return Array.from(grid.entries());
};

const createMapFromEntries = (entries: [string, GridCell][]) => {
  return new Map<string, GridCell>(entries);
};

const applyGridToYMap = (entries: [string, GridCell][]) => {
  transactWithHistory(() => {
    yMainGrid.clear();
    entries.forEach(([key, val]) => yMainGrid.set(key, val));
  }, false);
  undoManager.clear();
};

const withActiveGridSnapshot = (
  sessions: CanvasSession[],
  activeCanvasId: string,
  activeGridEntries: [string, GridCell][]
) => {
  return sessions.map((session) =>
    session.id === activeCanvasId
      ? { ...session, grid: activeGridEntries }
      : session
  );
};

const resolveNextSessionName = (sessions: CanvasSession[]) => {
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

const createSessionId = (sessions: CanvasSession[]) => {
  const existing = new Set(sessions.map((session) => session.id));
  while (true) {
    const next = `canvas-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    if (!existing.has(next)) return next;
  }
};

const isSameCell = (a?: GridCell, b?: GridCell) => {
  if (!a || !b) return false;
  return a.char === b.char && a.color === b.color;
};

const patchGridByChangedKeys = (
  currentGrid: Map<string, GridCell>,
  keysChanged: Set<string>
) => {
  let nextGrid: Map<string, GridCell> | null = null;

  keysChanged.forEach((key) => {
    const nextCell = yMainGrid.get(key) as GridCell | undefined;
    const prevCell = currentGrid.get(key);

    if (!nextCell) {
      if (!prevCell) return;
      if (!nextGrid) nextGrid = new Map(currentGrid);
      nextGrid.delete(key);
      return;
    }

    if (isSameCell(prevCell, nextCell)) return;
    if (!nextGrid) nextGrid = new Map(currentGrid);
    nextGrid.set(key, nextCell);
  });

  return nextGrid;
};

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get, ...a) => {
      yMainGrid.observe((event) => {
        const currentGrid = get().grid;
        const patchedGrid = patchGridByChangedKeys(currentGrid, event.keysChanged);
        if (patchedGrid) {
          set({ grid: patchedGrid });
          return;
        }

        if (event.keysChanged.size === 0 && yMainGrid.size !== currentGrid.size) {
          set({ grid: rebuildGridFromYMap() });
        }
      });

      return {
        offset: { x: 0, y: 0 },
        zoom: 1,
        grid: new Map(),
        canvasSessions: [
          { id: DEFAULT_SESSION_ID, name: DEFAULT_SESSION_NAME, grid: [] },
        ],
        activeCanvasId: DEFAULT_SESSION_ID,
        tool: "select",
        brushChar: DEFAULT_BRUSH_CHAR,
        brushColor: COLOR_PRIMARY_TEXT,
        showGrid: true,
        exportShowGrid: false,
        hoveredGrid: null,

        setOffset: (updater) =>
          set((state) => ({ offset: updater(state.offset) })),
        setZoom: (updater) =>
          set((state) => ({
            zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
          })),
        setTool: (tool) => set({ tool, textCursor: null, hoveredGrid: null }),
        setBrushChar: (char) =>
          set((state) => ({
            brushChar: normalizeBrushChar(char, state.brushChar),
          })),
        setBrushColor: (color) => set({ brushColor: color }),
        setShowGrid: (show) => set({ showGrid: show }),
        setExportShowGrid: (show) => set({ exportShowGrid: show }),
        setHoveredGrid: (pos) => set({ hoveredGrid: pos }),
        createCanvasSession: () => {
          const state = get();
          const activeGridEntries = serializeGrid(state.grid);
          const sessionsWithSnapshot = withActiveGridSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            activeGridEntries
          );
          const newSession: CanvasSession = {
            id: createSessionId(sessionsWithSnapshot),
            name: resolveNextSessionName(sessionsWithSnapshot),
            grid: [],
          };

          set({
            canvasSessions: [...sessionsWithSnapshot, newSession],
            activeCanvasId: newSession.id,
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });
          applyGridToYMap([]);
        },
        switchCanvasSession: (canvasId) => {
          const state = get();
          if (canvasId === state.activeCanvasId) return;

          const activeGridEntries = serializeGrid(state.grid);
          const sessionsWithSnapshot = withActiveGridSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            activeGridEntries
          );
          const target = sessionsWithSnapshot.find(
            (session) => session.id === canvasId
          );
          if (!target) return;

          set({
            canvasSessions: sessionsWithSnapshot,
            activeCanvasId: canvasId,
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });
          applyGridToYMap(target.grid);
        },
        removeCanvasSession: (canvasId) => {
          const state = get();
          if (state.canvasSessions.length <= 1) return;

          const activeGridEntries = serializeGrid(state.grid);
          const sessionsWithSnapshot = withActiveGridSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            activeGridEntries
          );
          const removedIndex = sessionsWithSnapshot.findIndex(
            (session) => session.id === canvasId
          );
          if (removedIndex === -1) return;

          const remaining = sessionsWithSnapshot.filter(
            (session) => session.id !== canvasId
          );
          if (remaining.length === 0) return;

          if (canvasId !== state.activeCanvasId) {
            set({ canvasSessions: remaining });
            return;
          }

          const nextIndex = Math.min(removedIndex, remaining.length - 1);
          const nextSession = remaining[nextIndex];
          set({
            canvasSessions: remaining,
            activeCanvasId: nextSession.id,
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });
          applyGridToYMap(nextSession.grid);
        },
        renameCanvasSession: (canvasId, nextName) => {
          const name = nextName.trim();
          if (!name) return;
          set((state) => ({
            canvasSessions: state.canvasSessions.map((session) =>
              session.id === canvasId ? { ...session, name } : session
            ),
          }));
        },

        ...createDrawingSlice(set, get, ...a),
        ...createTextSlice(set, get, ...a),
        ...createSelectionSlice(set, get, ...a),
      };
    },
    {
      name: "ascii-canvas-persistence",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        offset: state.offset,
        zoom: state.zoom,
        brushChar: state.brushChar,
        brushColor: state.brushColor,
        showGrid: state.showGrid,
        exportShowGrid: state.exportShowGrid,
        canvasSessions: withActiveGridSnapshot(
          state.canvasSessions,
          state.activeCanvasId,
          serializeGrid(state.grid)
        ),
        activeCanvasId: state.activeCanvasId,
        grid: Array.from(state.grid.entries()),
      }),
      onRehydrateStorage: () => {
        return (hydratedState, error) => {
          if (error || !hydratedState) return;
          const hState = hydratedState as CanvasState & {
            canvasSessions?: unknown;
            activeCanvasId?: unknown;
          };
          hState.brushChar = normalizeBrushChar(
            hState.brushChar,
            DEFAULT_BRUSH_CHAR
          );

          const legacyGridEntries = Array.isArray(hState.grid)
            ? (hState.grid as unknown as [string, GridCell][])
            : [];

          const recoveredSessions: CanvasSession[] = Array.isArray(
            hState.canvasSessions
          )
            ? hState.canvasSessions
                .map((raw) => {
                  if (!raw || typeof raw !== "object") return null;
                  const maybe = raw as Partial<CanvasSession>;
                  if (typeof maybe.id !== "string") return null;
                  return {
                    id: maybe.id,
                    name:
                      typeof maybe.name === "string" && maybe.name.trim()
                        ? maybe.name
                        : "Canvas",
                    grid: Array.isArray(maybe.grid)
                      ? (maybe.grid as [string, GridCell][])
                      : [],
                  } satisfies CanvasSession;
                })
                .filter((session): session is CanvasSession => !!session)
            : [];

          const sessions =
            recoveredSessions.length > 0
              ? recoveredSessions
              : [
                  {
                    id: DEFAULT_SESSION_ID,
                    name: DEFAULT_SESSION_NAME,
                    grid: legacyGridEntries,
                  },
                ];

          const activeCanvasId =
            typeof hState.activeCanvasId === "string" &&
            sessions.some((session) => session.id === hState.activeCanvasId)
              ? hState.activeCanvasId
              : sessions[0].id;

          const activeSession =
            sessions.find((session) => session.id === activeCanvasId) ??
            sessions[0];
          const recoveredMap = createMapFromEntries(activeSession.grid);

          hState.canvasSessions = sessions;
          hState.activeCanvasId = activeCanvasId;
          hState.grid = recoveredMap;
          applyGridToYMap(activeSession.grid);
        };
      },
    }
  )
);
