import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof PointSchema>;

export const GridPointSchema = PointSchema.extend({
  char: z.string().length(1),
});

export type GridPoint = z.infer<typeof GridPointSchema>;

export const SelectionAreaSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export type SelectionArea = z.infer<typeof SelectionAreaSchema>;

export const NodeTypeSchema = z.enum([
  "root",
  "layer",
  "shape-box",
  "shape-line",
  "shape-path",
  "shape-text",
  "shape-circle",
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  x: number;
  y: number;
  width?: number;
  height?: number;
  isVisible: boolean;
  isLocked: boolean;
  isCollapsed: boolean;
  pathData?: GridPoint[];
  props?: Record<string, unknown>; // 修复：any -> unknown
  children: CanvasNode[];
}

export const CanvasNodeSchema: z.ZodType<CanvasNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: NodeTypeSchema,
    name: z.string().min(1).max(50),
    parentId: z.string().nullable(),
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().optional(),
    height: z.number().optional(),
    isVisible: z.boolean().default(true),
    isLocked: z.boolean().default(false),
    isCollapsed: z.boolean().default(false),
    pathData: z.array(GridPointSchema).optional(),
    props: z.record(z.string(), z.unknown()).optional(), // 修复：any -> unknown
    children: z.array(CanvasNodeSchema),
  })
);

export type GridMap = Map<string, string>;

// 修复：补全所有使用的工具类型，确保 TypeScript 类型检查通过
export type ToolType =
  | "select"
  | "fill"
  | "brush"
  | "eraser"
  | "box"
  | "line"
  | "stepline"
  | "circle"
  | "text";
