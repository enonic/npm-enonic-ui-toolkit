import type { PropertyArrayJson } from '@enonic/ui-types';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PropertyTree, ValueTypes } from '../data';
import { registerBuiltInTypes } from '../register-built-in-types';
import { normalizeFormValueTypes } from './normalize-form-value-types';
import { formOf, inputJson, itemSetJson, optionSetJson } from './test-form';

vi.mock('@enonic/ui', () => ({}));
vi.mock('lucide-react', () => ({
  GripVertical: () => null,
  MoreVertical: () => null,
  Plus: () => null,
  Square: () => null,
  X: () => null,
}));
vi.mock('@dnd-kit/core', () => ({
  DndContext: () => null,
  KeyboardSensor: class KeyboardSensor {},
  MouseSensor: class MouseSensor {},
  TouchSensor: class TouchSensor {},
  closestCenter: () => undefined,
  useSensor: () => undefined,
  useSensors: () => [],
}));
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: () => null,
  rectSortingStrategy: () => undefined,
  verticalListSortingStrategy: () => undefined,
  sortableKeyboardCoordinates: () => undefined,
  useSortable: () => ({}),
}));
vi.mock('focus-trap-react', () => ({ FocusTrap: () => null }));

function stringArray(name: string, ...values: string[]): PropertyArrayJson {
  return { name, type: 'String', values: values.map((v) => ({ v })) };
}

describe('normalizeFormValueTypes', () => {
  beforeAll(() => {
    registerBuiltInTypes();
  });

  it('converts a Long input stored as String to a Long property', () => {
    const tree = PropertyTree.fromJson([stringArray('size', '5')]);

    normalizeFormValueTypes(formOf(inputJson('size', 'Long')), tree.getRoot());

    const arr = tree.getRoot().getPropertyArray('size');
    expect(arr?.getType()).toBe(ValueTypes.LONG);
    expect(arr?.get(0)?.getValue().getLong()).toBe(5);
    expect(tree.toJson()).toEqual([{ name: 'size', type: 'Long', values: [{ v: 5 }] }]);
  });

  it('leaves values that already match the input type untouched', () => {
    const tree = PropertyTree.fromJson([stringArray('headline', 'Latest comments')]);
    const before = tree.toJson();

    normalizeFormValueTypes(formOf(inputJson('headline', 'TextLine')), tree.getRoot());

    expect(tree.toJson()).toEqual(before);
  });

  it('ignores inputs without stored data and data without inputs', () => {
    const tree = PropertyTree.fromJson([stringArray('headling', 'Latest comments')]);
    const before = tree.toJson();

    normalizeFormValueTypes(
      formOf(inputJson('headline', 'TextLine'), inputJson('size', 'Long')),
      tree.getRoot(),
    );

    expect(tree.toJson()).toEqual(before);
  });

  it('recurses into field sets, item sets and selected option-set options', () => {
    const tree = PropertyTree.fromJson([
      stringArray('count', '1'),
      {
        name: 'items',
        type: 'PropertySet',
        values: [{ set: [stringArray('size', '2')] }, { set: [stringArray('size', '3')] }],
      },
      {
        name: 'opts',
        type: 'PropertySet',
        values: [
          {
            set: [
              stringArray('_selected', 'optA'),
              { name: 'optA', type: 'PropertySet', values: [{ set: [stringArray('size', '4')] }] },
            ],
          },
        ],
      },
    ]);

    const form = formOf(
      { formItemType: 'Layout', name: 'fs', label: 'FS', items: [inputJson('count', 'Long')] },
      itemSetJson('items', 0, 0, [inputJson('size', 'Long')]),
      optionSetJson('opts', { minimum: 0, maximum: 1 }, { minimum: 0, maximum: 1 }, [
        { name: 'optA', label: 'Option A', items: [inputJson('size', 'Long')] },
      ]),
    );

    normalizeFormValueTypes(form, tree.getRoot());

    const root = tree.getRoot();
    expect(root.getPropertyArray('count')?.get(0)?.getValue().getLong()).toBe(1);
    const items = root.getPropertyArray('items');
    expect(items?.getSet(0)?.getPropertyArray('size')?.getType()).toBe(ValueTypes.LONG);
    expect(items?.getSet(0)?.getPropertyArray('size')?.get(0)?.getValue().getLong()).toBe(2);
    expect(items?.getSet(1)?.getPropertyArray('size')?.get(0)?.getValue().getLong()).toBe(3);
    const optA = root.getPropertyArray('opts')?.getSet(0)?.getPropertyArray('optA')?.getSet(0);
    expect(optA?.getPropertyArray('size')?.get(0)?.getValue().getLong()).toBe(4);
    expect(root.getPropertyArray('opts')?.getSet(0)?.getPropertyArray('_selected')?.getType()).toBe(
      ValueTypes.STRING,
    );
  });
});
