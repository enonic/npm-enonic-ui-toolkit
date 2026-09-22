import { pad } from './date';

const PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

/**
 * An instant — XP's `DateTime`, `2015-04-17T06:00:30.250Z` on the wire. Its fields are UTC; it
 * converts to and from a `Date` exactly.
 */
export class DateTime {
  private readonly date: Date;

  private constructor(date: Date) {
    this.date = date;
  }

  static fromDate(date: Date): DateTime {
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid DateTime: the date is not a time');
    }
    return new DateTime(new Date(date.getTime()));
  }

  /** A day the month does not have is rejected, where `new Date` would roll it over. */
  static isValidString(value: string): boolean {
    if (!PATTERN.test(value)) {
      return false;
    }
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value.slice(0, 10));
  }

  /** From an ISO 8601 instant in UTC, with the `Z`; anything else is an error. */
  static fromString(value: string): DateTime {
    if (!DateTime.isValidString(value)) {
      throw new Error(`Cannot parse DateTime from string: ${value}`);
    }
    return new DateTime(new Date(value));
  }

  getYear(): number {
    return this.date.getUTCFullYear();
  }

  /** 0-11. */
  getMonth(): number {
    return this.date.getUTCMonth();
  }

  getDay(): number {
    return this.date.getUTCDate();
  }

  getHours(): number {
    return this.date.getUTCHours();
  }

  getMinutes(): number {
    return this.date.getUTCMinutes();
  }

  getSeconds(): number {
    return this.date.getUTCSeconds();
  }

  /** Milliseconds. */
  getFractions(): number {
    return this.date.getUTCMilliseconds();
  }

  /** `2015-04-17`, in UTC. */
  dateToString(): string {
    return `${this.getYear()}-${pad(this.getMonth() + 1)}-${pad(this.getDay())}`;
  }

  /** `06:00:30`, with `.250` when there are fractions, in UTC. */
  timeToString(): string {
    const fractions = this.getFractions();
    return `${pad(this.getHours())}:${pad(this.getMinutes())}:${pad(this.getSeconds())}${fractions ? `.${pad(fractions, 3)}` : ''}`;
  }

  toString(): string {
    return `${this.dateToString()}T${this.timeToString()}Z`;
  }

  toDate(): Date {
    return new Date(this.date.getTime());
  }

  equals(other: unknown): boolean {
    return other instanceof DateTime && other.date.getTime() === this.date.getTime();
  }
}
