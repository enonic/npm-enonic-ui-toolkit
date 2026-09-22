import { parseDateTime } from '@enonic/ui-utils';

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

const DISPLAY_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/**
 * `2025-06-15 14:30` as a date-time input shows it, to the minute and nothing finer: seconds
 * typed into the field are a mistake, where `parseDateTime` alone would keep them.
 */
export function parseDisplayDateTime(display: string): Date | undefined {
  return DISPLAY_DATE_TIME_PATTERN.test(display.trim()) ? parseDateTime(display) : undefined;
}
