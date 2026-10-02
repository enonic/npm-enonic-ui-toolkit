export const normalizeTyped = (typed: string): string => typed.trim();

/** Whether what was typed is the name or the count asked for; spaces around it do not count. */
export function matchesExpected(
  typed: string,
  expected: string | number,
  normalize: (typed: string) => string = normalizeTyped,
): boolean {
  return normalize(typed) === String(expected);
}
