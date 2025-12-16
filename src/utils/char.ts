export const isWideChar = (char: string) => {
  return /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char);
};
