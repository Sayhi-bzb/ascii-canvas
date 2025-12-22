import * as Y from "yjs";

const yDoc = new Y.Doc();

export const yMainGrid = yDoc.getMap<string>("main-grid");

export const undoManager = new Y.UndoManager([yMainGrid], {
  captureTimeout: 500,
  trackedOrigins: new Set([null]),
});

export const forceHistorySave = () => {
  undoManager.stopCapturing();
};

export const transactWithHistory = (
  fn: () => void,
  shouldSaveHistory = true
) => {
  yDoc.transact(() => {
    fn();
  });
  if (shouldSaveHistory) {
    forceHistorySave();
  }
};
