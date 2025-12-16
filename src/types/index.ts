// src/types/index.ts
import type { StoreApi, UseBoundStore } from "zustand";
import type { TemporalState } from "zundo";
import type { CanvasState } from "../store/canvasStore";

// -----------------------------------------------------------------------------
// A. 基础定义 (源头)
// -----------------------------------------------------------------------------
export type GridMap = Map<string, string>;
// 新增 'fill' 工具
export type ToolType =
  | "select"
  | "fill"
  | "brush"
  | "eraser"
  | "box"
  | "line"
  | "text";

export type Point = {
  x: number;
  y: number;
};

export type SelectionArea = {
  start: Point;
  end: Point;
};

export type GridPoint = Point & {
  char: string;
};

type TrackedState = {
  grid: GridMap;
};

type TemporalStoreState = TemporalState<TrackedState>;

type TemporalStore = StoreApi<TemporalStoreState>;

export type CanvasStoreWithTemporal = UseBoundStore<StoreApi<CanvasState>> & {
  temporal: TemporalStore;
};
