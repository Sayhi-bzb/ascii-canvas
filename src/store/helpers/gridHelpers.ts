import {
  undoManager,
  yMainGrid,
  yStructuredScene,
  transactWithHistory,
} from "../../lib/yjs-setup";
import type { GridCell, StructuredNode } from "../../types";
import { normalizeScene, sceneToGridEntries } from "@/utils/structured";

export const rebuildGridFromYMap = () => {
  const nextGrid = new Map<string, GridCell>();
  yMainGrid.forEach((value, key) => {
    nextGrid.set(key, value as GridCell);
  });
  return nextGrid;
};

export const rebuildSceneFromYMap = () => {
  const nextScene: StructuredNode[] = [];
  yStructuredScene.forEach((value) => {
    nextScene.push(cloneStructuredNode(value as StructuredNode));
  });
  return normalizeScene(nextScene);
};

export const patchGridByChangedKeys = (
  currentGrid: Map<string, GridCell>,
  keysChanged: Set<string>
) => {
  let nextGrid: Map<string, GridCell> | null = null;

  keysChanged.forEach((key) => {
    const nextCell = yMainGrid.get(key) as GridCell | undefined;
    const prevCell = currentGrid.get(key);

    if (!nextCell) {
      if (!prevCell) return;
      if (!nextGrid) nextGrid = new Map(currentGrid);
      nextGrid.delete(key);
      return;
    }

    if (isSameCell(prevCell, nextCell)) return;
    if (!nextGrid) nextGrid = new Map(currentGrid);
    nextGrid.set(key, nextCell);
  });

  return nextGrid;
};

export const applyFreeformSnapshotToYMaps = (
  entries: [string, GridCell][]
) => {
  transactWithHistory(() => {
    yStructuredScene.clear();
    yMainGrid.clear();
    entries.forEach(([key, val]) => yMainGrid.set(key, val));
  }, false);
  undoManager.clear();
};

export const applyStructuredSnapshotToYMaps = (scene: StructuredNode[]) => {
  const normalizedScene = normalizeAndCloneScene(scene);
  const gridEntries = sceneToGridEntries(normalizedScene);
  transactWithHistory(() => {
    yStructuredScene.clear();
    normalizedScene.forEach((node) => {
      yStructuredScene.set(node.id, node);
    });
    yMainGrid.clear();
    gridEntries.forEach(([key, val]) => yMainGrid.set(key, val));
  }, false);
  undoManager.clear();
};

// Helper functions needed by gridHelpers
const cloneStructuredNode = (node: StructuredNode): StructuredNode => {
  if (node.type === "text") {
    return {
      ...node,
      position: { ...node.position },
      style: { ...node.style },
    };
  }
  return {
    ...node,
    start: { ...node.start },
    end: { ...node.end },
    style: { ...node.style },
  };
};

const normalizeAndCloneScene = (scene: StructuredNode[]) => {
  return scene.map((node) => cloneStructuredNode(node));
};

const isSameCell = (a?: GridCell, b?: GridCell) => {
  if (!a || !b) return false;
  return a.char === b.char && a.color === b.color;
};
