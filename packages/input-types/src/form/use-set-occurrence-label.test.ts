import { describe, expect, it, vi } from 'vitest';

import { PropertyTree, ValueTypes } from '../data';
import type { FormOptionSet } from '../schema';
import { selectOptionInPropertySet } from './option-set-selection';
import { formOf, inputJson, itemSetJson, optionSetJson } from './test-form';
import { resolveSetOccurrenceLabel } from './use-set-occurrence-label';

vi.mock('@enonic/ui', () => ({}));

const USER_STORE = optionSetJson(
  'userStore',
  { minimum: 0, maximum: 1 },
  { minimum: 1, maximum: 1 },
  [
    { name: 'local', label: 'Store users locally', default: true, items: [] },
    {
      name: 'remote',
      label: 'Look users up remotely',
      default: false,
      items: [inputJson('lookupUrl', 'TextLine', 1, 1)],
    },
  ],
);

function optionSet(): FormOptionSet {
  const item = formOf(USER_STORE).getFormItems()[0];
  if (item?.kind !== 'optionset') throw new Error('no option set');
  return item as FormOptionSet;
}

describe('resolveSetOccurrenceLabel', () => {
  it('names an item set occurrence by its first text value', () => {
    const form = formOf(
      itemSetJson('claimMappings', 0, 0, [
        inputJson('claim', 'TextLine', 1, 1),
        inputJson('attribute', 'TextLine'),
      ]),
    );
    const occurrence = new PropertyTree().getRoot().addPropertySet('claimMappings');
    occurrence.addString('claim', 'email');

    const label = resolveSetOccurrenceLabel(occurrence, form.getFormItems(), 'Claim mappings');

    expect(label).toEqual({ primary: 'email' });
  });

  it('names an option set occurrence by the option chosen, even one without fields', () => {
    const set = optionSet();
    const occurrence = new PropertyTree().getRoot().addPropertySet('userStore');
    selectOptionInPropertySet(occurrence, set, 'local');

    const label = resolveSetOccurrenceLabel(occurrence, set.getFormItems(), 'User store');

    expect(label.primary).toBe('Store users locally');
  });

  it('reads the first value under the chosen option as the secondary line', () => {
    const set = optionSet();
    const occurrence = new PropertyTree().getRoot().addPropertySet('userStore');
    selectOptionInPropertySet(occurrence, set, 'remote');
    occurrence.getPropertySet('remote')?.addString('lookupUrl', 'https://idp.example.com');

    const label = resolveSetOccurrenceLabel(occurrence, set.getFormItems(), 'User store');

    expect(label).toEqual({
      primary: 'Look users up remotely',
      secondary: 'https://idp.example.com',
    });
  });

  it('falls back to the set label while nothing is chosen', () => {
    const set = optionSet();
    const occurrence = new PropertyTree().getRoot().addPropertySet('userStore');
    occurrence.addProperty('_selected', ValueTypes.STRING.newNullValue());

    const label = resolveSetOccurrenceLabel(occurrence, set.getFormItems(), 'User store');

    expect(label.primary).toBe('User store');
  });
});
