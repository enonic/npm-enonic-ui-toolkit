export type Phrases = Readonly<Record<string, string>>;

export type PhraseValue = string | number;

/**
 * The phrase behind `key` with `{0}`-style placeholders filled by position. A missing key is
 * `#key#`, a placeholder with no value stays as written. No plural forms, no escaping of braces.
 */
export function localize(phrases: Phrases, key: string, ...values: PhraseValue[]): string {
  const phrase = Object.hasOwn(phrases, key) ? phrases[key] : undefined;
  if (phrase === undefined) {
    return `#${key}#`;
  }

  return phrase.replace(/\{(\d+)\}/g, (placeholder, index: string) => {
    const value = values[Number(index)];
    return value === undefined ? placeholder : String(value);
  });
}
