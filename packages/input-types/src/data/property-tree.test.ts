import type { PropertyTreeJson } from '@enonic/ui-types';
import { LocalDate, Reference } from '@enonic/ui-utils';
import { describe, expect, it, vi } from 'vitest';

import type { PropertyEvent } from './property-event';
import { PropertyPath } from './property-path';
import { PropertySet } from './property-set';
import { PropertyTree } from './property-tree';
import { Value } from './value';
import { ValueTypes } from './value-types';

const json: PropertyTreeJson = [
  { name: 'title', type: 'String', values: [{ v: 'Hello' }] },
  { name: 'count', type: 'Long', values: [{ v: 3 }, { v: null }] },
  { name: 'published', type: 'LocalDate', values: [{ v: '2015-04-17' }] },
  {
    name: 'address',
    type: 'PropertySet',
    values: [
      {
        set: [
          { name: 'zip', type: 'String', values: [{ v: '0150' }] },
          { name: 'tags', type: 'Reference', values: [{ v: 'a' }, { v: 'b' }] },
        ],
      },
      { set: [{ name: 'zip', type: 'String', values: [{ v: '0250' }] }] },
    ],
  },
];

describe('PropertyTree', () => {
  it('reads XP JSON and writes it back the same', () => {
    const tree = PropertyTree.fromJson(json);
    expect(tree.getString('title')).toBe('Hello');
    expect(tree.getLong('count', 0)).toBe(3);
    expect(tree.getLong('count', 1)).toBeUndefined();
    expect(tree.getLocalDate('published')?.toString()).toBe('2015-04-17');
    expect(tree.getString('address.zip')).toBe('0150');
    expect(tree.getString('address[1].zip')).toBe('0250');
    expect(tree.getReference('address.tags[1]')?.getNodeId()).toBe('b');
    expect(tree.toJson()).toEqual(json);
  });

  it('gives every property its path and every set its tree', () => {
    const tree = PropertyTree.fromJson(json);
    const zip = tree.getProperty('address[1].zip');
    expect(zip?.getPath().toString()).toBe('.address[1].zip');
    expect(zip?.getParent().getPropertyPath().toString()).toBe('.address[1]');
    expect(zip?.getParent().getTree()).toBe(tree);
    expect(tree.getRoot().getPropertyPath()).toBe(PropertyPath.ROOT);
  });

  it('creates the sets a path needs when setting by path, one index at a time', () => {
    const tree = new PropertyTree();
    tree.setStringByPath('a.b.c', 'first');
    tree.setStringByPath('a.b[1].c', 'second');
    expect(tree.getString('a.b.c')).toBe('first');
    expect(tree.getString('a.b[1].c')).toBe('second');
    expect(tree.getPropertyArray('a')?.getSet(0)?.getPropertyArray('b')?.getSize()).toBe(2);
    expect(tree.getPropertySet('a.b[1]')?.getPropertyPath().toString()).toBe('.a.b[1]');
    expect(() => tree.setStringByPath('a.b[5].c', 'gap')).toThrow('Index out of bounds');
    expect(tree.getRoot().isNull('a.b.missing')).toBe(true);
  });

  it('reports adds, removes, moves and value changes, and forwards them from nested sets', () => {
    const tree = PropertyTree.fromJson(json);
    const events: string[] = [];
    tree.onChanged((event: PropertyEvent) =>
      events.push(`${event.getType()} ${event.getPath().toString()}`),
    );

    tree.addString('title', 'Second');
    tree.getPropertyArray('title')?.move(1, 0);
    tree.setStringByPath('address.zip', '9999');
    tree.getPropertyArray('address')?.getSet(0)?.addString('street', 'Main');
    tree.removeProperty('count', 0);

    expect(events).toEqual([
      'added .title[1]',
      'moved .title',
      'valueChanged .address.zip',
      'added .address.street',
      'removed .count',
    ]);
    expect(tree.getStrings('title')).toEqual(['Second', 'Hello']);
    expect(tree.getPropertyArray('count')?.getSize()).toBe(1);
    expect(tree.getProperty('count', 0)?.getIndex()).toBe(0);
  });

  it('does not report a value set to an equal value unless forced', () => {
    const tree = PropertyTree.fromJson(json);
    const listener = vi.fn();
    tree.onPropertyValueChanged(listener);
    tree.setString('title', 0, 'Hello');
    expect(listener).not.toHaveBeenCalled();
    tree.getProperty('title', 0)?.setValue(ValueTypes.STRING.newValue('Hello'), true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].isForce()).toBe(true);
  });

  it('stops hearing a set that was removed', () => {
    const tree = PropertyTree.fromJson(json);
    const removed = tree.getPropertySet('address', 1);
    const listener = vi.fn();
    tree.onPropertyAdded(listener);
    tree.removeProperty('address', 1);
    listener.mockClear();
    removed?.addString('ghost', 'boo');
    expect(listener).not.toHaveBeenCalled();
  });

  it('refuses a value of another type in an array', () => {
    const tree = PropertyTree.fromJson(json);
    expect(() => tree.getPropertyArray('title')?.add(ValueTypes.LONG.newValue('1'))).toThrow(
      "expects only properties with value of type 'String'",
    );
  });

  it('copies deep and independent', () => {
    const tree = PropertyTree.fromJson(json);
    const copy = tree.copy();
    expect(copy.equals(tree)).toBe(true);
    copy.setStringByPath('address.zip', 'changed');
    expect(tree.getString('address.zip')).toBe('0150');
    expect(copy.equals(tree)).toBe(false);
    expect(copy.getPropertySet('address', 0)?.getTree()).toBe(copy);
  });

  it('attaches a detached set when it is added', () => {
    const tree = new PropertyTree();
    const detached = new PropertySet();
    detached.addString('inner', 'x');
    expect(detached.isDetached()).toBe(true);
    tree.addPropertySet('outer', detached);
    expect(detached.getTree()).toBe(tree);
    expect(tree.getString('outer.inner')).toBe('x');
  });

  it('knows what is empty and removes it', () => {
    const tree = new PropertyTree();
    tree.addString('blank', '');
    tree.addBoolean('flag', false);
    tree.addPropertySet('set').addString('nested', '');
    expect(tree.isEmpty()).toBe(true);
    tree.addReference('ref', new Reference('abc'));
    expect(tree.isEmpty()).toBe(false);
    tree.removeEmptyValues();
    expect(tree.toJson()).toEqual([{ name: 'ref', type: 'Reference', values: [{ v: 'abc' }] }]);
  });

  it('diffs two trees', () => {
    const a = PropertyTree.fromJson(json);
    const b = a.copy();
    b.setStringByPath('title', 'Changed');
    b.removeProperty('published', 0);
    b.addLocalDate('created', LocalDate.fromString('2020-01-01'));
    const diff = a.diff(b);
    expect(diff.modified.map((m) => m.oldValue.getPath().toString())).toEqual(['.title']);
    expect(diff.removed.map((p) => p.getPath().toString())).toEqual(['.published']);
    expect(diff.added.map((p) => p.getPath().toString())).toEqual(['.created']);
  });

  it('retypes an array through the converter callback', () => {
    const tree = PropertyTree.fromJson(json);
    const array = tree.getPropertyArray('count');
    array?.convertValues(ValueTypes.STRING, (value, toType) =>
      toType.newValue(value.getString() ?? ''),
    );
    expect(array?.getType()).toBe(ValueTypes.STRING);
    expect(tree.getString('count', 0)).toBe('3');
    expect(() => new Value('x', ValueTypes.LONG)).toThrow('Invalid value for type Long');
  });
});
