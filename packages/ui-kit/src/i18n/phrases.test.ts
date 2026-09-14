import { describe, expect, it } from 'vitest';

import { uiKitPhrases } from './phrases';

/**
 * The fragments merged into `uiKitPhrases` are listed here by hand, one per component module, so a
 * key two of them both declare is caught rather than silently taken from the last spread.
 */
const fragments: readonly Readonly<Record<string, string>>[] = [];

describe('uiKitPhrases', () => {
  it('prefixes every key with uiKit.', () => {
    for (const key of Object.keys(uiKitPhrases)) {
      expect(key).toMatch(/^uiKit\.[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/);
    }
  });

  it('declares no key twice across the fragments', () => {
    const seen = new Set<string>();

    for (const fragment of fragments) {
      for (const key of Object.keys(fragment)) {
        expect(seen.has(key), `${key} is declared in two fragments`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('merges exactly the fragments', () => {
    expect(uiKitPhrases).toEqual(Object.assign({}, ...fragments));
  });

  it('numbers placeholders from zero without gaps', () => {
    for (const [key, phrase] of Object.entries<string>(uiKitPhrases)) {
      const indices = [...phrase.matchAll(/\{(\d+)\}/g)].map(([, index]) => Number(index));
      const distinct = [...new Set(indices)].sort((a, b) => a - b);

      expect(distinct, `${key} skips a placeholder index`).toEqual(distinct.map((_, i) => i));
    }
  });
});
