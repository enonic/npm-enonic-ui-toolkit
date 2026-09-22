import { describe, expect, it } from 'vitest';

import { add, isRelativeTime, parseRelativeTime } from './relative-time';

describe('parseRelativeTime', () => {
  const now = new Date(2015, 0, 31, 12, 30, 15, 500);

  it('is now for nothing, an empty string and the word', () => {
    expect(parseRelativeTime(undefined, now)).toEqual(now);
    expect(parseRelativeTime('', now)).toEqual(now);
    expect(parseRelativeTime(' now ', now)).toEqual(now);
    expect(parseRelativeTime('now', now)).not.toBe(now);
  });

  it('applies signed offsets in every unit, long and short', () => {
    expect(parseRelativeTime('+1d', now)).toEqual(new Date(2015, 1, 1, 12, 30, 15, 500));
    expect(parseRelativeTime('-2h', now)).toEqual(new Date(2015, 0, 31, 10, 30, 15, 500));
    expect(parseRelativeTime('+1w', now)).toEqual(new Date(2015, 1, 7, 12, 30, 15, 500));
    expect(parseRelativeTime('+30m -15s', now)).toEqual(new Date(2015, 0, 31, 13, 0, 0, 500));
    expect(parseRelativeTime('+500ms', now)).toEqual(new Date(2015, 0, 31, 12, 30, 16, 0));
    expect(parseRelativeTime('+1year -1month', now)).toEqual(
      new Date(2015, 11, 31, 12, 30, 15, 500),
    );
  });

  it('clamps the day when the target month is shorter', () => {
    expect(parseRelativeTime('+1M', now)).toEqual(new Date(2015, 1, 28, 12, 30, 15, 500));
    expect(parseRelativeTime('+1y', new Date(2016, 1, 29))).toEqual(new Date(2017, 1, 28));
    expect(parseRelativeTime('-1M', new Date(2015, 2, 31))).toEqual(new Date(2015, 1, 28));
  });

  it('ignores a token it does not understand', () => {
    expect(parseRelativeTime('+1d tomorrow 5d +2foo', now)).toEqual(
      new Date(2015, 1, 1, 12, 30, 15, 500),
    );
  });

  it('never mutates the date it was given', () => {
    const before = now.getTime();
    parseRelativeTime('+1y +1M +1d +1h', now);
    expect(now.getTime()).toBe(before);
  });
});

describe('isRelativeTime', () => {
  it('accepts now and offsets, rejects anything else', () => {
    expect(isRelativeTime('now')).toBe(true);
    expect(isRelativeTime('')).toBe(true);
    expect(isRelativeTime('+1d -2h')).toBe(true);
    expect(isRelativeTime('now +1d')).toBe(true);
    expect(isRelativeTime('2015-04-17')).toBe(false);
    expect(isRelativeTime('+1d tomorrow')).toBe(false);
  });
});

describe('add', () => {
  it('is calendar arithmetic for days and instant arithmetic for hours', () => {
    const date = new Date(2015, 0, 31, 23, 0);
    expect(add(date, 1, 'day')).toEqual(new Date(2015, 1, 1, 23, 0));
    expect(add(date, 2, 'hour').getTime()).toBe(date.getTime() + 2 * 3_600_000);
    expect(add(date, -1, 'year')).toEqual(new Date(2014, 0, 31, 23, 0));
  });
});
