import { describe, expect, it, vi } from 'vitest';

import { fromPhrases, resolveText, type Translate } from './translate';

const KIT = { 'uiKit.a': 'Kit A', 'uiKit.b': 'Kit {0} and {1}' };

describe('fromPhrases', () => {
  it('answers with the phrase it carries', () => {
    expect(fromPhrases(() => ({ 'uiKit.a': 'App A' }))('uiKit.a')).toBe('App A');
  });

  it('fills placeholders the way localize does', () => {
    expect(fromPhrases(() => ({ 'uiKit.b': 'App {0}/{1}' }))('uiKit.b', 1, 'x')).toBe('App 1/x');
  });

  it('answers nothing for a key it does not carry, rather than marking it', () => {
    expect(fromPhrases(() => ({}))('uiKit.a')).toBeUndefined();
  });

  it('does not mistake an inherited property for a phrase', () => {
    expect(fromPhrases(() => ({}))('toString')).toBeUndefined();
  });

  it('reads at call time, so phrases may arrive after the provider', () => {
    let phrases: Record<string, string> = {};
    const translate = fromPhrases(() => phrases);

    expect(translate('uiKit.a')).toBeUndefined();
    phrases = { 'uiKit.a': 'App A' };
    expect(translate('uiKit.a')).toBe('App A');
  });
});

describe('resolveText', () => {
  it('takes the application word over the package one', () => {
    const translate = vi.fn<Translate>(() => 'App A');

    expect(resolveText(translate, KIT, 'uiKit.a', [])).toBe('App A');
    expect(translate).toHaveBeenCalledExactlyOnceWith('uiKit.a');
  });

  it('falls back to the package when the application has no word for it', () => {
    expect(resolveText(() => undefined, KIT, 'uiKit.a', [])).toBe('Kit A');
  });

  it('speaks the package English with no translate at all', () => {
    expect(resolveText(undefined, KIT, 'uiKit.b', ['one', 'two'])).toBe('Kit one and two');
  });

  it('hands the values to whichever answered', () => {
    const translate: Translate = (key, ...values) => `${key}:${values.join(',')}`;

    expect(resolveText(translate, KIT, 'uiKit.b', [1, 2])).toBe('uiKit.b:1,2');
  });
});
