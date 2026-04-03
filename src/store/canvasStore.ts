import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  MIN_ZOOM,
  MAX_ZOOM,
  COLOR_PRIMARY_TEXT,
  DEFAULT_BRUSH_CHAR,
} from "../lib/constants";
import {
  yMainGrid,
  yStructuredScene,
  transactWithHistory,
} from "../lib/yjs-setup";
import type { CanvasSession, CanvasState } from "./interfaces";
import type {
  AnimationCanvasSize,
  AnimationTimeline,
  CanvasMode,
  GridCell,
  StructuredNode,
  ToolType,
} from "../types";
import { normalizeBrushChar } from "../utils/characters";
import { createDrawingSlice, createTextSlice, createSelectionSlice } from "./slices";
import { sceneToGridEntries } from "@/utils/structured";
import {
  rebuildGridFromYMap,
  rebuildSceneFromYMap,
  patchGridByChangedKeys,
  applyFreeformSnapshotToYMaps,
  applyStructuredSnapshotToYMaps,
} from "./helpers/gridHelpers";
import {
  resolveNextSessionName,
  createSessionId,
  withActiveCanvasSnapshot,
  normalizeSessionMode,
} from "./helpers/sessionHelpers";
import {
  cloneScene,
  normalizeAndCloneScene,
  serializeGrid,
  createMapFromEntries,
  toStructuredNode,
} from "./helpers/snapshotHelpers";
import {
  cloneAnimationTimeline,
  createEmptyAnimationFrame,
  DEFAULT_ANIMATION_SIZE,
  getAnimationFrameEntries,
  getAnimationFrameIndex,
  normalizeAnimationCanvasSize,
  normalizeAnimationTimeline,
  updateAnimationFrameEntries,
} from "./helpers/animationHelpers";

export type { CanvasState };

const DEFAULT_SESSION_ID = "canvas-1";
const DEFAULT_SESSION_NAME = "Canvas 1";
const DEFAULT_MODE: CanvasMode = "freeform";
const STRUCTURED_ALLOWED_TOOLS: ToolType[] = ["select", "box", "line"];

const isToolAllowedForMode = (tool: ToolType, mode: CanvasMode) => {
  if (mode === "structured") return STRUCTURED_ALLOWED_TOOLS.includes(tool);
  return true;
};

const getFallbackToolForMode = (mode: CanvasMode): ToolType => {
  return mode === "structured" ? "select" : "brush";
};

const createDefaultAnimationTimeline = (): AnimationTimeline => {
  const initialFrame = createEmptyAnimationFrame();
  return normalizeAnimationTimeline({
    frames: [initialFrame],
    currentFrameId: initialFrame.id,
  });
};

const buildSessionSnapshot = (state: CanvasState) => {
  if (state.canvasMode === "animation") {
    const size = state.canvasBounds ?? DEFAULT_ANIMATION_SIZE;
    const activeGridEntries = serializeGrid(state.grid);
    const timeline = state.animationTimeline
      ? updateAnimationFrameEntries(
          state.animationTimeline,
          state.animationTimeline.currentFrameId,
          activeGridEntries
        )
      : normalizeAnimationTimeline(undefined, activeGridEntries);
    return {
      mode: "animation" as const,
      scene: [] as StructuredNode[],
      grid: getAnimationFrameEntries(timeline, timeline.currentFrameId),
      size,
      timeline,
    };
  }

  if (state.canvasMode === "structured") {
    return {
      mode: "structured" as const,
      scene: state.structuredScene,
      grid: sceneToGridEntries(state.structuredScene),
    };
  }

  return {
    mode: "freeform" as const,
    scene: [] as StructuredNode[],
    grid: serializeGrid(state.grid),
  };
};

