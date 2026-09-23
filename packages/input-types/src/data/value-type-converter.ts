import { LocalDateTime } from '@enonic/ui-utils';

import type { Property } from './property';
import type { PropertyArray } from './property-array';
import { PropertySet } from './property-set';
import { Value } from './value';
import type { ValueType } from './value-type';
import { ValueTypes } from './value-types';

const VALID_REFERENCE_ID = /^[a-z0-9A-Z_\-.:]*$/;

/**
 * A value of one type as another, for a property whose input type changed: what can be read across
 * converts, the rest becomes the null value of the target type.
 */
export const ValueTypeConverter = {
  convertTo,

  /** Retypes the array in place, converting every value. */
  convertArrayValues(array: PropertyArray, newType: ValueType): void {
    array.convertValues(newType, convertTo);
  },

  /** Retypes the property's whole array in place. */
  convertPropertyValueType(property: Property, newType: ValueType): void {
    property.convertValueType(newType, convertTo);
  },
};

function convertTo(value: Value, toType: ValueType): Value {
  if (value.getType().equals(toType)) {
    return value;
  }
  if (value.getType().equals(ValueTypes.DATA)) {
    return toType.newNullValue();
  }
  switch (toType.getName()) {
    case 'PropertySet':
      return convertToData(value);
    case 'String':
      return value.getType().equals(ValueTypes.DATA)
        ? ValueTypes.STRING.newNullValue()
        : ValueTypes.STRING.newValue(value.getString() ?? '');
    case 'Xml':
      return ValueTypes.XML.newValue(value.getString() ?? '');
    case 'LocalDate':
      return convertToLocalDate(value);
    case 'LocalTime':
      return convertToLocalTime(value);
    case 'LocalDateTime':
      return convertToLocalDateTime(value);
    case 'DateTime':
      return convertToDateTime(value);
    case 'Long':
      return convertToLong(value);
    case 'Boolean':
      return convertToBoolean(value);
    case 'Double':
      return convertToDouble(value);
    case 'GeoPoint':
      return value.getType().equals(ValueTypes.STRING)
        ? ValueTypes.GEO_POINT.newValue(value.getString() ?? '')
        : ValueTypes.GEO_POINT.newNullValue();
    case 'Reference': {
      const str = value.getString();
      return str && VALID_REFERENCE_ID.test(str)
        ? ValueTypes.REFERENCE.newValue(str)
        : ValueTypes.REFERENCE.newNullValue();
    }
    case 'BinaryReference':
      return ValueTypes.BINARY_REFERENCE.newValue(value.getString() ?? '');
    case 'Link':
      return ValueTypes.LINK.newValue(value.getString() ?? '');
  }
}

function convertToData(value: Value): Value {
  const set = value.getPropertySet();
  return new Value(set instanceof PropertySet ? set : new PropertySet(), ValueTypes.DATA);
}

function convertToBoolean(value: Value): Value {
  const raw = value.getObject();
  if (typeof raw === 'boolean') {
    return ValueTypes.BOOLEAN.newBoolean(raw);
  }
  if (typeof raw === 'string') {
    return ValueTypes.BOOLEAN.newValue(raw);
  }
  return ValueTypes.BOOLEAN.newNullValue();
}

function convertToLong(value: Value): Value {
  const type = value.getType();
  if (type.equals(ValueTypes.STRING)) {
    return ValueTypes.LONG.newValue(value.getString() ?? '');
  }
  if (type.equals(ValueTypes.DOUBLE)) {
    const double = value.getDouble();
    return double === undefined
      ? ValueTypes.LONG.newNullValue()
      : new Value(Math.floor(double), ValueTypes.LONG);
  }
  if (type.equals(ValueTypes.BOOLEAN)) {
    return ValueTypes.LONG.newValue(value.getBoolean() ? '1' : '0');
  }
  return ValueTypes.LONG.newNullValue();
}

function convertToDouble(value: Value): Value {
  const type = value.getType();
  if (type.equals(ValueTypes.STRING)) {
    return ValueTypes.DOUBLE.newValue(value.getString() ?? '');
  }
  if (type.equals(ValueTypes.LONG)) {
    const long = value.getLong();
    return long === undefined
      ? ValueTypes.DOUBLE.newNullValue()
      : new Value(long, ValueTypes.DOUBLE);
  }
  if (type.equals(ValueTypes.BOOLEAN)) {
    return ValueTypes.DOUBLE.newValue(value.getBoolean() ? '1' : '0');
  }
  return ValueTypes.DOUBLE.newNullValue();
}

function convertToLocalDate(value: Value): Value {
  const type = value.getType();
  const str = value.getString();
  if (str === undefined) {
    return ValueTypes.LOCAL_DATE.newNullValue();
  }
  if (type.equals(ValueTypes.STRING)) {
    return ValueTypes.LOCAL_DATE.newValue(str);
  }
  if (type.equals(ValueTypes.LOCAL_DATE_TIME) || type.equals(ValueTypes.DATE_TIME)) {
    return ValueTypes.LOCAL_DATE.newValue(str.substring(0, 10));
  }
  return ValueTypes.LOCAL_DATE.newNullValue();
}

function convertToLocalDateTime(value: Value): Value {
  const type = value.getType();
  const str = value.getString();
  if (str === undefined) {
    return ValueTypes.LOCAL_DATE_TIME.newNullValue();
  }
  if (type.equals(ValueTypes.STRING)) {
    return ValueTypes.LOCAL_DATE_TIME.newValue(str);
  }
  if (type.equals(ValueTypes.LOCAL_DATE)) {
    return new Value(LocalDateTime.fromString(`${str}T00:00:00`), ValueTypes.LOCAL_DATE_TIME);
  }
  if (type.equals(ValueTypes.DATE_TIME)) {
    return ValueTypes.LOCAL_DATE_TIME.newValue(str.substring(0, 19));
  }
  return ValueTypes.LOCAL_DATE_TIME.newNullValue();
}

function convertToDateTime(value: Value): Value {
  const type = value.getType();
  const str = value.getString();
  if (str === undefined) {
    return ValueTypes.DATE_TIME.newNullValue();
  }
  if (type.equals(ValueTypes.STRING)) {
    return ValueTypes.DATE_TIME.newValue(str);
  }
  if (type.equals(ValueTypes.LOCAL_DATE)) {
    return ValueTypes.DATE_TIME.newValue(`${str}T00:00:00Z`);
  }
  if (type.equals(ValueTypes.LOCAL_DATE_TIME)) {
    return ValueTypes.DATE_TIME.newValue(new Date(str).toISOString());
  }
  return ValueTypes.DATE_TIME.newNullValue();
}

function convertToLocalTime(value: Value): Value {
  const type = value.getType();
  if (type.equals(ValueTypes.STRING)) {
    return ValueTypes.LOCAL_TIME.newValue(value.getString() ?? '');
  }
  const time = type.equals(ValueTypes.LOCAL_DATE_TIME)
    ? value.getLocalDateTime()
    : type.equals(ValueTypes.DATE_TIME)
      ? value.getDateTime()
      : undefined;
  if (time === undefined) {
    return ValueTypes.LOCAL_TIME.newNullValue();
  }
  return ValueTypes.LOCAL_TIME.newValue(
    `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`,
  );
}
