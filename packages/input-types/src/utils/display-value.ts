import type { Value } from '../data';

/** What the input shows: the raw text while it does not parse, else the value's display form. */
export function displayValue(
  value: Value,
  rawValue: string | undefined,
  toDisplay: (value: Value) => string,
): string {
  if (rawValue != null) return rawValue;
  if (value.isNull()) return '';
  return toDisplay(value);
}
