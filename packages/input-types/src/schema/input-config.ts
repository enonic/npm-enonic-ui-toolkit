import type { InputConfigJson, InputConfigValueJson } from '@enonic/ui-types';

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

function fromEntry(entry: InputConfigEntry): InputConfigValueJson {
  const keys = Object.keys(entry);
  return (keys.length === 1 && keys[0] === 'value' ? entry.value : entry) as InputConfigValueJson;
}

/**
 * Entries back to XP's raw values: a lone `{ value }` is its value, an entry with attributes stays
 * an object, several entries are a list. What `toJson` writes when the input was not read from
 * XP's JSON, whose config it keeps as it came.
 */
export function denormalizeInputConfig(
  entries: InputConfigEntries | undefined,
): InputConfigJson | undefined {
  if (entries === undefined) return undefined;
  const config: Record<string, InputConfigValueJson> = {};
  for (const [property, list] of Object.entries(entries)) {
    const [only] = list;
    config[property] =
      list.length === 1 && only !== undefined ? fromEntry(only) : list.map(fromEntry);
  }
  return config;
}
