import { GeoPoint, LocalDateTime } from '@enonic/ui-utils';
import { describe, expect, it } from 'vitest';

import { PropertyTree } from './property-tree';
import { Value } from './value';
import { ValueTypeConverter } from './value-type-converter';
import { ValueTypes } from './value-types';

describe('ValueTypes', () => {
  it('names every type as XP does and finds it by name', () => {
    expect(ValueTypes.ALL.map((type) => type.getName())).toEqual([
      'PropertySet',
      'String',
      'Xml',
      'LocalDate',
      'LocalTime',
      'LocalDateTime',
      'DateTime',
      'Long',
      'Boolean',
      'Double',
      'GeoPoint',
      'Reference',
      'BinaryReference',
      'Link',
    ]);
    expect(ValueTypes.fromName('GeoPoint')).toBe(ValueTypes.GEO_POINT);
    expect(() => ValueTypes.fromName('Nope')).toThrow('Unknown ValueType: Nope');
    expect(ValueTypes.isName('Long')).toBe(true);
    expect(ValueTypes.isName('long')).toBe(false);
  });

  it('parses strings into typed values and rejects what does not convert', () => {
    expect(ValueTypes.LONG.newValue('42').getLong()).toBe(42);
    expect(ValueTypes.LONG.newValue('4.2').isNull()).toBe(true);
    expect(ValueTypes.LONG.newValue('abc').isNull()).toBe(true);
    expect(ValueTypes.DOUBLE.newValue('4.2').getDouble()).toBe(4.2);
    expect(ValueTypes.BOOLEAN.newValue('true').getBoolean()).toBe(true);
    expect(ValueTypes.BOOLEAN.newValue('nope').getBoolean()).toBe(false);
    expect(ValueTypes.LOCAL_DATE.newValue('2015-04-17').getLocalDate()?.toString()).toBe(
      '2015-04-17',
    );
    expect(ValueTypes.LOCAL_DATE.newValue('2015-02-30').isNull()).toBe(true);
    expect(ValueTypes.LOCAL_TIME.newValue('6:5').getString()).toBe('06:05');
    expect(ValueTypes.LOCAL_DATE_TIME.newValue('2015-04-17T06:00').getString()).toBe(
      '2015-04-17T06:00:00',
    );
    expect(ValueTypes.DATE_TIME.newValue('2015-04-17T06:00Z').getString()).toBe(
      '2015-04-17T06:00:00Z',
    );
    expect(ValueTypes.DATE_TIME.newValue('2015-04-17T06:00').isNull()).toBe(true);
    expect(ValueTypes.GEO_POINT.newValue('1,2').getGeoPoint()?.getLongitude()).toBe(2);
    expect(ValueTypes.REFERENCE.newValue('abc').getReference()?.getNodeId()).toBe('abc');
    expect(ValueTypes.REFERENCE.newValue(' ').isNull()).toBe(true);
    expect(ValueTypes.STRING.newValue('').isNull()).toBe(true);
    expect(() => ValueTypes.DATA.newValue()).toThrow('cannot be created from a string');
  });

  it('checks a value against its type', () => {
    expect(() => new Value(1.5, ValueTypes.LONG)).toThrow('Invalid value for type Long');
    expect(() => new Value('2015-04-17', ValueTypes.LOCAL_DATE)).toThrow(
      'Invalid value for type LocalDate',
    );
    expect(new Value(new GeoPoint(1, 2), ValueTypes.GEO_POINT).getString()).toBe('1,2');
    expect(new Value(undefined, ValueTypes.LONG).isNull()).toBe(true);
  });

  it('compares values by type and content', () => {
    expect(ValueTypes.STRING.newValue('a').equals(ValueTypes.STRING.newValue('a'))).toBe(true);
    expect(ValueTypes.STRING.newValue('a').equals(ValueTypes.XML.newValue('a'))).toBe(false);
    expect(ValueTypes.LONG.newNullValue().equals(ValueTypes.LONG.newNullValue())).toBe(true);
    expect(ValueTypes.LONG.newNullValue().equals(ValueTypes.LONG.newValue('0'))).toBe(false);
    expect(
      ValueTypes.LOCAL_DATE_TIME.newValue('2015-04-17T06:00').equals(
        new Value(LocalDateTime.fromString('2015-04-17T06:00:00'), ValueTypes.LOCAL_DATE_TIME),
      ),
    ).toBe(true);
  });

  it('writes and reads the wire form of each scalar', () => {
    expect(ValueTypes.STRING.toJsonValue(ValueTypes.STRING.newValue(''))).toBeNull();
    expect(ValueTypes.LONG.fromJsonValue(7).getLong()).toBe(7);
    expect(ValueTypes.LONG.fromJsonValue('7').getLong()).toBe(7);
    expect(ValueTypes.BOOLEAN.fromJsonValue(false).getBoolean()).toBe(false);
    expect(ValueTypes.GEO_POINT.toJsonValue(ValueTypes.GEO_POINT.newValue('1,2'))).toBe('1,2');
    expect(ValueTypes.LOCAL_DATE.fromJsonValue(null).isNull()).toBe(true);
  });
});

