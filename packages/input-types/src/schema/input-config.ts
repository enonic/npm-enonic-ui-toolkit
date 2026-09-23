import type { InputConfigJson } from '@enonic/ui-types';

import type { InputConfigEntries, InputConfigEntry } from '../descriptor/input-type-config';

function toEntry(value: unknown): InputConfigEntry {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as InputConfigEntry)
    : { value };
}

/**
 * XP's raw config values as the entries a descriptor reads: a scalar becomes one `{ value }`
 * entry, a list one entry per item, an object one entry of its own properties. Content Studio's
 * REST already sends lists of entries, which pass through unchanged.
 */
export function normalizeInputConfig(
  config: InputConfigJson | InputConfigEntries | undefined,
): InputConfigEntries | undefined {
  if (config === undefined) return undefined;
  const entries: Record<string, readonly InputConfigEntry[]> = {};
  for (const [property, value] of Object.entries(config)) {
    entries[property] = Array.isArray(value) ? value.map(toEntry) : [toEntry(value)];
  }
  return entries;
}
