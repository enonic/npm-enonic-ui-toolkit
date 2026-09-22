import { describe, expect, it } from 'vitest';

import { LocalDateTime } from './local-date-time';

describe('LocalDateTime', () => {
  it('round-trips the wire form, seconds always and fractions when non-zero', () => {
    expect(LocalDateTime.fromString('2015-04-17T06:00').toString()).toBe('2015-04-17T06:00:00');
    expect(LocalDateTime.fromString('2015-04-17T06:00:30').toString()).toBe('2015-04-17T06:00:30');
    expect(LocalDateTime.fromString('2015-04-17T06:00:30.25').toString()).toBe(
      '2015-04-17T06:00:30.250',
    );
    expect(LocalDateTime.fromString('2015-04-17T06:00:00.007').toString()).toBe(
      '2015-04-17T06:00:00.007',
    );
  });

  it('keeps fractions without seconds, unlike its predecessor', () => {
    const value = LocalDateTime.fromDate(new Date(2015, 3, 17, 6, 0, 0, 500));
    expect(value.getSeconds()).toBe(0);
    expect(value.getFractions()).toBe(500);
    expect(value.toString()).toBe('2015-04-17T06:00:00.500');
  });

  it('converts to and from a local Date exactly', () => {
    const date = new Date(2015, 3, 17, 6, 5, 9, 250);
    const value = LocalDateTime.fromDate(date);
    expect(value.toDate()).toEqual(date);
    expect(value.getYear()).toBe(2015);
    expect(value.getMonth()).toBe(3);
    expect(value.getDay()).toBe(17);
    expect(value.getHours()).toBe(6);
    expect(value.getMinutes()).toBe(5);
    expect(value.dateToString()).toBe('2015-04-17');
    expect(value.timeToString()).toBe('06:05:09.250');
  });

  it('validates the string and the fields', () => {
    expect(LocalDateTime.isValidString('2015-04-17T06:00')).toBe(true);
    expect(LocalDateTime.isValidString('2015-04-17 06:00')).toBe(false);
    expect(LocalDateTime.isValidString('2015-04-17T06:00Z')).toBe(false);
    expect(LocalDateTime.isValidString('2015-02-29T06:00')).toBe(false);
    expect(() => LocalDateTime.fromString('2015-04-17')).toThrow('Cannot parse LocalDateTime');
    expect(() => LocalDateTime.of({ year: 2015, month: 1, day: 29, hours: 0, minutes: 0 })).toThrow(
      'Invalid LocalDateTime',
    );
    expect(
      LocalDateTime.of({ year: 2015, month: 3, day: 17, hours: 6, minutes: 0 }).toString(),
    ).toBe('2015-04-17T06:00:00');
  });

  it('compares by value', () => {
    const a = LocalDateTime.fromString('2015-04-17T06:00');
    expect(a.equals(LocalDateTime.fromString('2015-04-17T06:00:00'))).toBe(true);
    expect(a.equals(LocalDateTime.fromString('2015-04-17T06:00:01'))).toBe(false);
    expect(a.equals(a.toString())).toBe(false);
  });
});