const resolveSessionRuntime = (session: CanvasSession, currentTool: ToolType) => {
  const nextMode = normalizeSessionMode(session.mode);

  if (nextMode === "animation") {
    const nextBounds = normalizeAnimationCanvasSize(session.size);
    const nextTimeline = normalizeAnimationTimeline(session.timeline, session.grid);
    const nextGridEntries = getAnimationFrameEntries(
      nextTimeline,
      nextTimeline.currentFrameId
    );
    return {
      nextMode,
      nextScene: [] as StructuredNode[],
      nextGridEntries,
      nextTool: isToolAllowedForMode(currentTool, nextMode)
        ? currentTool
        : getFallbackToolForMode(nextMode),
      nextBounds,
      nextTimeline,
    };
  }

  const nextScene =
    nextMode === "structured" ? normalizeAndCloneScene(session.scene) : [];
  const nextGridEntries =
    nextMode === "structured" ? sceneToGridEntries(nextScene) : session.grid;

  return {
    nextMode,
    nextScene,
    nextGridEntries,
    nextTool: isToolAllowedForMode(currentTool, nextMode)
      ? currentTool
      : getFallbackToolForMode(nextMode),
    nextBounds: null as AnimationCanvasSize | null,
    nextTimeline: null as AnimationTimeline | null,
  };
};

