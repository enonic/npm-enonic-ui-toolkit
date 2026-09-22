import type { ValueTypeName } from '@enonic/ui-types';
import {
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
import { Value, type ValueData } from './value';
import { jsonScalarToString, ValueType } from './value-type';

const isBlank = (value: string): boolean => value.trim() === '';

const equalsByValue = (a: unknown, b: unknown): boolean =>
  typeof a === 'object' && a !== null && 'equals' in a && typeof a.equals === 'function'
    ? Boolean(a.equals(b))
    : a === b;

class ValueTypeString extends ValueType {
  constructor(name: 'String' | 'Xml' = 'String') {
    super(name);
  }

  override isValid(value: unknown): boolean {
    return typeof value === 'string';
  }

  override newValue(value: string): Value {
    return value ? new Value(value, this) : this.newNullValue();
  }

  override valueEquals(a: unknown, b: unknown): boolean {
    return a === b;
  }

  override toJsonValue(value: Value): unknown {
    return value.getString() ? value.getObject() : null;
  }
}

abstract class ValueTypeNumber extends ValueType {
  override isConvertible(value: string): boolean {
    return !isBlank(value) && this.isValid(Number(value));
  }

  override newValue(value: string): Value {
    return this.isConvertible(value) ? new Value(Number(value), this) : this.newNullValue();
  }

  override fromJsonValue(json: unknown): Value {
    if (json == null) {
      return this.newNullValue();
    }
    const num = typeof json === 'number' ? json : Number(json);
    return this.isValid(num) ? new Value(num, this) : this.newNullValue();
  }

  override valueToString(value: Value): string {
    return String(value.getObject());
  }

  override valueEquals(a: unknown, b: unknown): boolean {
    return a === b;
  }
}

class ValueTypeLong extends ValueTypeNumber {
  constructor() {
    super('Long');
  }

  override isValid(value: unknown): boolean {
    return typeof value === 'number' && Number.isInteger(value);
  }
}

class ValueTypeDouble extends ValueTypeNumber {
  constructor() {
    super('Double');
  }

  override isValid(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value);
  }
}

class ValueTypeBoolean extends ValueType {
  constructor() {
    super('Boolean');
  }

  override isValid(value: unknown): boolean {
    return typeof value === 'boolean';
  }

  override isConvertible(value: string): boolean {
    return value === 'true' || value === 'false';
  }

  /** A string that is not `true` or `false` is `false`, as the checkbox has always read it. */
  override newValue(value: string): Value {
    return this.newBoolean(value === 'true');
  }

  newBoolean(value: boolean): Value {
    return new Value(value, this);
  }

  override fromJsonValue(json: unknown): Value {
    if (json == null) {
      return this.newNullValue();
    }
    return typeof json === 'boolean'
      ? new Value(json, this)
      : this.newValue(jsonScalarToString(json) ?? '');
  }

  override valueEquals(a: unknown, b: unknown): boolean {
    return a === b;
  }
}

/** A type whose values are one of the classes from `@enonic/ui-utils`, parsed from their string. */
abstract class ValueTypeObject<
  T extends ValueData & { equals(other: unknown): boolean },
> extends ValueType {
  protected abstract instanceOf(value: unknown): value is T;

  protected abstract parse(value: string): T | undefined;

  override isValid(value: unknown): boolean {
    return this.instanceOf(value);
  }

  override isConvertible(value: string): boolean {
    return !isBlank(value) && this.parse(value) !== undefined;
  }

  override newValue(value: string): Value {
    const parsed = isBlank(value) ? undefined : this.parse(value);
    return parsed === undefined ? this.newNullValue() : new Value(parsed, this);
  }

  override valueToString(value: Value): string {
    return String(value.getObject());
  }

  override toJsonValue(value: Value): unknown {
    return value.isNull() ? null : String(value.getObject());
  }

  override valueEquals(a: unknown, b: unknown): boolean {
    return equalsByValue(a, b);
  }
}

class ValueTypeLocalDate extends ValueTypeObject<LocalDate> {
  constructor() {
    super('LocalDate');
  }

  protected override instanceOf(value: unknown): value is LocalDate {
    return value instanceof LocalDate;
  }

  protected override parse(value: string): LocalDate | undefined {
    return LocalDate.isValidString(value) ? LocalDate.fromString(value) : undefined;
  }
}

class ValueTypeLocalTime extends ValueTypeObject<LocalTime> {
  constructor() {
    super('LocalTime');
  }

  protected override instanceOf(value: unknown): value is LocalTime {
    return value instanceof LocalTime;
  }

  protected override parse(value: string): LocalTime | undefined {
    return LocalTime.isValidString(value) ? LocalTime.fromString(value) : undefined;
  }
}

class ValueTypeLocalDateTime extends ValueTypeObject<LocalDateTime> {
  constructor() {
    super('LocalDateTime');
  }

  protected override instanceOf(value: unknown): value is LocalDateTime {
    return value instanceof LocalDateTime;
  }

