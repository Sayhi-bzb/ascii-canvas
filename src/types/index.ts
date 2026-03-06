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

export type CanvasMode = "freeform" | "structured";

export type ToolType =
  | "select"
  | "brush"
  | "eraser"
  | "fill"
  | "box"
  | "line"
  | "stepline"
  | "circle";

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StructuredNodeStyle {
  color: string;
}

interface StructuredNodeBase {
  id: string;
  order: number;
  style: StructuredNodeStyle;
}

export interface StructuredBoxNode extends StructuredNodeBase {
  type: "box";
  start: Point;
  end: Point;
  name?: string;
}

export interface StructuredLineNode extends StructuredNodeBase {
  type: "line";
  start: Point;
  end: Point;
  axis: "vertical" | "horizontal";
}

export interface StructuredTextNode extends StructuredNodeBase {
  type: "text";
  position: Point;
  text: string;
}

export type StructuredNode =
  | StructuredBoxNode
  | StructuredLineNode
  | StructuredTextNode;
