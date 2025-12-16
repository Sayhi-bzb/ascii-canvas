import { z } from "zod";
import type { StoreApi, UseBoundStore } from "zustand";
import type { TemporalState } from "zundo";
import type { CanvasState } from "../store/canvasStore";

// --- Zod Schemas (The Single Source of Truth) ---

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export const GridPointSchema = PointSchema.extend({
  char: z.string(),
});

export const GridMapSchema = z.map(z.string(), z.string());

export const ToolTypeSchema = z.enum([
  "select",
  "fill",
  "brush",
  "eraser",
  "box",
  "line",
  "text",
]);

// --- Inferred Types (Automatically Generated Blueprints) ---

export type GridMap = z.infer<typeof GridMapSchema>;
export type ToolType = z.infer<typeof ToolTypeSchema>;
export type Point = z.infer<typeof PointSchema>;
export type SelectionArea = z.infer<typeof SelectionAreaSchema>;
export type GridPoint = z.infer<typeof GridPointSchema>;

// --- Untouched Library/Complex Types ---

type TrackedState = {
  grid: GridMap;
};

type TemporalStoreState = TemporalState<TrackedState>;

type TemporalStore = StoreApi<TemporalStoreState>;

export type CanvasStoreWithTemporal = UseBoundStore<StoreApi<CanvasState>> & {
  temporal: TemporalStore;
};
