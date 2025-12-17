import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export type GridMap = Map<string, string>;
export type ToolType = "select" | "fill" | "brush" | "eraser" | "box" | "line";
export type Point = z.infer<typeof PointSchema>;
export type SelectionArea = z.infer<typeof SelectionAreaSchema>;
export type GridPoint = Point & {
  char: string;
};
