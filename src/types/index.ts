import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof PointSchema>;

export const GridCellSchema = z.object({
  char: z.string(),
  color: z.string(),
});

export type GridCell = z.infer<typeof GridCellSchema>;

export const GridPointSchema = PointSchema.extend({
  char: z.string(),
  color: z.string().optional(),
});

export type GridPoint = z.infer<typeof GridPointSchema>;

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export type SelectionArea = z.infer<typeof SelectionAreaSchema>;

export type GridMap = Map<string, GridCell>;

export type ToolType =
  | "select"
  | "brush"
  | "eraser"
  | "box"
  | "line"
  | "stepline"
  | "circle"
  | "text";
