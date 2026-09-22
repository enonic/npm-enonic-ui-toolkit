import { describe, expect, it } from 'vitest';

import { DateTime } from './date-time';

describe('DateTime', () => {
  it('round-trips an instant in UTC', () => {
    expect(DateTime.fromString('2015-04-17T06:00Z').toString()).toBe('2015-04-17T06:00:00Z');
    expect(DateTime.fromString('2015-04-17T06:00:30.250Z').toString()).toBe(
      '2015-04-17T06:00:30.250Z',
    );
  });

  it('reads its fields in UTC whatever the local zone', () => {
    const value = DateTime.fromDate(new Date(Date.UTC(2015, 3, 17, 23, 5, 9, 7)));
    expect(value.getYear()).toBe(2015);
    expect(value.getMonth()).toBe(3);
    expect(value.getDay()).toBe(17);
    expect(value.getHours()).toBe(23);
    expect(value.getMinutes()).toBe(5);
    expect(value.getSeconds()).toBe(9);
    expect(value.getFractions()).toBe(7);
    expect(value.toString()).toBe('2015-04-17T23:05:09.007Z');
  });

  it('converts to a Date of the same instant, and defensively copies', () => {
    const date = new Date(Date.UTC(2015, 3, 17, 6));
    const value = DateTime.fromDate(date);
    date.setUTCFullYear(2000);
    expect(value.toDate().getTime()).toBe(Date.UTC(2015, 3, 17, 6));
  });

  it('accepts only a UTC instant with a Z', () => {
    expect(DateTime.isValidString('2015-04-17T06:00Z')).toBe(true);
    expect(DateTime.isValidString('2015-04-17T06:00')).toBe(false);
    expect(DateTime.isValidString('2015-04-17T06:00+02:00')).toBe(false);
    expect(DateTime.isValidString('2015-02-30T06:00Z')).toBe(false);
    expect(() => DateTime.fromString('2015-04-17')).toThrow('Cannot parse DateTime');
    expect(() => DateTime.fromDate(new Date('nope'))).toThrow('Invalid DateTime');
  });

  it('compares by instant', () => {
    expect(
      DateTime.fromString('2015-04-17T06:00Z').equals(
        DateTime.fromString('2015-04-17T06:00:00.000Z'),
      ),
    ).toBe(true);
    expect(
      DateTime.fromString('2015-04-17T06:00Z').equals(DateTime.fromString('2015-04-17T06:00:01Z')),
    ).toBe(false);
    expect(DateTime.fromString('2015-04-17T06:00Z').equals('2015-04-17T06:00Z')).toBe(false);
  });
});
