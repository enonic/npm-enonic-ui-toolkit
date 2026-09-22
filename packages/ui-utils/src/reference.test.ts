import { describe, expect, it } from 'vitest';

import { BinaryReference, Link, Reference } from './reference';

describe('the string-backed values', () => {
  it('are their string', () => {
    expect(new Reference('abc').getNodeId()).toBe('abc');
    expect(new Reference('abc').toString()).toBe('abc');
    expect(new BinaryReference('file.png').getValue()).toBe('file.png');
    expect(new Link('/a/b').getPath()).toBe('/a/b');
    expect(String(new Link('/a/b'))).toBe('/a/b');
  });

  it('compare by value and never across kinds', () => {
    expect(new Reference('abc').equals(new Reference('abc'))).toBe(true);
    expect(new Reference('abc').equals(new Reference('abd'))).toBe(false);
    expect(new Reference('abc').equals(new BinaryReference('abc'))).toBe(false);
    expect(new Link('abc').equals(new Reference('abc'))).toBe(false);
    expect(new BinaryReference('abc').equals('abc')).toBe(false);
  });
});
