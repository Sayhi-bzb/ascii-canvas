export interface Point {
  x: number;
  y: number;
}

export interface GridCell {
  char: string;
  color: string;
}

export interface GridPoint extends Point {
  char: string;
  color?: string;
}

export interface SelectionArea {
  start: Point;
  end: Point;
}

export type GridMap = Map<string, GridCell>;

export type ToolType =
  | "select"
  | "brush"
  | "eraser"
  | "fill"
  | "box"
  | "line"
  | "stepline"
  | "circle"
  | "text";
