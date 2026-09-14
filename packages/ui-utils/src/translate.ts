import { localize, type Phrases, type PhraseValue } from './localize';

/**
 * What an application hands a toolkit package to put its own words in that package's mouth.
 *
 * ! `undefined` for a key it does not carry, which is what lets the package fall back to its own
 * ! text. A translate that answers every key — forwarding to a phrase function that marks a miss
 * ! with the key itself — puts that marker on screen instead. `fromPhrases` is the guarded form.
 */
export type Translate = (key: string, ...values: PhraseValue[]) => string | undefined;

/** A `Translate` over a phrase map, read at call time so phrases may arrive after the provider. */
export function fromPhrases(read: () => Phrases): Translate {
  return (key, ...values) => {
    const phrases = read();

    return Object.hasOwn(phrases, key) ? localize(phrases, key, ...values) : undefined;
  };
}

/** The application's word for a key, or the package's own. */
export function resolveText(
  translate: Translate | undefined,
  phrases: Phrases,
  key: string,
  values: readonly PhraseValue[],
): string {
  return translate?.(key, ...values) ?? localize(phrases, key, ...values);
}
