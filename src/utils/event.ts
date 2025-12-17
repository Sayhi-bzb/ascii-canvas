/**
 * “中央交通指挥中心”：提供统一的“特殊通行证”（Ctrl/Meta键）识别服务。
 */
export const isCtrlOrMeta = (event: { ctrlKey: boolean; metaKey: boolean }) => {
  return event.ctrlKey || event.metaKey;
};
