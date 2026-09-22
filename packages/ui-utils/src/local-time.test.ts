import { describe, expect, it } from 'vitest';

import { LocalTime } from './local-time';

describe('LocalTime', () => {
  it('parses one or two digits and writes two, seconds only when present', () => {
    expect(LocalTime.fromString('6:7').toString()).toBe('06:07');
    expect(LocalTime.fromString('12').toString()).toBe('12:00');
    expect(LocalTime.fromString('15:9:8').toString()).toBe('15:09:08');
    expect(LocalTime.fromString('23:59:00').toString()).toBe('23:59');
  });

  it('exposes its parts', () => {
    const time = LocalTime.fromString('15:09:08');
    expect(time.getHours()).toBe(15);
    expect(time.getMinutes()).toBe(9);
    expect(time.getSeconds()).toBe(8);
    expect(LocalTime.fromString('15:09').getSeconds()).toBe(0);
  });

  it('is built from a Date', () => {
    expect(LocalTime.fromDate(new Date(2015, 3, 17, 6, 5, 9)).toString()).toBe('06:05:09');
  });

  it('validates the string and the parts', () => {
    expect(LocalTime.isValidString('24:00')).toBe(false);
    expect(LocalTime.isValidString('12:60')).toBe(false);
    expect(LocalTime.isValidString('')).toBe(false);
    expect(LocalTime.isValidString('12:00:00:00')).toBe(false);
    expect(() => LocalTime.fromString('25')).toThrow('Cannot parse LocalTime');
    expect(() => LocalTime.of(12, 60)).toThrow('Invalid LocalTime');
  });

  it('compares by value', () => {
    expect(LocalTime.of(6, 5).equals(LocalTime.fromString('6:05'))).toBe(true);
    expect(LocalTime.of(6, 5).equals(LocalTime.of(6, 5, 1))).toBe(false);
    expect(LocalTime.of(6, 5).equals('06:05')).toBe(false);
  });
});
