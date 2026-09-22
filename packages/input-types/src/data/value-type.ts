import type { ValueTypeName } from '@enonic/ui-types';

import { Value } from './value';

/**
 * What a `Value` is: its name on the wire, how a string becomes one, how one becomes JSON, and how
 * two compare. One instance per type, on `ValueTypes`; a type is compared by name.
 */
export abstract class ValueType {
  private readonly name: ValueTypeName;

  protected constructor(name: ValueTypeName) {
    this.name = name;
  }

  getName(): ValueTypeName {
    return this.name;
  }

  toString(): string {
    return this.name;
  }

  /** Whether `value` is something a `Value` of this type may hold. */
  abstract isValid(value: unknown): boolean;

  /** Whether `newValue(value)` would give a non-null value. */
  isConvertible(_value: string): boolean {
    return true;
  }

  /** A value from its string form; a string that does not convert gives the null value. */
  newValue(value: string): Value {
    return new Value(value, this);
  }

  newNullValue(): Value {
    return new Value(undefined, this);
  }

  valueToString(value: Value): string {
    return String(value.getObject());
  }

  valueToBoolean(value: Value): boolean {
    return value.getString() === 'true';
  }

  valueToNumber(value: Value): number {
    return Number(value.getObject());
  }

  abstract valueEquals(a: unknown, b: unknown): boolean;

  /** The wire form of a value — what goes under `v` in a `PropertyValueJson`; a null value is `null`. */
  toJsonValue(value: Value): unknown {
    return value.getObject() ?? null;
  }

  /** A value from its wire form; a scalar converts through its string, anything else is null. */
  fromJsonValue(json: unknown): Value {
    const str = jsonScalarToString(json);
    return str === undefined ? this.newNullValue() : this.newValue(str);
  }

  equals(other: unknown): boolean {
    return other instanceof ValueType && other.name === this.name;
  }
}

export function jsonScalarToString(json: unknown): string | undefined {
  switch (typeof json) {
    case 'string':
      return json;
    case 'number':
    case 'boolean':
      return String(json);
    default:
      return undefined;
  }
}
