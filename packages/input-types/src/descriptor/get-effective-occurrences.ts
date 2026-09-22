import { Occurrences } from '../schema';
import type { InputTypeMode } from '../types';

/**
 * The occurrences a mode renders: a `single` type — a checkbox, a radio group — shows exactly one
 * value whatever the schema says, so its occurrences clamp to `min(minimum, 1)..1`.
 */
export function getEffectiveOccurrences(
  mode: InputTypeMode,
  occurrences: Occurrences,
): Occurrences {
  return mode === 'single'
    ? Occurrences.minmax(Math.min(occurrences.getMinimum(), 1), 1)
    : occurrences;
}
