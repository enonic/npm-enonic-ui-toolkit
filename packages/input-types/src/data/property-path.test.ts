import { describe, expect, it } from 'vitest';

import { PropertyPath, PropertyPathElement } from './property-path';

describe('PropertyPath', () => {
  it('parses and prints, writing index 0 bare', () => {
    const path = PropertyPath.fromString('.address[1].zip');
    expect(path.isAbsolute()).toBe(true);
    expect(path.elementCount()).toBe(2);
    expect(path.getFirstElement()?.getName()).toBe('address');
    expect(path.getFirstElement()?.getIndex()).toBe(1);
    expect(path.getLastElement()?.toString()).toBe('zip');
    expect(path.toString()).toBe('.address[1].zip');
    expect(PropertyPath.fromString('a[0].b').toString()).toBe('a.b');
  });

  it('builds from a parent and strips its first element', () => {
    const parent = PropertyPath.fromString('.a');
    const child = PropertyPath.fromParent(parent, new PropertyPathElement('b', 2));
    expect(child.toString()).toBe('.a.b[2]');
    expect(child.removeFirstPathElement().toString()).toBe('.b[2]');
    expect(child.getParentPath()?.toString()).toBe('.a');
    expect(child.asRelative().toString()).toBe('a.b[2]');
    expect(child.asRelative().getParentPath()?.toString()).toBe('a');
    expect(child.asRelative().getParentPath()?.isAbsolute()).toBe(false);
    expect(() => parent.removeFirstPathElement()).toThrow();
    expect(PropertyPath.ROOT.isRoot()).toBe(true);
    expect(PropertyPath.ROOT.getParentPath()).toBeUndefined();
  });

  it('compares by string form', () => {
    expect(PropertyPath.fromString('.a.b').equals(PropertyPath.fromString('.a[0].b'))).toBe(true);
    expect(PropertyPath.fromString('.a.b').equals(PropertyPath.fromString('a.b'))).toBe(false);
  });
});
