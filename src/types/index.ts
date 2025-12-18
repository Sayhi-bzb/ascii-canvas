export type GridMap = Map<string, string>;

export type ToolType = "select" | "fill" | "brush" | "eraser" | "box" | "line";

export interface Point {
  x: number;
  y: number;
}

export interface SelectionArea {
  start: Point;
  end: Point;
}

export type GridPoint = Point & {
  char: string;
};
