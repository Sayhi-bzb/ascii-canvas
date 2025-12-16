import type { StoreApi, UseBoundStore } from "zustand";
import type { TemporalState } from "zundo";
import type { CanvasState } from "../store/canvasStore";

export type GridMap = Map<string, string>;

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
