import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  MIN_ZOOM,
  MAX_ZOOM,
  COLOR_PRIMARY_TEXT,
  DEFAULT_BRUSH_CHAR,
} from "../lib/constants";
import {
  undoManager,
  yMainGrid,
  yStructuredScene,
  transactWithHistory,
} from "../lib/yjs-setup";
import type { CanvasSession, CanvasState } from "./interfaces";
import type { CanvasMode, GridCell, StructuredNode, ToolType } from "../types";
import { normalizeBrushChar } from "../utils/characters";
import { createDrawingSlice, createTextSlice, createSelectionSlice } from "./slices";
import { normalizeScene, sceneToGridEntries } from "@/utils/structured";

export type { CanvasState };

const DEFAULT_SESSION_ID = "canvas-1";
const DEFAULT_SESSION_NAME = "Canvas 1";
const DEFAULT_MODE: CanvasMode = "freeform";
const STRUCTURED_ALLOWED_TOOLS: ToolType[] = ["select", "box", "line"];

const cloneStructuredNode = (node: StructuredNode): StructuredNode => {
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

const cloneScene = (scene: StructuredNode[]) => {
  return scene.map((node) => cloneStructuredNode(node));
};

const normalizeAndCloneScene = (scene: StructuredNode[]) => {
  return cloneScene(normalizeScene(scene));
};

const isToolAllowedForMode = (tool: ToolType, mode: CanvasMode) => {
  if (mode === "freeform") return true;
  return STRUCTURED_ALLOWED_TOOLS.includes(tool);
};

const getFallbackToolForMode = (mode: CanvasMode): ToolType => {
  return mode === "structured" ? "select" : "brush";
};

const rebuildGridFromYMap = () => {
  const nextGrid = new Map<string, GridCell>();
  yMainGrid.forEach((value, key) => {
    nextGrid.set(key, value as GridCell);
  });
  return nextGrid;
};

const rebuildSceneFromYMap = () => {
  const nextScene: StructuredNode[] = [];
  yStructuredScene.forEach((value) => {
    nextScene.push(cloneStructuredNode(value as StructuredNode));
  });
  return normalizeScene(nextScene);
};

const serializeGrid = (grid: Map<string, GridCell>) => {
  return Array.from(grid.entries());
};

const createMapFromEntries = (entries: [string, GridCell][]) => {
  return new Map<string, GridCell>(entries);
};

const applyFreeformSnapshotToYMaps = (entries: [string, GridCell][]) => {
  transactWithHistory(() => {
    yStructuredScene.clear();
    yMainGrid.clear();
    entries.forEach(([key, val]) => yMainGrid.set(key, val));
  }, false);
  undoManager.clear();
};

const applyStructuredSnapshotToYMaps = (scene: StructuredNode[]) => {
  const normalizedScene = normalizeAndCloneScene(scene);
  const gridEntries = sceneToGridEntries(normalizedScene);
  transactWithHistory(() => {
    yStructuredScene.clear();
    normalizedScene.forEach((node) => {
      yStructuredScene.set(node.id, node);
    });
    yMainGrid.clear();
    gridEntries.forEach(([key, val]) => yMainGrid.set(key, val));
  }, false);
  undoManager.clear();
};

type ActiveSnapshot = {
  mode: CanvasMode;
  scene: StructuredNode[];
  grid: [string, GridCell][];
};

const withActiveCanvasSnapshot = (
  sessions: CanvasSession[],
  activeCanvasId: string,
  snapshot: ActiveSnapshot
) => {
  return sessions.map((session) =>
    session.id === activeCanvasId
      ? {
          ...session,
          mode: snapshot.mode,
          scene: cloneScene(snapshot.scene),
          grid: snapshot.grid,
        }
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

const normalizeSessionMode = (mode: unknown): CanvasMode => {
  return mode === "structured" ? "structured" : "freeform";
};

const isPoint = (value: unknown): value is { x: number; y: number } => {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<{ x: unknown; y: unknown }>;
  return typeof point.x === "number" && typeof point.y === "number";
};

const toStructuredNode = (value: unknown): StructuredNode | null => {
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

      yStructuredScene.observe(() => {
        set({ structuredScene: rebuildSceneFromYMap() });
      });

      return {
        offset: { x: 0, y: 0 },
        zoom: 1,
        grid: new Map(),
        canvasMode: DEFAULT_MODE,
        structuredScene: [],
        canvasSessions: [
          {
            id: DEFAULT_SESSION_ID,
            name: DEFAULT_SESSION_NAME,
            mode: DEFAULT_MODE,
            scene: [],
            grid: [],
          },
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
        setTool: (tool) =>
          set((state) => {
            if (!isToolAllowedForMode(tool, state.canvasMode)) return state;
            return { tool, textCursor: null, hoveredGrid: null };
          }),
        setCanvasMode: (mode) => {
          const state = get();
          return state.canvasMode === mode;
        },
        applyStructuredScene: (scene, shouldSaveHistory = true) => {
          const normalizedScene = normalizeAndCloneScene(scene);
          const gridEntries = sceneToGridEntries(normalizedScene);
          const nextGrid = createMapFromEntries(gridEntries);

          transactWithHistory(() => {
            yStructuredScene.clear();
            normalizedScene.forEach((node) => {
              yStructuredScene.set(node.id, node);
            });
            yMainGrid.clear();
            gridEntries.forEach(([key, val]) => yMainGrid.set(key, val));
          }, shouldSaveHistory);

          set((state) => ({
            structuredScene: normalizedScene,
            grid: nextGrid,
            canvasSessions: withActiveCanvasSnapshot(
              state.canvasSessions,
              state.activeCanvasId,
              {
                mode: state.canvasMode,
                scene: normalizedScene,
                grid: gridEntries,
              }
            ),
          }));
        },
        getNextStructuredOrder: () => {
          const scene = get().structuredScene;
          if (scene.length === 0) return 1;
          return Math.max(...scene.map((node) => node.order)) + 1;
        },
        setBrushChar: (char) =>
          set((state) => ({
            brushChar: normalizeBrushChar(char, state.brushChar),
          })),
        setBrushColor: (color) => set({ brushColor: color }),
        setShowGrid: (show) => set({ showGrid: show }),
        setExportShowGrid: (show) => set({ exportShowGrid: show }),
        setHoveredGrid: (pos) => set({ hoveredGrid: pos }),
        createCanvasSession: (mode = "freeform") => {
          const state = get();
          const activeGridEntries =
            state.canvasMode === "structured"
              ? sceneToGridEntries(state.structuredScene)
              : serializeGrid(state.grid);
          const sessionsWithSnapshot = withActiveCanvasSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            {
              mode: state.canvasMode,
              scene: state.structuredScene,
              grid: activeGridEntries,
            }
          );
          const newSession: CanvasSession = {
            id: createSessionId(sessionsWithSnapshot),
            name: resolveNextSessionName(sessionsWithSnapshot),
            mode,
            scene: [],
            grid: [],
          };

          set({
            canvasSessions: [...sessionsWithSnapshot, newSession],
            activeCanvasId: newSession.id,
            canvasMode: mode,
            structuredScene: [],
            grid: new Map(),
            tool: getFallbackToolForMode(mode),
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });
          if (mode === "structured") {
            applyStructuredSnapshotToYMaps([]);
          } else {
            applyFreeformSnapshotToYMaps([]);
          }
        },
        switchCanvasSession: (canvasId) => {
          const state = get();
          if (canvasId === state.activeCanvasId) return;

          const activeGridEntries =
            state.canvasMode === "structured"
              ? sceneToGridEntries(state.structuredScene)
              : serializeGrid(state.grid);
          const sessionsWithSnapshot = withActiveCanvasSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            {
              mode: state.canvasMode,
              scene: state.structuredScene,
              grid: activeGridEntries,
            }
          );
          const target = sessionsWithSnapshot.find(
            (session) => session.id === canvasId
          );
          if (!target) return;

          const nextMode = normalizeSessionMode(target.mode);
          const nextScene =
            nextMode === "structured" ? normalizeAndCloneScene(target.scene) : [];
          const nextGridEntries =
            nextMode === "structured"
              ? sceneToGridEntries(nextScene)
              : target.grid;
          const nextTool = isToolAllowedForMode(state.tool, nextMode)
            ? state.tool
            : getFallbackToolForMode(nextMode);

          set({
            canvasSessions: sessionsWithSnapshot,
            activeCanvasId: canvasId,
            canvasMode: nextMode,
            structuredScene: nextScene,
            grid: createMapFromEntries(nextGridEntries),
            tool: nextTool,
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });

          if (nextMode === "structured") {
            applyStructuredSnapshotToYMaps(nextScene);
          } else {
            applyFreeformSnapshotToYMaps(nextGridEntries);
          }
        },
        removeCanvasSession: (canvasId) => {
          const state = get();
          if (state.canvasSessions.length <= 1) return;

          const activeGridEntries =
            state.canvasMode === "structured"
              ? sceneToGridEntries(state.structuredScene)
              : serializeGrid(state.grid);
          const sessionsWithSnapshot = withActiveCanvasSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            {
              mode: state.canvasMode,
              scene: state.structuredScene,
              grid: activeGridEntries,
            }
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
          const nextMode = normalizeSessionMode(nextSession.mode);
          const nextScene =
            nextMode === "structured"
              ? normalizeAndCloneScene(nextSession.scene)
              : [];
          const nextGridEntries =
            nextMode === "structured"
              ? sceneToGridEntries(nextScene)
              : nextSession.grid;
          const nextTool = isToolAllowedForMode(state.tool, nextMode)
            ? state.tool
            : getFallbackToolForMode(nextMode);

          set({
            canvasSessions: remaining,
            activeCanvasId: nextSession.id,
            canvasMode: nextMode,
            structuredScene: nextScene,
            grid: createMapFromEntries(nextGridEntries),
            tool: nextTool,
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });

          if (nextMode === "structured") {
            applyStructuredSnapshotToYMaps(nextScene);
          } else {
            applyFreeformSnapshotToYMaps(nextGridEntries);
          }
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
        canvasMode: state.canvasMode,
        structuredScene: cloneScene(state.structuredScene),
        brushChar: state.brushChar,
        brushColor: state.brushColor,
        showGrid: state.showGrid,
        exportShowGrid: state.exportShowGrid,
        canvasSessions: withActiveCanvasSnapshot(
          state.canvasSessions,
          state.activeCanvasId,
          {
            mode: state.canvasMode,
            scene: state.structuredScene,
            grid:
              state.canvasMode === "structured"
                ? sceneToGridEntries(state.structuredScene)
                : serializeGrid(state.grid),
          }
        ),
        activeCanvasId: state.activeCanvasId,
        grid:
          state.canvasMode === "structured"
            ? sceneToGridEntries(state.structuredScene)
            : Array.from(state.grid.entries()),
      }),
      onRehydrateStorage: () => {
        return (hydratedState, error) => {
          if (error || !hydratedState) return;
          const hState = hydratedState as CanvasState & {
            canvasSessions?: unknown;
            activeCanvasId?: unknown;
            canvasMode?: unknown;
            structuredScene?: unknown;
          };
          hState.brushChar = normalizeBrushChar(
            hState.brushChar,
            DEFAULT_BRUSH_CHAR
          );

          const legacyGridEntries = Array.isArray(hState.grid)
            ? (hState.grid as unknown as [string, GridCell][])
            : [];
          const legacyMode = normalizeSessionMode(hState.canvasMode);
          const legacyScene = Array.isArray(hState.structuredScene)
            ? (hState.structuredScene
                .map((item) => toStructuredNode(item))
                .filter((item): item is StructuredNode => !!item) as StructuredNode[])
            : [];

          const recoveredSessions: CanvasSession[] = Array.isArray(
            hState.canvasSessions
          )
            ? hState.canvasSessions
                .map((raw) => {
                  if (!raw || typeof raw !== "object") return null;
                  const maybe = raw as Partial<CanvasSession> & {
                    mode?: unknown;
                    scene?: unknown;
                  };
                  if (typeof maybe.id !== "string") return null;
                  const mode = normalizeSessionMode(maybe.mode);
                  const scene = Array.isArray(maybe.scene)
                    ? maybe.scene
                        .map((item) => toStructuredNode(item))
                        .filter(
                          (item): item is StructuredNode => !!item
                        )
                    : [];
                  return {
                    id: maybe.id,
                    name:
                      typeof maybe.name === "string" && maybe.name.trim()
                        ? maybe.name
                        : "Canvas",
                    mode,
                    scene: normalizeAndCloneScene(scene),
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
                    mode: legacyMode,
                    scene: normalizeAndCloneScene(legacyScene),
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
          const activeMode = normalizeSessionMode(activeSession.mode);
          const activeScene =
            activeMode === "structured"
              ? normalizeAndCloneScene(activeSession.scene)
              : [];
          const activeGridEntries =
            activeMode === "structured"
              ? sceneToGridEntries(activeScene)
              : activeSession.grid;
          const recoveredMap = createMapFromEntries(activeGridEntries);
          const currentTool = hState.tool || "select";

          hState.canvasSessions = sessions;
          hState.activeCanvasId = activeCanvasId;
          hState.canvasMode = activeMode;
          hState.structuredScene = activeScene;
          hState.grid = recoveredMap;
          hState.tool = isToolAllowedForMode(currentTool, activeMode)
            ? currentTool
            : getFallbackToolForMode(activeMode);

          if (activeMode === "structured") {
            applyStructuredSnapshotToYMaps(activeScene);
          } else {
            applyFreeformSnapshotToYMaps(activeGridEntries);
          }
        };
      },
    }
  )
);
