import type { FormItemJson } from '@enonic/ui-types';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PropertyTree } from '../data';
import { registerBuiltInTypes } from '../register-built-in-types';
import { Form } from '../schema';
import { seedFormDefaults } from './seed-form-defaults';
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

function seed(...items: FormItemJson[]): PropertyTree {
  const tree = new PropertyTree();
  seedFormDefaults(formOf(...items), tree.getRoot());
  return tree;
}

describe('seedFormDefaults', () => {
  beforeAll(() => {
    registerBuiltInTypes();
  });

  it('does nothing for an empty form', () => {
    const tree = new PropertyTree();
    expect(() => seedFormDefaults(new Form(), tree.getRoot())).not.toThrow();
    expect(tree.getRoot().getPropertyArrays()).toHaveLength(0);
  });

  it('seeds a single Checkbox with its configured default', () => {
    const tree = seed(inputJson('agree', 'Checkbox', 0, 1, { default: [{ value: 'checked' }] }));

    const arr = tree.getRoot().getPropertyArray('agree');
    expect(arr?.getSize()).toBe(1);
    expect(arr?.get(0)?.getValue().getBoolean()).toBe(true);
  });

  it('seeds a single input occurrence even without a default value', () => {
    const tree = seed(inputJson('title', 'TextLine', 0, 1));

    const arr = tree.getRoot().getPropertyArray('title');
    expect(arr?.getSize()).toBe(1);
    expect(arr?.get(0)?.getValue().isNull()).toBe(true);
  });

  it('seeds minimum occurrences for a list input', () => {
    const tree = seed(inputJson('tags', 'TextLine', 3, 5));
    expect(tree.getRoot().getPropertyArray('tags')?.getSize()).toBe(3);
  });

  it('does not add values for internal-mode inputs (selectors)', () => {
    const tree = seed(inputJson('ref', 'ComboBox', 1, 1));
    expect(tree.getRoot().getPropertyArray('ref')?.getSize()).toBe(0);
  });

  it('seeds a single configured default for an internal-mode ComboBox', () => {
    const tree = seed(
      inputJson('combo', 'ComboBox', 0, 1, {
        options: [
          { value: 'option A', '@value': 'o1' },
          { value: 'option B', '@value': 'o2' },
        ],
        default: [{ value: 'o1' }],
      }),
    );

    const arr = tree.getRoot().getPropertyArray('combo');
    expect(arr?.getSize()).toBe(1);
    expect(arr?.get(0)?.getValue().getString()).toBe('o1');
  });

  it('does not seed or crash on unregistered input types', () => {
    const tree = new PropertyTree();
    const form = formOf(inputJson('weird', 'NoSuchType', 1, 1));

    expect(() => seedFormDefaults(form, tree.getRoot())).not.toThrow();
    expect(tree.getRoot().getPropertyArray('weird')).toBeUndefined();
  });

  it('recurses into FieldSet children on the same property set', () => {
    const tree = seed({
      formItemType: 'Layout',
      name: 'fs',
      label: 'FS',
      items: [inputJson('agree', 'Checkbox', 0, 1, { default: [{ value: 'checked' }] })],
    });

    expect(tree.getRoot().getPropertyArray('agree')?.get(0)?.getValue().getBoolean()).toBe(true);
  });

  it('seeds minimum item-set occurrences and their child defaults', () => {
    const tree = seed(
      itemSetJson('items', 2, 0, [
        inputJson('flag', 'Checkbox', 0, 1, { default: [{ value: 'checked' }] }),
      ]),
    );

    const arr = tree.getRoot().getPropertyArray('items');
    expect(arr?.getSize()).toBe(2);
    expect(arr?.getSet(0)?.getPropertyArray('flag')?.get(0)?.getValue().getBoolean()).toBe(true);
    expect(arr?.getSet(1)?.getPropertyArray('flag')?.get(0)?.getValue().getBoolean()).toBe(true);
  });

  it('does not seed an optional item set (min 0)', () => {
    const tree = seed(itemSetJson('items', 0, 0, []));

    const arr = tree.getRoot().getPropertyArray('items');
    expect(arr === undefined || arr.getSize() === 0).toBe(true);
  });

  it('seeds a locked-single radio option set: selects the default option and seeds its children', () => {
    const tree = seed(
      optionSetJson('opts', { minimum: 1, maximum: 1 }, { minimum: 1, maximum: 1 }, [
        {
          name: 'optA',
          label: 'Option A',
          default: true,
          items: [inputJson('flag', 'Checkbox', 0, 1, { default: [{ value: 'checked' }] })],
        },
        { name: 'optB', label: 'Option B', items: [] },
      ]),
    );

    const arr = tree.getRoot().getPropertyArray('opts');
    expect(arr?.getSize()).toBe(1);

    const occurrence = arr?.getSet(0);
    expect(occurrence?.getPropertyArray('_selected')?.get(0)?.getValue().getString()).toBe('optA');
    expect(
      occurrence
        ?.getPropertyArray('optA')
        ?.getSet(0)
        ?.getPropertyArray('flag')
        ?.get(0)
        ?.getValue()
        .getBoolean(),
    ).toBe(true);
    expect(occurrence?.getPropertyArray('optB')).toBeUndefined();
  });

  it('does not seed occurrences for a non-locked radio option set', () => {
    const tree = seed(
      optionSetJson('opts', { minimum: 0, maximum: 0 }, { minimum: 1, maximum: 1 }, [
        { name: 'optA', label: 'A', default: true, items: [] },
      ]),
    );

    const arr = tree.getRoot().getPropertyArray('opts');
    expect(arr === undefined || arr.getSize() === 0).toBe(true);
  });

  it('seeds a checkbox option set to its minimum with every default option selected', () => {
    const tree = seed(
      optionSetJson('opts', { minimum: 1, maximum: 3 }, { minimum: 0, maximum: 0 }, [
        { name: 'b', label: 'B', default: true, items: [] },
        { name: 'a', label: 'A', default: true, items: [] },
        { name: 'c', label: 'C', items: [] },
      ]),
    );

    const occurrence = tree.getRoot().getPropertyArray('opts')?.getSet(0);
    const selected = occurrence?.getPropertyArray('_selected');
    expect([
      selected?.get(0)?.getValue().getString(),
      selected?.get(1)?.getValue().getString(),
    ]).toEqual(['a', 'b']);
    expect(occurrence?.getPropertyArray('c')).toBeUndefined();
  });
});
