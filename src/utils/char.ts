export const isWideChar = (char: string) => {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\xff]/.test(char);
};
