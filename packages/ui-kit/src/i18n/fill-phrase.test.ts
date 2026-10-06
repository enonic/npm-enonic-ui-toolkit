import { describe, expect, it } from 'vitest';

import { fillPhrase } from './fill-phrase';

describe('fillPhrase', () => {
  it('puts the value where the placeholder was, with the text around it', () => {
    expect(fillPhrase('Type {0} to confirm', [{ bold: 'ada' }])).toEqual([
      'Type ',
      { bold: 'ada' },
      ' to confirm',
    ]);
  });

  it('follows the order the phrase puts the placeholders in', () => {
    expect(fillPhrase('{1} does not match {0}', ['ada', 'adb'])).toEqual([
      'adb',
      ' does not match ',
      'ada',
    ]);
  });

  it('leaves a placeholder with no value as written', () => {
    expect(fillPhrase('{0} and {1}', ['a'])).toEqual(['a', ' and {1}']);
  });

  it('is the phrase itself when there is nothing to fill', () => {
    expect(fillPhrase('Plain', [])).toEqual(['Plain']);
  });
});
