import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof PointSchema>;

export const GridPointSchema = PointSchema.extend({
  char: z.string(),
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
  "item",
  "shape-box",
  "shape-line",
  "shape-path",
  "shape-text",
  "shape-circle",
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export type GridMap = Map<string, string>;

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
  content?: GridMap;
  pathData?: GridMap;
  text?: string; // 新增：用于存储 shape-text 的文本内容
  props?: Record<string, unknown>;
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
    content: z.instanceof(Map).optional() as z.ZodType<GridMap | undefined>,
    pathData: z.instanceof(Map).optional() as z.ZodType<GridMap | undefined>,
    text: z.string().optional(), // 新增验证
    props: z.record(z.string(), z.unknown()).optional(),
    children: z.array(CanvasNodeSchema),
  })
);

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
