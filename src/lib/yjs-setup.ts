import * as Y from "yjs";

// 1. 创建核心文档
export const yDoc = new Y.Doc();

// 2. 定义共享数据结构
export const yGrid = yDoc.getMap<string>("grid");

// 3. 创建历史管理器
// 注意：这里我们保留 captureTimeout，用于处理普通打字（我们不希望撤销一个字母，而是一段话）
// 但是对于绘图和粘贴，我们将手动打断它
export const undoManager = new Y.UndoManager(yGrid, {
  captureTimeout: 500, // 仅对连续打字有效
  trackedOrigins: new Set([null]), // 追踪所有本地变更
});

// 辅助函数：开启事务
export const performTransaction = (fn: () => void) => {
  yDoc.transact(() => {
    fn();
  });
};

// ✨ 新增：强制存档（封卷）
// 调用这个函数意味着：“这一步操作彻底结束了，请切断与下一步的联系”
export const forceHistorySave = () => {
  undoManager.stopCapturing();
};
