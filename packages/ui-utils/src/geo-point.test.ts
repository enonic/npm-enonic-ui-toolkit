import { describe, expect, it } from 'vitest';

import { GeoPoint } from './geo-point';

describe('GeoPoint', () => {
  it('parses and writes latitude,longitude', () => {
    const point = GeoPoint.fromString('59.91, -10.75');
    expect(point.getLatitude()).toBe(59.91);
    expect(point.getLongitude()).toBe(-10.75);
    expect(point.toString()).toBe('59.91,-10.75');
  });

  it('validates the string: two numbers, both in range', () => {
    expect(GeoPoint.isValidString('90,180')).toBe(true);
    expect(GeoPoint.isValidString('-90,-180')).toBe(true);
    expect(GeoPoint.isValidString('91,0')).toBe(false);
    expect(GeoPoint.isValidString('0,181')).toBe(false);
    expect(GeoPoint.isValidString('59.91')).toBe(false);
    expect(GeoPoint.isValidString('59.91,')).toBe(false);
    expect(GeoPoint.isValidString(',10')).toBe(false);
    expect(GeoPoint.isValidString('a,b')).toBe(false);
    expect(GeoPoint.isValidString('1,2,3')).toBe(false);
    expect(GeoPoint.isValidString('')).toBe(false);
    expect(() => GeoPoint.fromString('91,0')).toThrow('Cannot parse GeoPoint');
    expect(() => new GeoPoint(0, 181)).toThrow('Invalid GeoPoint');
  });

  it('compares by value', () => {
    expect(new GeoPoint(1, 2).equals(GeoPoint.fromString('1,2'))).toBe(true);
    expect(new GeoPoint(1, 2).equals(new GeoPoint(2, 1))).toBe(false);
    expect(new GeoPoint(1, 2).equals('1,2')).toBe(false);
  });
});
