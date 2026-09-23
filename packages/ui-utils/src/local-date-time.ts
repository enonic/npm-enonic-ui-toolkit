import { pad, parseDateTime } from './date';

export type LocalDateTimeFields = {
  readonly year: number;
  /** 0-11, as `Date` counts months. */
  readonly month: number;
  readonly day: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds?: number;
  /** Milliseconds. */
  readonly fractions?: number;
};

const PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * A date and time with no zone — XP's `LocalDateTime`, `2015-04-17T06:00:30.250` on the wire. It
 * converts to and from a `Date` as local time.
 */
export class LocalDateTime {
  private readonly fields: Required<LocalDateTimeFields>;

  private constructor(fields: Required<LocalDateTimeFields>) {
    this.fields = fields;
  }

  static of(fields: LocalDateTimeFields): LocalDateTime {
    const full = { seconds: 0, fractions: 0, ...fields };
    const date = toDate(full);
    if (
      date.getFullYear() !== full.year ||
      date.getMonth() !== full.month ||
      date.getDate() !== full.day ||
      date.getHours() !== full.hours ||
      date.getMinutes() !== full.minutes ||
      date.getSeconds() !== full.seconds ||
      date.getMilliseconds() !== full.fractions
    ) {
      throw new Error(`Invalid LocalDateTime: ${JSON.stringify(fields)}`);
    }
    return new LocalDateTime(full);
  }

  static fromDate(date: Date): LocalDateTime {
    return new LocalDateTime({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      fractions: date.getMilliseconds(),
    });
  }

  static isValidString(value: string): boolean {
    return PATTERN.test(value) && parseDateTime(value, 'T') != null;
  }

  /** From `2015-04-17T06:00`, with optional seconds and fractions; anything else is an error. */
  static fromString(value: string): LocalDateTime {
    const date = PATTERN.test(value) ? parseDateTime(value, 'T') : undefined;
    if (date == null) {
      throw new Error(`Cannot parse LocalDateTime from string: ${value}`);
    }
    return LocalDateTime.fromDate(date);
  }

  getYear(): number {
    return this.fields.year;
  }

  /** 0-11. */
  getMonth(): number {
    return this.fields.month;
  }

  getDay(): number {
    return this.fields.day;
  }

  getHours(): number {
    return this.fields.hours;
  }

  getMinutes(): number {
    return this.fields.minutes;
  }

  getSeconds(): number {
    return this.fields.seconds;
  }

  /** Milliseconds. */
  getFractions(): number {
    return this.fields.fractions;
  }

  /** `2015-04-17`. */
  dateToString(): string {
    const { year, month, day } = this.fields;
    return `${year}-${pad(month + 1)}-${pad(day)}`;
  }

  /** `06:00:30`, with `.250` when there are fractions. */
  timeToString(): string {
    const { hours, minutes, seconds, fractions } = this.fields;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${fractions ? `.${pad(fractions, 3)}` : ''}`;
  }

  toString(): string {
    return `${this.dateToString()}T${this.timeToString()}`;
  }

  /** The same wall-clock time as a local `Date`. */
  toDate(): Date {
    return toDate(this.fields);
  }

  equals(other: unknown): boolean {
    return other instanceof LocalDateTime && other.toString() === this.toString();
  }
}

function toDate(f: Required<LocalDateTimeFields>): Date {
  return new Date(f.year, f.month, f.day, f.hours, f.minutes, f.seconds, f.fractions);
}
