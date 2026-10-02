import { describe, expect, it } from 'vitest';

import { matchesExpected } from './gate-match';

describe('matchesExpected', () => {
  it('matches the name typed back, spaces around it forgiven', () => {
    expect(matchesExpected('  ada ', 'ada')).toBe(true);
    expect(matchesExpected('adb', 'ada')).toBe(false);
  });

  it('matches a count typed as digits', () => {
    expect(matchesExpected('3', 3)).toBe(true);
    expect(matchesExpected('03', 3)).toBe(false);
  });

  it('is never matched by nothing', () => {
    expect(matchesExpected('', '')).toBe(true);
    expect(matchesExpected('', 'ada')).toBe(false);
  });

  it('takes the caller’s normalization in place of its own', () => {
    expect(matchesExpected('ADA', 'ada', (typed) => typed.toLowerCase())).toBe(true);
  });
});
