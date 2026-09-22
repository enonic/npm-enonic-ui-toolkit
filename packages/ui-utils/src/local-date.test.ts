import { describe, expect, it } from 'vitest';

import { LocalDate } from './local-date';

describe('LocalDate', () => {
  it('reads and writes the ISO form with a 1-12 month', () => {
    const date = LocalDate.fromString('2015-04-07');
    expect(date.getYear()).toBe(2015);
    expect(date.getMonth()).toBe(3);
    expect(date.getDay()).toBe(7);
    expect(date.toString()).toBe('2015-04-07');
  });

  it('is built from and converts to a local Date at midnight', () => {
    const date = LocalDate.fromDate(new Date(2015, 3, 17, 15, 30));
    expect(date.toString()).toBe('2015-04-17');
    expect(date.toDate()).toEqual(new Date(2015, 3, 17));
  });

  it('validates the string strictly', () => {
    expect(LocalDate.isValidString('2015-04-17')).toBe(true);
    expect(LocalDate.isValidString('2015-4-17')).toBe(false);
    expect(LocalDate.isValidString('2015-02-29')).toBe(false);
    expect(LocalDate.isValidString('')).toBe(false);
    expect(() => LocalDate.fromString('2015-02-29')).toThrow('Cannot parse LocalDate');
  });

  it('refuses a day the month does not have', () => {
    expect(LocalDate.of(2016, 1, 29).toString()).toBe('2016-02-29');
    expect(() => LocalDate.of(2015, 1, 29)).toThrow('Invalid LocalDate');
  });

  it('compares by value and only with its own kind', () => {
    expect(LocalDate.fromString('2015-04-17').equals(LocalDate.of(2015, 3, 17))).toBe(true);
    expect(LocalDate.fromString('2015-04-17').equals(LocalDate.of(2015, 3, 18))).toBe(false);
    expect(LocalDate.fromString('2015-04-17').equals('2015-04-17')).toBe(false);
  });
});
