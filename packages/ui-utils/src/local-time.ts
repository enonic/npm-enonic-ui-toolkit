import { pad } from './date';

/** A time of day with no date and no zone — XP's `LocalTime`, `06:00` or `06:00:30` on the wire. */
export class LocalTime {
  private readonly hours: number;
  private readonly minutes: number;
  private readonly seconds: number;

  private constructor(hours: number, minutes: number, seconds: number) {
    this.hours = hours;
    this.minutes = minutes;
    this.seconds = seconds;
  }

  static of(hours: number, minutes: number, seconds = 0): LocalTime {
    if (!inRange(hours, 24) || !inRange(minutes, 60) || !inRange(seconds, 60)) {
      throw new Error(`Invalid LocalTime: ${hours}:${minutes}:${seconds}`);
    }
    return new LocalTime(hours, minutes, seconds);
  }

  static fromDate(date: Date): LocalTime {
    return new LocalTime(date.getHours(), date.getMinutes(), date.getSeconds());
  }

  /** `12`, `1:19`, `21:05`, `6:7`, `15:9:8` — one or two digits each, seconds optional. */
  static isValidString(value: string): boolean {
    return /^(\d|[01]\d|2[0-3])(:(\d|[0-5]\d))?(:(\d|[0-5]\d))?$/.test(value);
  }

  static fromString(value: string): LocalTime {
    if (!LocalTime.isValidString(value)) {
      throw new Error(`Cannot parse LocalTime from string: ${value}`);
    }
    const [hours = 0, minutes = 0, seconds = 0] = value.split(':').map(Number);
    return new LocalTime(hours, minutes, seconds);
  }

  getHours(): number {
    return this.hours;
  }

  getMinutes(): number {
    return this.minutes;
  }

  getSeconds(): number {
    return this.seconds;
  }

  /** `06:00`, or `06:00:30` when there are seconds. */
  toString(): string {
    return `${pad(this.hours)}:${pad(this.minutes)}${this.seconds ? `:${pad(this.seconds)}` : ''}`;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof LocalTime &&
      other.hours === this.hours &&
      other.minutes === this.minutes &&
      other.seconds === this.seconds
    );
  }
}

function inRange(value: number, limit: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < limit;
}
