import { describe, expect, it, vi } from 'vitest';

import { PropertyTree, type PropertySet } from '../data';
import { pruneUnselectedOptionData, selectOptionInPropertySet } from './option-set-selection';
import { formOf, optionSetJson } from './test-form';

vi.mock('@enonic/ui', () => ({}));

function optionWithText(occurrence: PropertySet, name: string, text: string): PropertySet {
  const option = occurrence.addPropertySet(name);
  option.addString('text', text);
  return option;
}

describe('pruneUnselectedOptionData', () => {
  it('removes data of unselected options and keeps selected ones', () => {
    const tree = new PropertyTree();
    const occurrence = tree.getRoot().addPropertySet('myOptionSet');
    occurrence.addString('_selected', 'opt1');
    optionWithText(occurrence, 'opt1', 'keep');
    optionWithText(occurrence, 'opt2', 'drop');

    pruneUnselectedOptionData(tree.getRoot());

    expect(occurrence.getPropertyArray('opt1')).toBeDefined();
    expect(occurrence.getPropertyArray('opt2')).toBeUndefined();
    expect(occurrence.getPropertyArray('_selected')).toBeDefined();
  });

  it('keeps all options when every option is selected', () => {
    const tree = new PropertyTree();
    const occurrence = tree.getRoot().addPropertySet('myOptionSet');
    occurrence.addString('_selected', 'opt1');
    occurrence.addString('_selected', 'opt2');
    optionWithText(occurrence, 'opt1', 'a');
    optionWithText(occurrence, 'opt2', 'b');

    pruneUnselectedOptionData(tree.getRoot());

    expect(occurrence.getPropertyArray('opt1')).toBeDefined();
    expect(occurrence.getPropertyArray('opt2')).toBeDefined();
  });

  it('prunes nested option sets inside a selected option', () => {
    const tree = new PropertyTree();
    const outer = tree.getRoot().addPropertySet('outer');
    outer.addString('_selected', 'opt1');
    const opt1 = outer.addPropertySet('opt1');
    const inner = opt1.addPropertySet('inner');
    inner.addString('_selected', 'inner1');
    optionWithText(inner, 'inner1', 'keep');
    optionWithText(inner, 'inner2', 'drop');

    pruneUnselectedOptionData(tree.getRoot());

    expect(outer.getPropertyArray('opt1')).toBeDefined();
    expect(inner.getPropertyArray('inner1')).toBeDefined();
    expect(inner.getPropertyArray('inner2')).toBeUndefined();
  });

  it('does not touch sets without a _selected array', () => {
    const tree = new PropertyTree();
    const plain = tree.getRoot().addPropertySet('plain');
    plain.addString('text', 'value');
    const child = plain.addPropertySet('child');
    child.addString('text', 'nested');

    pruneUnselectedOptionData(tree.getRoot());

    expect(plain.getPropertyArray('text')).toBeDefined();
    expect(plain.getPropertyArray('child')).toBeDefined();
    expect(child.getPropertyArray('text')).toBeDefined();
  });
});

describe('selectOptionInPropertySet', () => {
  const radio = optionSetJson('opts', { minimum: 0, maximum: 0 }, { minimum: 1, maximum: 1 }, [
    { name: 'a', label: 'A' },
    { name: 'b', label: 'B' },
  ]);
  const multi = optionSetJson('opts', { minimum: 0, maximum: 0 }, { minimum: 0, maximum: 0 }, [
    { name: 'a', label: 'A' },
    { name: 'b', label: 'B' },
    { name: 'c', label: 'C' },
  ]);

  function optionSetOf(json: typeof radio) {
    const item = formOf(json).getFormItemByName('opts');
    if (item?.kind !== 'optionset') throw new Error('expected an option set');
    return item as import('../schema').FormOptionSet;
  }

  it('replaces the selection of a radio set and creates the option data set', () => {
    const occurrence = new PropertyTree().getRoot();
    const optionSet = optionSetOf(radio);

    selectOptionInPropertySet(occurrence, optionSet, 'a');
    selectOptionInPropertySet(occurrence, optionSet, 'b');

    const selected = occurrence.getPropertyArray('_selected');
    expect(selected?.getSize()).toBe(1);
    expect(selected?.get(0)?.getValue().getString()).toBe('b');
    expect(occurrence.getPropertyArray('b')?.getSet(0)).toBeDefined();
  });

  it('keeps a multi selection sorted and free of duplicates', () => {
    const occurrence = new PropertyTree().getRoot();
    const optionSet = optionSetOf(multi);

    selectOptionInPropertySet(occurrence, optionSet, 'c');
    selectOptionInPropertySet(occurrence, optionSet, 'a');
    selectOptionInPropertySet(occurrence, optionSet, 'c');

    const selected = occurrence.getPropertyArray('_selected');
    expect(selected?.getProperties().map((p) => p.getValue().getString())).toEqual(['a', 'c']);
  });
});
