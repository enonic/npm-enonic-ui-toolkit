import type {
  BinaryReference,
  DateTime,
  GeoPoint,
  Link,
  LocalDate,
  LocalDateTime,
  LocalTime,
  Reference,
} from '@enonic/ui-utils';

import type { PropertySet } from './property-set';
import type { ValueType } from './value-type';

export type ValueData =
  | string
  | number
  | boolean
  | PropertySet
  | Reference
  | BinaryReference
  | GeoPoint
  | LocalDate
  | DateTime
  | LocalDateTime
  | LocalTime
  | Link;

/**
 * A typed, immutable value: what a `Property` holds. The typed getters answer `undefined` for the
 * null value and trust the type otherwise — `getLocalDate()` on a `String` value is a programming
 * error, not something checked here.
 */
export class Value {
  private readonly type: ValueType;
  private readonly value: ValueData | undefined;

  constructor(value: ValueData | null | undefined, type: ValueType) {
    if (value != null && !type.isValid(value)) {
      throw new Error(`Invalid value for type ${type.toString()}: ${JSON.stringify(value)}`);
    }
    this.value = value ?? undefined;
    this.type = type;
  }

  getType(): ValueType {
    return this.type;
  }

  isNull(): boolean {
    return this.value === undefined;
  }

  isNotNull(): boolean {
    return this.value !== undefined;
  }

  getObject(): ValueData | undefined {
    return this.value;
  }

  getString(): string | undefined {
    return this.isNull() ? undefined : this.type.valueToString(this);
  }

  /** The nested set, when this is a non-null value of type `PropertySet`. */
  getPropertySet(): PropertySet | undefined {
    return this.type.getName() === 'PropertySet'
      ? (this.value as PropertySet | undefined)
      : undefined;
  }

  getBoolean(): boolean | undefined {
    return this.isNull() ? undefined : this.type.valueToBoolean(this);
  }

  getLong(): number | undefined {
    return this.isNull() ? undefined : this.type.valueToNumber(this);
  }

  getDouble(): number | undefined {
    return this.isNull() ? undefined : this.type.valueToNumber(this);
  }

  getDateTime(): DateTime | undefined {
    return this.value as DateTime | undefined;
  }

  getLocalDate(): LocalDate | undefined {
    return this.value as LocalDate | undefined;
  }

  getLocalDateTime(): LocalDateTime | undefined {
    return this.value as LocalDateTime | undefined;
  }

  getLocalTime(): LocalTime | undefined {
    return this.value as LocalTime | undefined;
  }

  getGeoPoint(): GeoPoint | undefined {
    return this.value as GeoPoint | undefined;
  }

  getBinaryReference(): BinaryReference | undefined {
    return this.value as BinaryReference | undefined;
  }

  getReference(): Reference | undefined {
    return this.value as Reference | undefined;
  }

  getLink(): Link | undefined {
    return this.value as Link | undefined;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof Value) || !this.type.equals(other.type)) {
      return false;
    }
    if (this.isNull() || other.isNull()) {
      return this.isNull() && other.isNull();
    }
    return this.type.valueEquals(this.value, other.value);
  }

  clone(): Value {
    return new Value(this.value, this.type);
  }
}
