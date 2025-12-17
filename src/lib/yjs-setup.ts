import * as Y from "yjs";

const yDoc = new Y.Doc();

export const yGrid = yDoc.getMap<string>("grid");

export const undoManager = new Y.UndoManager(yGrid, {
  captureTimeout: 500,
  trackedOrigins: new Set([null]),
});

export const performTransaction = (fn: () => void) => {
  yDoc.transact(() => {
    fn();
  });
};

export const forceHistorySave = () => {
  undoManager.stopCapturing();
};
