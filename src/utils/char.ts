export const isWideChar = (char: string) => {
  // 严格定义宽字符范围：
  // 1. \u2e80-\u9fff : CJK 统一表意文字 (汉字)
  // 2. \uf900-\ufaff : CJK 兼容象形文字
  // 3. \uff00-\uffef : 全角字符 (如全角逗号，全角字母)
  //
  // 这样可以确保 Box Drawing 字符 (如 ╭ ╮ ─ │) 被视为单宽字符

  return /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char);
};
