import { pad, parseDate } from './date';

/** A calendar date with no time and no zone — XP's `LocalDate`, `2015-04-17` on the wire. */
export class LocalDate {
  private readonly year: number;
  /** 0-11, as `Date` counts months. */
  private readonly month: number;
  private readonly day: number;

  private constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  /** The month is 0-11, as `Date` counts it. A day the month does not have is an error. */
  static of(year: number, month: number, day: number): LocalDate {
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      throw new Error(`Invalid LocalDate: ${year}-${month + 1}-${day}`);
    }
    return new LocalDate(year, month, day);
  }

  static fromDate(date: Date): LocalDate {
    return new LocalDate(date.getFullYear(), date.getMonth(), date.getDate());
  }

  static isValidString(value: string): boolean {
    return /^\d{4}-(0\d|1[0-2])-([0-2]\d|3[01])$/.test(value) && parseDate(value) != null;
  }

  /** From `2015-04-17`; anything else is an error. */
  static fromString(value: string): LocalDate {
    const date = LocalDate.isValidString(value) ? parseDate(value) : undefined;
    if (date == null) {
      throw new Error(`Cannot parse LocalDate from string: ${value}`);
    }
    return LocalDate.fromDate(date);
  }

  getYear(): number {
    return this.year;
  }

  /** 0-11. */
  getMonth(): number {
    return this.month;
  }

  getDay(): number {
    return this.day;
  }

  /** Midnight, local time. */
  toDate(): Date {
    return new Date(this.year, this.month, this.day);
  }

  /** `2015-04-17`. */
  toString(): string {
    return `${this.year}-${pad(this.month + 1)}-${pad(this.day)}`;
  }

  equals(other: unknown): boolean {
    return other instanceof LocalDate && other.toString() === this.toString();
  }
}
