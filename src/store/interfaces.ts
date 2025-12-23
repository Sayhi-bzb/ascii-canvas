import type {
  GridMap,
  GridPoint,
  Point,
  SelectionArea,
  ToolType,
} from "../types";

export interface RichTextCell {
  x: number;
  y: number;
  char: string;
  color: string;
}

export interface DrawingSlice {
  scratchLayer: GridMap | null;
  setScratchLayer: (points: GridPoint[]) => void;
  addScratchPoints: (points: GridPoint[]) => void;
  commitScratch: () => void;
  clearScratch: () => void;
  clearCanvas: () => void;
  erasePoints: (points: Point[]) => void;
  updateScratchForShape: (
    tool: ToolType,
    start: Point,
    end: Point,
    options?: { axis?: "vertical" | "horizontal" | null }
  ) => void;
}

export interface TextSlice {
  textCursor: Point | null;
  setTextCursor: (pos: Point | null) => void;
  writeTextString: (str: string, startPos?: Point) => void;
  pasteRichData: (cells: RichTextCell[], startPos?: Point) => void;
  moveTextCursor: (dx: number, dy: number) => void;
  backspaceText: () => void;
  newlineText: () => void;
  indentText: () => void;
}

export interface SelectionSlice {
  selections: SelectionArea[];
  addSelection: (area: SelectionArea) => void;
  clearSelections: () => void;
  deleteSelection: () => void;
  copySelectionToClipboard: () => void;
  cutSelectionToClipboard: () => void;
  copySelectionAsPng: (withGrid: boolean) => Promise<void>;
  fillSelectionsWithChar: (char: string) => void;
  fillArea: (area: SelectionArea) => void;

export type CanvasState = {
  offset: Point;
  zoom: number;
  tool: ToolType;
  brushChar: string;
  brushColor: string;
  grid: GridMap;
  showGrid: boolean;
  exportShowGrid: boolean;
  hoveredGrid: Point | null;

  setOffset: (updater: (prev: Point) => Point) => void;
  setZoom: (updater: (prev: number) => number) => void;
  setTool: (tool: ToolType) => void;
  setBrushChar: (char: string) => void;
  setBrushColor: (color: string) => void;
  setShowGrid: (show: boolean) => void;
  setExportShowGrid: (show: boolean) => void;
  setHoveredGrid: (pos: Point | null) => void;
} & DrawingSlice &
  TextSlice &
  SelectionSlice;
