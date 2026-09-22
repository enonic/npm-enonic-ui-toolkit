/**
 * The relative time an XP form's date and time inputs accept as a default: `now`, or `now` with
 * offsets — `+1d`, `-2h`, `+1y -1M +30m` — one sign, a count and a unit per token, separated by
 * whitespace. A token that is not one of those is ignored.
 *
 * Adding a month or a year keeps the day where the target month has it and clamps otherwise:
 * `+1M` from January 31 is February 28. Days and weeks move the calendar date, so a DST change on
 * the way keeps the wall-clock time; hours and smaller move the instant.
 */

export type RelativeTimeUnit =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond';

const UNITS: Readonly<Record<string, RelativeTimeUnit>> = {
  y: 'year',
  year: 'year',
  years: 'year',
  M: 'month',
  month: 'month',
  months: 'month',
  w: 'week',
  week: 'week',
  weeks: 'week',
  d: 'day',
  day: 'day',
  days: 'day',
  h: 'hour',
  hour: 'hour',
  hours: 'hour',
  m: 'minute',
  minute: 'minute',
  minutes: 'minute',
  s: 'second',
  second: 'second',
  seconds: 'second',
  ms: 'millisecond',
  millisecond: 'millisecond',
  milliseconds: 'millisecond',
};

const TOKEN = /^([+-])(\d+)([a-zA-Z]+)$/;

/** Whether `expression` is `now` or offsets from it; an empty expression counts as `now`. */
export function isRelativeTime(expression: string): boolean {
  const trimmed = expression.trim();
  if (trimmed === '' || trimmed === 'now') {
    return true;
  }
  return trimmed.split(/\s+/).every((token) => token === 'now' || TOKEN.test(token));
}

/** The `Date` the expression names, relative to `now`; the empty expression is `now` itself. */
export function parseRelativeTime(expression: string | undefined, now = new Date()): Date {
  let date = new Date(now.getTime());
  if (expression == null) {
    return date;
  }
  for (const token of expression.trim().split(/\s+/)) {
    const match = TOKEN.exec(token);
    const unit = match?.[3] == null ? undefined : UNITS[match[3]];
    if (match == null || unit == null) {
      continue;
    }
    const amount = Number(match[2]) * (match[1] === '-' ? -1 : 1);
    date = add(date, amount, unit);
  }
  return date;
}

export function add(date: Date, amount: number, unit: RelativeTimeUnit): Date {
  const next = new Date(date.getTime());
  switch (unit) {
    case 'year':
    case 'month': {
      const months = unit === 'year' ? amount * 12 : amount;
      const day = next.getDate();
      next.setDate(1);
      next.setMonth(next.getMonth() + months);
      next.setDate(Math.min(day, daysIn(next)));
      return next;
    }
    case 'week':
      next.setDate(next.getDate() + amount * 7);
      return next;
    case 'day':
      next.setDate(next.getDate() + amount);
      return next;
    case 'hour':
      return new Date(next.getTime() + amount * 3_600_000);
    case 'minute':
      return new Date(next.getTime() + amount * 60_000);
    case 'second':
      return new Date(next.getTime() + amount * 1000);
    case 'millisecond':
      return new Date(next.getTime() + amount);
  }
}

function daysIn(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
