export const normalizeTyped = (typed: string): string => typed.trim();

/** Whether what was typed is the name or the count asked for; spaces around it do not count, nothing never matches. */
export function matchesExpected(
  typed: string,
  expected: string | number,
  normalize: (typed: string) => string = normalizeTyped,
): boolean {
  const entered = normalize(typed);
  return entered !== '' && entered === String(expected);
}
