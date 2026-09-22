import type { OccurrencesJson } from '@enonic/ui-types';

/** How many times a form item may occur: a minimum, and a maximum where 0 means unbounded. */
export class Occurrences {
  private readonly minimum: number;
  private readonly maximum: number;

  private constructor(minimum: number, maximum: number) {
    this.minimum = minimum;
    this.maximum = maximum;
  }

  static minmax(minimum: number, maximum: number): Occurrences {
    return new Occurrences(minimum, maximum);
  }

  static min(minimum: number): Occurrences {
    return new Occurrences(minimum, 0);
  }

  static max(maximum: number): Occurrences {
    return new Occurrences(0, maximum);
  }

  static fromJson(json: OccurrencesJson): Occurrences {
    return new Occurrences(json.minimum, json.maximum);
  }

  getMinimum(): number {
    return this.minimum;
  }

  getMaximum(): number {
    return this.maximum;
  }

  required(): boolean {
    return this.minimum > 0;
  }

  multiple(): boolean {
    return this.maximum > 1 || this.maximum === 0;
  }

  minimumReached(count: number): boolean {
    return count >= this.minimum;
  }

  minimumBreached(count: number): boolean {
    return this.minimum !== 0 && count < this.minimum;
  }

  maximumReached(count: number): boolean {
    return this.maximum !== 0 && count >= this.maximum;
  }

  maximumBreached(count: number): boolean {
    return this.maximum !== 0 && count > this.maximum;
  }

  toJson(): OccurrencesJson {
    return { minimum: this.minimum, maximum: this.maximum };
  }

  equals(other: unknown): boolean {
    return (
      other instanceof Occurrences &&
      other.minimum === this.minimum &&
      other.maximum === this.maximum
    );
  }
}
