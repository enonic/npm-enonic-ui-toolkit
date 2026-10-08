import { describe, expect, it } from 'vitest';

import {
  fieldTerm,
  isFieldTerm,
  sameTerm,
  termKey,
  textOf,
  textTerm,
  toggledTerm,
  valuesOf,
  withoutTerm,
  withTerm,
  type FilterQuery,
  type FilterTerm,
} from './filter-query';

const ldap = fieldTerm('idProvider', 'ldap');
const entra = fieldTerm('idProvider', 'entraid');
const custom = fieldTerm('scope', 'custom');
const alice: FilterTerm = { kind: 'text', text: 'alice' };
const ward: FilterTerm = { kind: 'text', text: 'ward' };

const query: FilterQuery = [ldap, alice, entra, custom, ward];

describe('textOf', () => {
  it('joins the text terms with a space, in the order they were added', () => {
    expect(textOf(query)).toBe('alice ward');
  });

  it('is empty when the query holds no text', () => {
    expect(textOf([ldap, custom])).toBe('');
  });
});

describe('valuesOf', () => {
  it('collects every value of one field and no other', () => {
    expect(valuesOf(query, 'idProvider')).toEqual(new Set(['ldap', 'entraid']));
    expect(valuesOf(query, 'scope')).toEqual(new Set(['custom']));
  });

  it('is empty for a field the query does not narrow by', () => {
    expect(valuesOf(query, 'application').size).toBe(0);
  });
});

describe('sameTerm', () => {
  it('matches a field term by field and value', () => {
    expect(sameTerm(ldap, fieldTerm('idProvider', 'ldap'))).toBe(true);
    expect(sameTerm(ldap, fieldTerm('scope', 'ldap'))).toBe(false);
  });

  it('never matches a text term against a field term', () => {
    expect(sameTerm(alice, fieldTerm('alice', 'alice'))).toBe(false);
    expect(sameTerm(alice, { kind: 'text', text: 'Alice' })).toBe(true);
  });
});

describe('termKey', () => {
  it('tells terms apart the way sameTerm does', () => {
    expect(termKey(alice)).toBe(termKey({ kind: 'text', text: 'ALICE' }));
    expect(termKey(ldap)).not.toBe(termKey(entra));
    expect(termKey(alice)).not.toBe(termKey(fieldTerm('text', 'alice')));
  });

  it('keeps a separator inside an id from colliding with another term', () => {
    expect(termKey({ kind: 'text', text: 'a=b' })).not.toBe(termKey(fieldTerm('text:a', 'b')));
    expect(termKey(fieldTerm('a', 'b=c'))).not.toBe(termKey(fieldTerm('a=b', 'c')));
  });
});

describe('isFieldTerm', () => {
  it('narrows by kind', () => {
    expect(isFieldTerm(ldap)).toBe(true);
    expect(isFieldTerm(alice)).toBe(false);
  });
});

describe('textTerm', () => {
  it('trims what was typed', () => {
    expect(textTerm('  alice ')).toEqual({ kind: 'text', text: 'alice' });
  });

  it('makes nothing of a blank', () => {
    expect(textTerm('   ')).toBeUndefined();
  });
});

describe('withTerm', () => {
  it('adds a term at the end', () => {
    expect(withTerm([ldap], alice)).toEqual([ldap, alice]);
  });

  it('leaves a query alone that already holds the term', () => {
    expect(withTerm(query, ldap)).toBe(query);
    expect(withTerm(query, { kind: 'text', text: 'alice' })).toBe(query);
  });

  // The matching ignores case, so `Foo` and `foo` would narrow by the same word twice.
  it('reads a text term that differs only in case as the one already held', () => {
    expect(withTerm(query, { kind: 'text', text: 'ALICE' })).toBe(query);
    expect(withTerm(query, fieldTerm('idProvider', 'LDAP'))).toHaveLength(query.length + 1);
  });

  it('leaves the query it was given alone', () => {
    const original = [ldap];
    withTerm(original, alice);

    expect(original).toEqual([ldap]);
  });
});

describe('toggledTerm', () => {
  it('adds a term the query does not hold', () => {
    expect(toggledTerm([ldap], entra)).toEqual([ldap, entra]);
  });

  it('takes out a term the query holds, wherever it is', () => {
    expect(toggledTerm(query, entra)).toEqual([ldap, alice, custom, ward]);
  });
});

describe('withoutTerm', () => {
  it('drops the term at an index', () => {
    expect(withoutTerm(query, 1)).toEqual([ldap, entra, custom, ward]);
  });

  it('ignores an index the query has no term at', () => {
    expect(withoutTerm(query, 9)).toEqual(query);
  });
});
