import { describe, expect, it, vi } from 'vitest';

import {
  bindPhrases,
  comparePhrases,
  fromLookup,
  fromPhrases,
  mergePhrases,
  passthrough,
  type Translate,
} from './translate';

const KIT = { 'uiKit.a': 'Kit A', 'uiKit.b': 'Kit {0} and {1}' } as const;

describe('passthrough', () => {
  it('hands the default back', () => {
    expect(passthrough('uiKit.a', { defaultValue: 'Kit A' })).toBe('Kit A');
  });
});

describe('fromPhrases', () => {
  it('answers with the phrase it carries', () => {
    expect(fromPhrases(() => ({ 'uiKit.a': 'App A' }))('uiKit.a', { defaultValue: 'Kit A' })).toBe(
      'App A',
    );
  });

  it('fills placeholders from the values, not from the default', () => {
    const translate = fromPhrases(() => ({ 'uiKit.b': 'App {0}/{1}' }));

    expect(translate('uiKit.b', { defaultValue: 'Kit 1 and x', values: [1, 'x'] })).toBe('App 1/x');
  });

  it('hands the default back for a key it does not carry, rather than marking it', () => {
    expect(fromPhrases(() => ({}))('uiKit.a', { defaultValue: 'Kit A' })).toBe('Kit A');
  });

  it('does not mistake an inherited property for a phrase', () => {
    expect(fromPhrases(() => ({}))('toString', { defaultValue: 'Kit' })).toBe('Kit');
  });

  it('reads at call time, so phrases may arrive after the provider', () => {
    let phrases: Record<string, string> = {};
    const translate = fromPhrases(() => phrases);

    expect(translate('uiKit.a', { defaultValue: 'Kit A' })).toBe('Kit A');
    phrases = { 'uiKit.a': 'App A' };
    expect(translate('uiKit.a', { defaultValue: 'Kit A' })).toBe('App A');
  });
});

describe('fromLookup', () => {
  const messages = new Map([['uiKit.b', 'App {0}']]);
  const get = vi.fn(
    (key: string, ...values: (string | number)[]) => `${messages.get(key)}:${values.join(',')}`,
  );
  const translate = fromLookup((key) => messages.has(key), get);

  it('asks get only where has says so, with the values', () => {
    expect(translate('uiKit.b', { defaultValue: 'Kit', values: [7] })).toBe('App {0}:7');
    expect(get).toHaveBeenCalledExactlyOnceWith('uiKit.b', 7);
  });

  it('hands the default back otherwise, without asking get', () => {
    get.mockClear();

    expect(translate('uiKit.a', { defaultValue: 'Kit A' })).toBe('Kit A');
    expect(get).not.toHaveBeenCalled();
  });
});

describe('bindPhrases', () => {
  it('offers the fragment English, placeholders filled, as the default', () => {
    const translate = vi.fn<Translate>((_key, { defaultValue }) => defaultValue);
    const t = bindPhrases(translate, KIT);

    expect(t('uiKit.b', 'one', 'two')).toBe('Kit one and two');
    expect(translate).toHaveBeenCalledExactlyOnceWith('uiKit.b', {
      defaultValue: 'Kit one and two',
      values: ['one', 'two'],
    });
  });

  it('takes the application word over the fragment one', () => {
    expect(bindPhrases(() => 'App A', KIT)('uiKit.a')).toBe('App A');
  });
});

describe('mergePhrases', () => {
  it('merges the fragments into one map', () => {
    expect(mergePhrases([{ 'x.a': 'A' }, { 'x.b': 'B' }])).toEqual({ 'x.a': 'A', 'x.b': 'B' });
  });

  it('refuses a key declared twice', () => {
    expect(() => mergePhrases([{ 'x.a': 'A' }, { 'x.a': 'Again' }])).toThrow('x.a');
  });
});

describe('comparePhrases', () => {
  it('reports nothing for a bundle that covers the catalogue', () => {
    expect(comparePhrases(KIT, { 'uiKit.a': 'A', 'uiKit.b': '{1} og {0}' })).toEqual({
      missing: [],
      placeholderMismatch: [],
    });
  });

  it('names the keys the bundle lacks', () => {
    expect(comparePhrases(KIT, { 'uiKit.a': 'A' }).missing).toEqual(['uiKit.b']);
  });

  it('names the keys whose placeholder set differs', () => {
    expect(
      comparePhrases(KIT, { 'uiKit.a': 'A {0}', 'uiKit.b': 'B {0}' }).placeholderMismatch,
    ).toEqual(['uiKit.a', 'uiKit.b']);
  });

  it('ignores keys the catalogue does not have', () => {
    expect(comparePhrases(KIT, { ...KIT, 'app.own': 'x' })).toEqual({
      missing: [],
      placeholderMismatch: [],
    });
  });
});
