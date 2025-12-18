import { create } from "zustand";
import { MIN_ZOOM, MAX_ZOOM } from "../lib/constants";
import { composeScene, parseSceneGraph } from "../utils/scene";
import { ySceneRoot } from "../lib/yjs-setup";
import type { CanvasState } from "./interfaces";
import {
  createNodeSlice,
  createDrawingSlice,
  createTextSlice,
  createSelectionSlice,
} from "./slices";

export type { CanvasState };

export const useCanvasStore = create<CanvasState>((set, get, ...a) => {
  const render = () => {
    const compositeGrid = new Map<string, string>();
    composeScene(ySceneRoot, 0, 0, compositeGrid);
    const tree = parseSceneGraph(ySceneRoot);
    set({ grid: compositeGrid, sceneGraph: tree });
  };

  ySceneRoot.observeDeep(() => {
    render();
  });

  setTimeout(render, 0);

  return {
    offset: { x: 0, y: 0 },
    zoom: 1,
    grid: new Map(),
    sceneGraph: null,
    activeNodeId: "item-main",
    tool: "select",
    brushChar: "#",

    setOffset: (updater) => set((state) => ({ offset: updater(state.offset) })),
    setZoom: (updater) =>
      set((state) => ({
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, updater(state.zoom))),
      })),
    setTool: (tool) => set({ tool, textCursor: null }),
    setBrushChar: (char) => set({ brushChar: char }),
    setActiveNode: (id) =>
      set({ activeNodeId: id, selections: [], textCursor: null }),

    ...createNodeSlice(set, get, ...a),
    ...createDrawingSlice(set, get, ...a),
    ...createTextSlice(set, get, ...a),
    ...createSelectionSlice(set, get, ...a),
  };
});
