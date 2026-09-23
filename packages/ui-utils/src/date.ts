/**
 * Parsing and formatting of the ISO-like strings XP's forms use for dates and times — `2015-04-17`,
 * `06:00`, `2015-04-17 06:00`, `2015-04-17T06:00:30.250` — into JS `Date`s and back. Everything
 * here is local time; the instant with a `Z` is `DateTime`'s.
 */

export type TimeOfDay = {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  /** Milliseconds. */
  readonly fractions: number;
};

const DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/;

export function pad(num: number, length = 2): string {
  return String(num).padStart(length, '0');
}

export function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

/** `2010-01-01` from the date part of `date`, in local time. */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `10:55` or `10:55:00`. An hour or minute out of range answers an empty string. */
export function formatTime(hours: number, minutes: number, seconds?: number): string {
  if (
    !isValidHours(hours) ||
    !isValidMinutes(minutes) ||
    (seconds != null && !isValidMinutes(seconds))
  ) {
    return '';
  }
  return `${pad(hours)}:${pad(minutes)}${seconds ? `:${pad(seconds)}` : ''}`;
}

/** `10:55:00` from the time part of `date`, in local time. */
export function formatTimeOfDay(date: Date, includeSeconds = true): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}${includeSeconds ? `:${pad(date.getSeconds())}` : ''}`;
}

/** `2010-01-01 12:34:56` in local time. */
export function formatDateTime(date: Date, includeSeconds = true): string {
  return `${formatDate(date)} ${formatTimeOfDay(date, includeSeconds)}`;
}

/**
 * A local `Date` at midnight from `2010-01-01`; the month is 1-12. A day the month does not have
 * — `2015-02-29` — is not silently rolled over but rejected.
 */
export function parseDate(value: string): Date | undefined {
  const match = DATE_PATTERN.exec(value.trim());
  if (match == null) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : undefined;
}

/** `06:00`, `06:00:30` or `06:00:30.250`, two digits each. */
export function parseTime(value: string): TimeOfDay | undefined {
  const match = TIME_PATTERN.exec(value.trim());
  if (match == null) {
    return undefined;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] == null ? 0 : Number(match[3]);
  const fractions = match[4] == null ? 0 : Number(match[4].slice(0, 3).padEnd(3, '0'));
  if (!isValidHours(hours) || !isValidMinutes(minutes) || !isValidMinutes(seconds)) {
    return undefined;
  }
  return { hours, minutes, seconds, fractions };
}

/**
 * A local `Date` from a date and a time joined by `separator`: `2015-04-17 06:00` as a form shows
 * it, or `2015-04-17T06:00:30.250` as XP stores it.
 */
export function parseDateTime(value: string, separator = ' '): Date | undefined {
  const parts = value.trim().split(separator);
  if (parts.length !== 2 || parts[0] == null || parts[1] == null) {
    return undefined;
  }
  const date = parseDate(parts[0]);
  const time = parseTime(parts[1]);
  if (date == null || time == null) {
    return undefined;
  }
  date.setHours(time.hours, time.minutes, time.seconds, time.fractions);
  return date;
}

/** Today at the given time, in local time; `undefined` when the time is out of range. */
export function dateFromTime(hours: number, minutes: number, seconds = 0): Date | undefined {
  if (!isValidHours(hours) || !isValidMinutes(minutes) || !isValidMinutes(seconds)) {
    return undefined;
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
}

/** `daysInMonth(2015, 1)` is 28; the month is 0-11, as `Date` counts it. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isValidHours(hours: number): boolean {
  return Number.isInteger(hours) && hours >= 0 && hours < 24;
}

function isValidMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes < 60;
}