describe('ValueTypeConverter', () => {
  it('converts what can be read across types and nulls the rest', () => {
    const convert = ValueTypeConverter.convertTo;
    expect(convert(ValueTypes.STRING.newValue('42'), ValueTypes.LONG).getLong()).toBe(42);
    expect(convert(ValueTypes.DOUBLE.newValue('4.7'), ValueTypes.LONG).getLong()).toBe(4);
    expect(convert(ValueTypes.LONG.newValue('4'), ValueTypes.DOUBLE).getType()).toBe(
      ValueTypes.DOUBLE,
    );
    expect(convert(ValueTypes.BOOLEAN.newBoolean(true), ValueTypes.LONG).getLong()).toBe(1);
    expect(convert(ValueTypes.STRING.newValue('yes'), ValueTypes.BOOLEAN).getBoolean()).toBe(false);
    expect(convert(ValueTypes.LONG.newValue('42'), ValueTypes.STRING).getString()).toBe('42');
    expect(convert(ValueTypes.STRING.newValue('a b'), ValueTypes.REFERENCE).isNull()).toBe(true);
    expect(convert(ValueTypes.STRING.newValue('a-b'), ValueTypes.REFERENCE).getString()).toBe(
      'a-b',
    );
    expect(convert(ValueTypes.STRING.newValue('x'), ValueTypes.GEO_POINT).isNull()).toBe(true);
  });

  it('moves between the date and time types', () => {
    const convert = ValueTypeConverter.convertTo;
    const localDateTime = ValueTypes.LOCAL_DATE_TIME.newValue('2015-04-17T06:05:09');
    expect(convert(localDateTime, ValueTypes.LOCAL_DATE).getString()).toBe('2015-04-17');
    expect(convert(localDateTime, ValueTypes.LOCAL_TIME).getString()).toBe('06:05:09');
    expect(
      convert(ValueTypes.LOCAL_DATE.newValue('2015-04-17'), ValueTypes.LOCAL_DATE_TIME).getString(),
    ).toBe('2015-04-17T00:00:00');
    expect(
      convert(ValueTypes.LOCAL_DATE.newValue('2015-04-17'), ValueTypes.DATE_TIME).getString(),
    ).toBe('2015-04-17T00:00:00Z');
    expect(
      convert(
        ValueTypes.DATE_TIME.newValue('2015-04-17T06:05:09Z'),
        ValueTypes.LOCAL_DATE,
      ).getString(),
    ).toBe('2015-04-17');
    expect(convert(ValueTypes.LONG.newNullValue(), ValueTypes.LOCAL_DATE).isNull()).toBe(true);
  });

  it('retypes a whole array in place', () => {
    const tree = new PropertyTree();
    tree.addStrings('n', ['1', '2', 'x']);
    const array = tree.getPropertyArray('n');
    if (array === undefined) throw new Error('array');
    ValueTypeConverter.convertArrayValues(array, ValueTypes.LONG);
    expect(array.getType()).toBe(ValueTypes.LONG);
    expect(tree.getLongs('n')).toEqual([1, 2, undefined]);
  });
});
