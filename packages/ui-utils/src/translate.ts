import { localize, type Phrases, type PhraseValue } from './localize';

export type TranslateOptions = {
  /** The package's own English for the key, placeholders already filled. A miss returns it untouched. */
  defaultValue: string;
  /** The raw values, for the application's own template. A hit formats once, with these. */
  values?: readonly PhraseValue[];
};

/**
 * What an application hands a toolkit package — through `@enonic/ui`'s `I18nProvider` — to render
 * that package's labels in its own words: the application's text for `key`, or the `defaultValue`
 * it was given. Structurally the same type `@enonic/ui` declares, so one function serves both.
 */
export type Translate = (key: string, options: TranslateOptions) => string;

/** The `Translate` of an application that translates nothing. */
export const passthrough: Translate = (_key, { defaultValue }) => defaultValue;

/** A `Translate` over a phrase map, read at call time so phrases may arrive after the provider. */
export function fromPhrases(read: () => Phrases): Translate {
  return (key, { defaultValue, values = [] }) => {
    const phrases = read();

    return Object.hasOwn(phrases, key) ? localize(phrases, key, ...values) : defaultValue;
  };
}

/**
 * A `Translate` over a has/get pair — what a `Messages`-style source offers. `get` is trusted to
 * fill its own placeholders.
 */
export function fromLookup(
  has: (key: string) => boolean,
  get: (key: string, ...values: PhraseValue[]) => string,
): Translate {
  return (key, { defaultValue, values = [] }) => (has(key) ? get(key, ...values) : defaultValue);
}

/**
 * The `t` of one fragment: the application's word for a key where it has one, else the fragment's
 * own English with its placeholders filled. What `usePhrases` returns inside a render, and what a
 * store calls outside one.
 */
export function bindPhrases<K extends string>(
  translate: Translate,
  phrases: Readonly<Record<K, string>>,
): (key: K, ...values: PhraseValue[]) => string {
  return (key, ...values) =>
    translate(key, { defaultValue: localize(phrases, key, ...values), values });
}

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

/**
 * One map from a package's fragments, keys kept as a type. A key two fragments both declare throws
 * rather than taking the last spread.
 */
export function mergePhrases<const T extends readonly Phrases[]>(
  fragments: T,
): Readonly<UnionToIntersection<T[number]>> {
  const merged: Record<string, string> = {};

  for (const fragment of fragments) {
    for (const [key, text] of Object.entries(fragment)) {
      if (Object.hasOwn(merged, key)) {
        throw new Error(`Phrase key declared twice: ${key}`);
      }
      merged[key] = text;
    }
  }

  return merged as Readonly<UnionToIntersection<T[number]>>;
}

export type PhraseComparison = {
  /** Keys of the catalogue the bundle does not carry. */
  missing: string[];
  /** Keys whose `{n}` placeholder set differs between the catalogue and the bundle. */
  placeholderMismatch: string[];
};

/** How far an application's phrase bundle covers a package's catalogue. Both empty is full coverage. */
export function comparePhrases(catalog: Phrases, bundle: Phrases): PhraseComparison {
  const missing: string[] = [];
  const placeholderMismatch: string[] = [];

  for (const [key, text] of Object.entries(catalog)) {
    const translated = bundle[key];

    if (translated === undefined) {
      missing.push(key);
    } else if (placeholders(text) !== placeholders(translated)) {
      placeholderMismatch.push(key);
    }
  }

  return { missing, placeholderMismatch };
}

function placeholders(text: string): string {
  return [...new Set([...text.matchAll(/\{(\d+)\}/g)].map(([, index]) => Number(index)))]
    .sort((a, b) => a - b)
    .join(',');
}