  protected override parse(value: string): LocalDateTime | undefined {
    return LocalDateTime.isValidString(value) ? LocalDateTime.fromString(value) : undefined;
  }
}

class ValueTypeDateTime extends ValueTypeObject<DateTime> {
  constructor() {
    super('DateTime');
  }

  protected override instanceOf(value: unknown): value is DateTime {
    return value instanceof DateTime;
  }

  protected override parse(value: string): DateTime | undefined {
    return DateTime.isValidString(value) ? DateTime.fromString(value) : undefined;
  }
}

class ValueTypeGeoPoint extends ValueTypeObject<GeoPoint> {
  constructor() {
    super('GeoPoint');
  }

  protected override instanceOf(value: unknown): value is GeoPoint {
    return value instanceof GeoPoint;
  }

  protected override parse(value: string): GeoPoint | undefined {
    return GeoPoint.isValidString(value) ? GeoPoint.fromString(value) : undefined;
  }
}

class ValueTypeReference extends ValueTypeObject<Reference> {
  constructor() {
    super('Reference');
  }

  protected override instanceOf(value: unknown): value is Reference {
    return value instanceof Reference;
  }

  protected override parse(value: string): Reference | undefined {
    return new Reference(value);
  }
}

class ValueTypeBinaryReference extends ValueTypeObject<BinaryReference> {
  constructor() {
    super('BinaryReference');
  }

  protected override instanceOf(value: unknown): value is BinaryReference {
    return value instanceof BinaryReference;
  }

  protected override parse(value: string): BinaryReference | undefined {
    return new BinaryReference(value);
  }
}

class ValueTypeLink extends ValueTypeObject<Link> {
  constructor() {
    super('Link');
  }

  protected override instanceOf(value: unknown): value is Link {
    return value instanceof Link;
  }

  protected override parse(value: string): Link | undefined {
    return new Link(value);
  }
}

/** The type of a nested set. Recognized by shape, so this module need not import `PropertySet`. */
export class ValueTypePropertySet extends ValueType {
  constructor() {
    super('PropertySet');
  }

  override isValid(value: unknown): boolean {
    return this.isPropertySet(value);
  }

  isPropertySet(value: unknown): value is PropertySet {
    return (
      typeof value === 'object' &&
      value !== null &&
      'getType' in value &&
      typeof value.getType === 'function' &&
      value.getType() === this
    );
  }

  override isConvertible(): boolean {
    return false;
  }

  override newValue(): Value {
    throw new Error('A value of type PropertySet cannot be created from a string');
  }

  override fromJsonValue(): Value {
    throw new Error('A value of type PropertySet is read by PropertyArray.fromJson');
  }

  override valueToString(): string {
    throw new Error('A value of type PropertySet cannot be made into a string');
  }

  override toJsonValue(value: Value): unknown {
    return value.isNull() ? null : value.getPropertySet()?.toJson();
  }

  override valueEquals(a: unknown, b: unknown): boolean {
    return equalsByValue(a, b);
  }
}

/** One instance per value type, named as XP's `ValueTypes` names them. */
export const ValueTypes = {
  DATA: new ValueTypePropertySet(),
  STRING: new ValueTypeString('String'),
  XML: new ValueTypeString('Xml'),
  LOCAL_DATE: new ValueTypeLocalDate(),
  LOCAL_TIME: new ValueTypeLocalTime(),
  LOCAL_DATE_TIME: new ValueTypeLocalDateTime(),
  DATE_TIME: new ValueTypeDateTime(),
  LONG: new ValueTypeLong(),
  BOOLEAN: new ValueTypeBoolean(),
  DOUBLE: new ValueTypeDouble(),
  GEO_POINT: new ValueTypeGeoPoint(),
  REFERENCE: new ValueTypeReference(),
  BINARY_REFERENCE: new ValueTypeBinaryReference(),
  LINK: new ValueTypeLink(),

  get ALL(): readonly ValueType[] {
    return ALL;
  },

  fromName(name: string): ValueType {
    const type = ALL.find((candidate) => candidate.getName() === name);
    if (type === undefined) {
      throw new Error(`Unknown ValueType: ${name}`);
    }
    return type;
  },

  isName(name: string): name is ValueTypeName {
    return ALL.some((candidate) => candidate.getName() === name);
  },
};

const ALL: readonly ValueType[] = [
  ValueTypes.DATA,
  ValueTypes.STRING,
  ValueTypes.XML,
  ValueTypes.LOCAL_DATE,
  ValueTypes.LOCAL_TIME,
  ValueTypes.LOCAL_DATE_TIME,
  ValueTypes.DATE_TIME,
  ValueTypes.LONG,
  ValueTypes.BOOLEAN,
  ValueTypes.DOUBLE,
  ValueTypes.GEO_POINT,
  ValueTypes.REFERENCE,
  ValueTypes.BINARY_REFERENCE,
  ValueTypes.LINK,
];
