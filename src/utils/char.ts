export const isWideChar = (char: string) => {
  return /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ue000-\uf8ff]/.test(char);
};
