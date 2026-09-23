import { describe, expect, it } from 'vitest';

import {
  dateFromTime,
  daysInMonth,
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeOfDay,
  isValidDate,
  pad,
  parseDate,
  parseDateTime,
  parseTime,
} from './date';

describe('pad', () => {
  it('pads to two digits by default and to the length asked', () => {
    expect(pad(7)).toBe('07');
    expect(pad(12)).toBe('12');
    expect(pad(5, 3)).toBe('005');
    expect(pad(1234)).toBe('1234');
  });
});

describe('isValidDate', () => {
  it('tells a real date from an invalid one', () => {
    expect(isValidDate(new Date(2015, 3, 17))).toBe(true);
    expect(isValidDate(new Date('nope'))).toBe(false);
  });
});

describe('formatting', () => {
  const date = new Date(2015, 3, 17, 6, 5, 9);

  it('formats the date part with a 1-12 month', () => {
    expect(formatDate(date)).toBe('2015-04-17');
  });

  it('formats a time of day, with and without seconds', () => {
    expect(formatTimeOfDay(date)).toBe('06:05:09');
    expect(formatTimeOfDay(date, false)).toBe('06:05');
    expect(formatDateTime(date)).toBe('2015-04-17 06:05:09');
    expect(formatDateTime(date, false)).toBe('2015-04-17 06:05');
  });

  it('formats hours and minutes, seconds only when non-zero', () => {
    expect(formatTime(6, 5)).toBe('06:05');
    expect(formatTime(6, 5, 0)).toBe('06:05');
    expect(formatTime(23, 59, 9)).toBe('23:59:09');
  });

  it('answers an empty string for a time out of range', () => {
    expect(formatTime(24, 0)).toBe('');
    expect(formatTime(0, 60)).toBe('');
    expect(formatTime(0, 0, 60)).toBe('');
    expect(formatTime(1.5, 0)).toBe('');
  });
});

describe('parseDate', () => {
  it('parses an ISO-like date into local midnight', () => {
    expect(parseDate('2015-04-17')).toEqual(new Date(2015, 3, 17));
    expect(parseDate(' 2015-4-7 ')).toEqual(new Date(2015, 3, 7));
  });

  it('rejects a day the month does not have instead of rolling over', () => {
    expect(parseDate('2015-02-29')).toBeUndefined();
    expect(parseDate('2016-02-29')).toEqual(new Date(2016, 1, 29));
    expect(parseDate('2015-13-01')).toBeUndefined();
  });

  it('rejects anything that is not a date', () => {
    expect(parseDate('')).toBeUndefined();
    expect(parseDate('17.04.2015')).toBeUndefined();
    expect(parseDate('2015-04-17T06:00')).toBeUndefined();
  });
});

describe('parseTime', () => {
  it('parses hours and minutes, with optional seconds and fractions', () => {
    expect(parseTime('06:05')).toEqual({ hours: 6, minutes: 5, seconds: 0, fractions: 0 });
    expect(parseTime('23:59:09')).toEqual({ hours: 23, minutes: 59, seconds: 9, fractions: 0 });
    expect(parseTime('23:59:09.25')).toEqual({
      hours: 23,
      minutes: 59,
      seconds: 9,
      fractions: 250,
    });
    expect(parseTime('00:00:00.007')).toEqual({ hours: 0, minutes: 0, seconds: 0, fractions: 7 });
    expect(parseTime('12:00:00.123456')).toEqual({
      hours: 12,
      minutes: 0,
      seconds: 0,
      fractions: 123,
    });
  });

  it('insists on two digits and a valid range', () => {
    expect(parseTime('6:05')).toBeUndefined();
    expect(parseTime('24:00')).toBeUndefined();
    expect(parseTime('12:60')).toBeUndefined();
    expect(parseTime('12:00:60')).toBeUndefined();
    expect(parseTime('')).toBeUndefined();
  });
});

describe('parseDateTime', () => {
  it('parses the form of a form field and the form XP stores', () => {
    expect(parseDateTime('2015-04-17 06:00')).toEqual(new Date(2015, 3, 17, 6, 0));
    expect(parseDateTime('2015-04-17T06:00:30.250', 'T')).toEqual(
      new Date(2015, 3, 17, 6, 0, 30, 250),
    );
  });

  it('rejects a missing half or a wrong separator', () => {
    expect(parseDateTime('2015-04-17')).toBeUndefined();
    expect(parseDateTime('2015-04-17T06:00')).toBeUndefined();
    expect(parseDateTime('2015-04-17 06:00 extra')).toBeUndefined();
    expect(parseDateTime('2015-02-29 06:00')).toBeUndefined();
  });
});

describe('dateFromTime', () => {
  it('is today at the given time', () => {
    const date = dateFromTime(6, 5, 9);
    const now = new Date();
    expect(date).toBeDefined();
    expect(formatDate(date as Date)).toBe(formatDate(now));
    expect(formatTimeOfDay(date as Date)).toBe('06:05:09');
  });

  it('is undefined for a time out of range', () => {
    expect(dateFromTime(24, 0)).toBeUndefined();
    expect(dateFromTime(0, 60)).toBeUndefined();
  });
});

describe('daysInMonth', () => {
  it('knows leap years', () => {
    expect(daysInMonth(2015, 1)).toBe(28);
    expect(daysInMonth(2016, 1)).toBe(29);
    expect(daysInMonth(2015, 11)).toBe(31);
  });
});