const createAnimationSession = (
  sessions: CanvasSession[],
  size?: AnimationCanvasSize
): CanvasSession => {
  const timeline = createDefaultAnimationTimeline();
  const normalizedSize = normalizeAnimationCanvasSize(size);
  return {
    id: createSessionId(sessions),
    name: resolveNextSessionName(sessions),
    mode: "animation",
    scene: [],
    grid: getAnimationFrameEntries(timeline, timeline.currentFrameId),
    size: normalizedSize,
    timeline,
  };
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

      const syncAnimationRuntime = (
        timeline: AnimationTimeline,
        options?: {
          currentFrameId?: string;
          size?: AnimationCanvasSize;
          isPlaying?: boolean;
        }
      ) => {
        const state = get();
        const nextTimeline = cloneAnimationTimeline(timeline);
        if (
          options?.currentFrameId &&
          nextTimeline.frames.some((frame) => frame.id === options.currentFrameId)
        ) {
          nextTimeline.currentFrameId = options.currentFrameId;
        }
        const nextGridEntries = getAnimationFrameEntries(
          nextTimeline,
          nextTimeline.currentFrameId
        );
        const nextBounds = normalizeAnimationCanvasSize(
          options?.size ?? state.canvasBounds ?? DEFAULT_ANIMATION_SIZE
        );

        set({
          canvasMode: "animation",
          structuredScene: [],
          grid: createMapFromEntries(nextGridEntries),
          canvasBounds: nextBounds,
          animationTimeline: nextTimeline,
          animationIsPlaying: options?.isPlaying ?? state.animationIsPlaying,
          selections: [],
          textCursor: null,
          hoveredGrid: null,
          scratchLayer: null,
          canvasSessions: withActiveCanvasSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            {
              mode: "animation",
              scene: [],
              grid: nextGridEntries,
              size: nextBounds,
              timeline: nextTimeline,
            }
          ),
        });
        applyFreeformSnapshotToYMaps(nextGridEntries);
      };

      return {
        offset: { x: 0, y: 0 },
        zoom: 1,
        grid: new Map(),
        canvasMode: DEFAULT_MODE,
        structuredScene: [],
        canvasBounds: null,
        animationTimeline: null,
        animationIsPlaying: false,
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
        applyStructuredScene: (scene, shouldSaveHistory = true) => {
          const normalizedScene = normalizeAndCloneScene(scene);
          const gridEntries = sceneToGridEntries(normalizedScene);
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
            grid: createMapFromEntries(gridEntries),
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
        createCanvasSession: (mode = "freeform", options) => {
          const state = get();
          const snapshot = buildSessionSnapshot(state);
          const sessionsWithSnapshot = withActiveCanvasSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            snapshot
          );

          const normalizedMode = normalizeSessionMode(mode);
          const newSession =
            normalizedMode === "animation"
              ? createAnimationSession(sessionsWithSnapshot, options?.size)
              : {
                  id: createSessionId(sessionsWithSnapshot),
                  name: resolveNextSessionName(sessionsWithSnapshot),
                  mode: normalizedMode,
                  scene: [],
                  grid: [],
                };

          const runtime = resolveSessionRuntime(newSession, state.tool);

          set({
            canvasSessions: [...sessionsWithSnapshot, newSession],
            activeCanvasId: newSession.id,
            canvasMode: runtime.nextMode,
            structuredScene: runtime.nextScene,
            grid: createMapFromEntries(runtime.nextGridEntries),
            tool: runtime.nextTool,
            canvasBounds: runtime.nextBounds,
            animationTimeline: runtime.nextTimeline,
            animationIsPlaying: false,
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });

          if (runtime.nextMode === "structured") {
            applyStructuredSnapshotToYMaps(runtime.nextScene);
          } else {
            applyFreeformSnapshotToYMaps(runtime.nextGridEntries);
          }
        },
        switchCanvasSession: (canvasId) => {
          const state = get();
          if (canvasId === state.activeCanvasId) return;

          const snapshot = buildSessionSnapshot(state);
          const sessionsWithSnapshot = withActiveCanvasSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            snapshot
          );
          const target = sessionsWithSnapshot.find(
            (session) => session.id === canvasId
          );
          if (!target) return;

          const runtime = resolveSessionRuntime(target, state.tool);

          set({
            canvasSessions: sessionsWithSnapshot,
            activeCanvasId: canvasId,
            canvasMode: runtime.nextMode,
            structuredScene: runtime.nextScene,
            grid: createMapFromEntries(runtime.nextGridEntries),
            tool: runtime.nextTool,
            canvasBounds: runtime.nextBounds,
            animationTimeline: runtime.nextTimeline,
            animationIsPlaying: false,
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });

          if (runtime.nextMode === "structured") {
            applyStructuredSnapshotToYMaps(runtime.nextScene);
          } else {
            applyFreeformSnapshotToYMaps(runtime.nextGridEntries);
          }
        },
        removeCanvasSession: (canvasId) => {
          const state = get();
          if (state.canvasSessions.length <= 1) return;

          const snapshot = buildSessionSnapshot(state);
          const sessionsWithSnapshot = withActiveCanvasSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            snapshot
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
          const runtime = resolveSessionRuntime(nextSession, state.tool);

          set({
            canvasSessions: remaining,
            activeCanvasId: nextSession.id,
            canvasMode: runtime.nextMode,
            structuredScene: runtime.nextScene,
            grid: createMapFromEntries(runtime.nextGridEntries),
            tool: runtime.nextTool,
            canvasBounds: runtime.nextBounds,
            animationTimeline: runtime.nextTimeline,
            animationIsPlaying: false,
            selections: [],
            textCursor: null,
            hoveredGrid: null,
            scratchLayer: null,
          });

          if (runtime.nextMode === "structured") {
            applyStructuredSnapshotToYMaps(runtime.nextScene);
          } else {
            applyFreeformSnapshotToYMaps(runtime.nextGridEntries);
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
        setAnimationCurrentFrame: (frameId) => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;
          if (
            !state.animationTimeline.frames.some((frame) => frame.id === frameId)
          ) {
            return;
          }

          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          syncAnimationRuntime(syncedTimeline, {
            currentFrameId: frameId,
            isPlaying: state.animationIsPlaying,
          });
        },
        insertAnimationFrame: (position = "after") => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;

          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          const currentIndex = getAnimationFrameIndex(
            syncedTimeline,
            syncedTimeline.currentFrameId
          );
          const nextFrame = createEmptyAnimationFrame();
          const insertIndex =
            position === "before" ? currentIndex : currentIndex + 1;
          const nextTimeline = cloneAnimationTimeline(syncedTimeline);
          nextTimeline.frames.splice(insertIndex, 0, nextFrame);
          nextTimeline.currentFrameId = nextFrame.id;
          syncAnimationRuntime(nextTimeline, { isPlaying: false });
        },
        duplicateAnimationFrame: (frameId) => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;

          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          const sourceFrameId = frameId ?? syncedTimeline.currentFrameId;
          const sourceIndex = getAnimationFrameIndex(syncedTimeline, sourceFrameId);
          if (sourceIndex === -1) return;
          const nextTimeline = cloneAnimationTimeline(syncedTimeline);
          const sourceFrame = nextTimeline.frames[sourceIndex];
          const duplicated = {
            id: createEmptyAnimationFrame().id,
            grid: sourceFrame.grid.map(
              ([key, cell]) => [key, { ...cell }] as [string, GridCell]
            ),
          };
          nextTimeline.frames.splice(sourceIndex + 1, 0, duplicated);
          nextTimeline.currentFrameId = duplicated.id;
          syncAnimationRuntime(nextTimeline, { isPlaying: false });
        },
        removeAnimationFrame: (frameId) => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;

          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          if (syncedTimeline.frames.length <= 1) {
            const clearedTimeline = updateAnimationFrameEntries(
              syncedTimeline,
              syncedTimeline.currentFrameId,
              []
            );
            syncAnimationRuntime(clearedTimeline, { isPlaying: false });
            return;
          }

          const targetFrameId = frameId ?? syncedTimeline.currentFrameId;
          const targetIndex = getAnimationFrameIndex(syncedTimeline, targetFrameId);
          if (targetIndex === -1) return;

          const nextTimeline = cloneAnimationTimeline(syncedTimeline);
          nextTimeline.frames.splice(targetIndex, 1);
          const fallbackIndex = Math.min(
            targetIndex,
            nextTimeline.frames.length - 1
          );
          nextTimeline.currentFrameId = nextTimeline.frames[fallbackIndex].id;
          syncAnimationRuntime(nextTimeline, { isPlaying: false });
        },
        moveAnimationFrame: (frameId, direction) => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;

          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          const currentIndex = getAnimationFrameIndex(syncedTimeline, frameId);
          if (currentIndex === -1) return;
          const nextIndex = currentIndex + direction;
          if (nextIndex < 0 || nextIndex >= syncedTimeline.frames.length) return;

          const nextTimeline = cloneAnimationTimeline(syncedTimeline);
          const [frame] = nextTimeline.frames.splice(currentIndex, 1);
          nextTimeline.frames.splice(nextIndex, 0, frame);
          syncAnimationRuntime(nextTimeline, {
            isPlaying: state.animationIsPlaying,
          });
        },
        setAnimationFps: (fps) => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;
          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          syncedTimeline.fps = Math.max(1, Math.min(24, Math.round(fps)));
          syncAnimationRuntime(syncedTimeline, {
            isPlaying: state.animationIsPlaying,
          });
        },
        toggleAnimationLoop: () => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;
          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          syncedTimeline.loop = !syncedTimeline.loop;
          syncAnimationRuntime(syncedTimeline, {
            isPlaying: state.animationIsPlaying,
          });
        },
        setOnionSkinSettings: (settings) => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;
          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          syncedTimeline.onionSkin = {
            ...syncedTimeline.onionSkin,
            ...settings,
            opacityFalloff: Array.isArray(settings.opacityFalloff)
              ? settings.opacityFalloff
                  .filter((value): value is number => typeof value === "number")
                  .map((value) => Math.max(0, Math.min(1, value)))
              : syncedTimeline.onionSkin.opacityFalloff,
          };
          syncAnimationRuntime(syncedTimeline, {
            isPlaying: state.animationIsPlaying,
          });
        },
        setAnimationCanvasSize: (size) => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;
          const nextBounds = normalizeAnimationCanvasSize(size);
          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid).filter(([key]) => {
              const [x, y] = key.split(",").map(Number);
              return (
                Number.isFinite(x) &&
                Number.isFinite(y) &&
                x >= 0 &&
                y >= 0 &&
                x < nextBounds.width &&
                y < nextBounds.height
              );
            })
          );
          syncedTimeline.frames = syncedTimeline.frames.map((frame) => ({
            ...frame,
            grid: frame.grid.filter(([key]) => {
              const [x, y] = key.split(",").map(Number);
              return (
                Number.isFinite(x) &&
                Number.isFinite(y) &&
                x >= 0 &&
                y >= 0 &&
                x < nextBounds.width &&
                y < nextBounds.height
              );
            }),
          }));
          syncAnimationRuntime(syncedTimeline, {
            size: nextBounds,
            isPlaying: state.animationIsPlaying,
          });
        },
        playAnimation: () => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;
          set({ animationIsPlaying: true });
        },
        pauseAnimation: () => {
          const state = get();
          if (state.canvasMode !== "animation") return;
          set({ animationIsPlaying: false });
        },
        stepAnimationFrame: (direction = 1) => {
          const state = get();
          if (state.canvasMode !== "animation" || !state.animationTimeline) return;

          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          const currentIndex = getAnimationFrameIndex(
            syncedTimeline,
            syncedTimeline.currentFrameId
          );
          if (currentIndex === -1) return;

          let nextIndex = currentIndex + direction;
          if (nextIndex < 0) {
            nextIndex = syncedTimeline.loop
              ? syncedTimeline.frames.length - 1
              : currentIndex;
          }
          if (nextIndex >= syncedTimeline.frames.length) {
            nextIndex = syncedTimeline.loop ? 0 : currentIndex;
          }

          syncAnimationRuntime(syncedTimeline, {
            currentFrameId: syncedTimeline.frames[nextIndex].id,
            isPlaying: state.animationIsPlaying,
          });
        },
        tickAnimationPlayback: () => {
          const state = get();
          if (
            state.canvasMode !== "animation" ||
            !state.animationTimeline ||
            !state.animationIsPlaying
          ) {
            return;
          }

          const syncedTimeline = updateAnimationFrameEntries(
            state.animationTimeline,
            state.animationTimeline.currentFrameId,
            serializeGrid(state.grid)
          );
          const currentIndex = getAnimationFrameIndex(
            syncedTimeline,
            syncedTimeline.currentFrameId
          );
          if (currentIndex === -1) return;

          const nextIndex = currentIndex + 1;
          if (nextIndex >= syncedTimeline.frames.length) {
            if (!syncedTimeline.loop) {
              set({ animationIsPlaying: false, animationTimeline: syncedTimeline });
              return;
            }
            syncAnimationRuntime(syncedTimeline, {
              currentFrameId: syncedTimeline.frames[0].id,
              isPlaying: true,
            });
            return;
          }

          syncAnimationRuntime(syncedTimeline, {
            currentFrameId: syncedTimeline.frames[nextIndex].id,
            isPlaying: true,
          });
        },

        ...createDrawingSlice(set, get, ...a),
        ...createTextSlice(set, get, ...a),
        ...createSelectionSlice(set, get, ...a),
      };
    },
    {
      name: "ascii-canvas-persistence",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const activeSnapshot = buildSessionSnapshot(state);
        return {
          offset: state.offset,
          zoom: state.zoom,
          canvasMode: state.canvasMode,
          structuredScene: cloneScene(state.structuredScene),
          canvasBounds: state.canvasBounds ? { ...state.canvasBounds } : null,
          animationTimeline: state.animationTimeline
            ? cloneAnimationTimeline(state.animationTimeline)
            : null,
          brushChar: state.brushChar,
          brushColor: state.brushColor,
          showGrid: state.showGrid,
          exportShowGrid: state.exportShowGrid,
          canvasSessions: withActiveCanvasSnapshot(
            state.canvasSessions,
            state.activeCanvasId,
            activeSnapshot
          ),
          activeCanvasId: state.activeCanvasId,
          grid:
            state.canvasMode === "structured"
              ? sceneToGridEntries(state.structuredScene)
              : Array.from(state.grid.entries()),
        };
      },
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
                .filter(
                  (item): item is StructuredNode => !!item
                ) as StructuredNode[])
            : [];

          const recoveredSessions: CanvasSession[] = Array.isArray(
            hState.canvasSessions
          )
            ? hState.canvasSessions
                .map((raw): CanvasSession | null => {
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

                  if (mode === "animation") {
                    const size = normalizeAnimationCanvasSize(
                      maybe.size as Partial<AnimationCanvasSize> | undefined
                    );
                    const timeline = normalizeAnimationTimeline(
                      maybe.timeline,
                      Array.isArray(maybe.grid)
                        ? (maybe.grid as [string, GridCell][])
                        : []
                    );
                    return {
                      id: maybe.id,
                      name:
                        typeof maybe.name === "string" && maybe.name.trim()
                          ? maybe.name
                          : "Canvas",
                      mode,
                      scene: [],
                      grid: getAnimationFrameEntries(timeline, timeline.currentFrameId),
                      size,
                      timeline,
                    } satisfies CanvasSession;
                  }

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
                .filter((session): session is CanvasSession => session !== null)
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
          const currentTool = hState.tool || "select";
          const runtime = resolveSessionRuntime(activeSession, currentTool);

          hState.canvasSessions = sessions;
          hState.activeCanvasId = activeCanvasId;
          hState.canvasMode = runtime.nextMode;
          hState.structuredScene = runtime.nextScene;
          hState.grid = createMapFromEntries(runtime.nextGridEntries);
          hState.tool = runtime.nextTool;
          hState.canvasBounds = runtime.nextBounds;
          hState.animationTimeline = runtime.nextTimeline;
          hState.animationIsPlaying = false;

          if (runtime.nextMode === "structured") {
            applyStructuredSnapshotToYMaps(runtime.nextScene);
          } else {
            applyFreeformSnapshotToYMaps(runtime.nextGridEntries);
          }
        };
      },
    }
  )
);
