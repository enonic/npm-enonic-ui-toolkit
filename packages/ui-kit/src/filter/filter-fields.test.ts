import { describe, expect, it } from 'vitest';

import {
  fieldTyped,
  groupedValues,
  isOffered,
  matchingFields,
  matchingValues,
  orderedValues,
  termLabel,
  type FilterField,
  type FilterValue,
} from './filter-fields';

function value(id: string, count?: number): FilterValue {
  return { id, label: id, count };
}

const provider: FilterField = {
  id: 'idProvider',
  label: 'ID provider',
  values: [
    { id: 'ldap', label: 'Company directory', count: 7 },
    { id: 'entraid', label: 'EntraID', count: 0 },
  ],
};

const scope: FilterField = { id: 'scope', label: 'Scope', values: [] };

const fields = [provider, scope];

describe('isOffered', () => {
  it('offers a value something falls under', () => {
    expect(isOffered(value('a', 3))).toBe(true);
  });

  it('withholds a value nothing falls under', () => {
    expect(isOffered(value('a', 0))).toBe(false);
  });

  it('offers a value nothing could count', () => {
    expect(isOffered(value('a'))).toBe(true);
  });

  it('withholds a value the caller disabled, whatever its count', () => {
    expect(isOffered({ ...value('a', 3), disabled: true })).toBe(false);
  });
});

describe('orderedValues', () => {
  it('puts the most hits first and the empty values last', () => {
    const ordered = orderedValues([value('a', 1), value('b', 0), value('c', 5)]);

    expect(ordered.map(({ id }) => id)).toEqual(['c', 'a', 'b']);
  });

  it('keeps the given order between equal counts', () => {
    const ordered = orderedValues([value('a', 2), value('b', 2), value('c', 2)]);

    expect(ordered.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps an uncounted value ahead of the empty ones', () => {
    const ordered = orderedValues([value('a', 0), value('b'), value('c', 1)]);

    expect(ordered.map(({ id }) => id)).toEqual(['b', 'c', 'a']);
  });

  it('leaves the values it was given alone', () => {
    const values = [value('a', 1), value('b', 2)];
    orderedValues(values);

    expect(values.map(({ id }) => id)).toEqual(['a', 'b']);
  });
});

describe('groupedValues', () => {
  const grouped = (id: string, count: number, group?: string): FilterValue => ({
    id,
    label: id,
    count,
    group,
  });

  it('lists the ungrouped values first and unlabelled, then each group as it first appears', () => {
    const runs = groupedValues([
      grouped('system', 2),
      grouped('intranet', 0, 'Project roles'),
      grouped('custom', 1),
      grouped('shop', 3, 'Project roles'),
    ]);

    expect(runs.map(({ label }) => label)).toEqual([undefined, 'Project roles']);
    expect(runs.map(({ values }) => values.map(({ id }) => id))).toEqual([
      ['system', 'custom'],
      ['shop', 'intranet'],
    ]);
  });

  it('orders by hits inside each run, keeping an empty value in its own group', () => {
    const runs = groupedValues([grouped('a', 0), grouped('b', 1, 'More'), grouped('c', 5)]);

    expect(runs[0]?.values.map(({ id }) => id)).toEqual(['c', 'a']);
    expect(runs[1]?.values.map(({ id }) => id)).toEqual(['b']);
  });

  it('leaves out the ungrouped run when every value is grouped', () => {
    expect(groupedValues([grouped('a', 1, 'Only')]).map(({ label }) => label)).toEqual(['Only']);
  });

  it('answers nothing for no values', () => {
    expect(groupedValues([])).toEqual([]);
  });
});

describe('matchingFields', () => {
  it('offers every field for a blank', () => {
    expect(matchingFields(fields, '  ')).toEqual(fields);
  });

  it('narrows to the fields whose label contains the text, whatever the case', () => {
    expect(matchingFields(fields, 'PROV')).toEqual([provider]);
  });

  it('offers nothing when no label matches', () => {
    expect(matchingFields(fields, 'status')).toEqual([]);
  });
});

describe('matchingValues', () => {
  it('narrows to the values whose label contains the text, whatever the case', () => {
    expect(matchingValues(provider.values, 'entra').map(({ id }) => id)).toEqual(['entraid']);
  });

  it('offers every value for a blank', () => {
    expect(matchingValues(provider.values, '')).toEqual(provider.values);
  });
});

describe('fieldTyped', () => {
  it('names the field once its label is typed with a colon, whatever the case', () => {
    expect(fieldTyped(fields, 'id provider:')).toEqual({ field: provider, text: '' });
    expect(fieldTyped(fields, 'Scope:')).toEqual({ field: scope, text: '' });
  });

  it('keeps what follows the colon as the text to match values by', () => {
    expect(fieldTyped(fields, 'Scope: Custom ')).toEqual({ field: scope, text: 'Custom' });
  });

  it('prefers the longer label where one is a prefix of another', () => {
    const id: FilterField = { id: 'id', label: 'ID', values: [] };

    expect(fieldTyped([id, provider], 'ID provider: x')?.field).toBe(provider);
    expect(fieldTyped([id, provider], 'ID: x')?.field).toBe(id);
  });

  it('names nothing before the colon is typed', () => {
    expect(fieldTyped(fields, 'Scope')).toBeUndefined();
  });

  it('takes the forms a locale shows beside the plain `Label:`', () => {
    const french = (label: string) => [`${label} :`, `${label}:`];

    expect(fieldTyped(fields, 'scope : custom', french)).toEqual({ field: scope, text: 'custom' });
    expect(fieldTyped(fields, 'Scope:custom', french)).toEqual({ field: scope, text: 'custom' });
  });

  it('names nothing for a label no field has', () => {
    expect(fieldTyped(fields, 'Status:')).toBeUndefined();
  });
});

describe('termLabel', () => {
  it('shows a text term as it was typed', () => {
    expect(termLabel({ kind: 'text', text: 'alice' }, fields)).toEqual({ value: 'alice' });
  });

  it('shows a field term by the labels of its field and value', () => {
    expect(termLabel({ kind: 'field', field: 'idProvider', value: 'ldap' }, fields)).toEqual({
      field: 'ID provider',
      value: 'Company directory',
    });
  });

  // A provider list that failed to load leaves the tag readable, and removable, by its ids.
  it('falls back to the ids for a field or value no longer offered', () => {
    expect(termLabel({ kind: 'field', field: 'idProvider', value: 'gone' }, fields)).toEqual({
      field: 'ID provider',
      value: 'gone',
    });
    expect(termLabel({ kind: 'field', field: 'status', value: 'on' }, fields)).toEqual({
      field: 'status',
      value: 'on',
    });
  });
});
