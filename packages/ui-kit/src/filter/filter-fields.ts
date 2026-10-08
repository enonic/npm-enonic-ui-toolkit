import type { LucideIcon } from 'lucide-react';

import { isTextTerm, type FilterTerm } from './filter-query';

export type FilterValue = {
  id: string;
  label: string;
  /**
   * How many rows fall under this value, where that is knowable.
   *
   * ! Absent, not zero, where nothing can count: a value without a count is always offered — there is
   * ! nothing to tell it apart from an empty one.
   */
  count?: number;
  /** Values sharing a group are listed together under its label, after the ungrouped ones. */
  group?: string;
  /** Withheld for a reason other than an empty count; the caller says why, if anywhere. */
  disabled?: boolean;
};

/** A run of values the dropdown lists together: the ungrouped ones first and unlabelled, then each group. */
export type FilterValueGroup = {
  label?: string;
  values: readonly FilterValue[];
};

/** A field the filter offers, with the values it can take. */
export type FilterField = {
  id: string;
  label: string;
  icon?: LucideIcon;
  values: readonly FilterValue[];
  /** Whether several values can be picked at once, ORed. Off, a pick replaces the field's value. */
  multiple?: boolean;
  /** Shown above the values: why the list may be short or stale, such as a count request that failed. */
  notice?: string;
  /** The values are still being fetched; the dropdown says so instead of "no matches". */
  loading?: boolean;
};

/** A field named by what was typed, and whatever followed its label — `State: Started` pasted whole. */
export type TypedField = {
  field: FilterField;
  text: string;
};

/** What a tag shows for a term: the labels, falling back to the ids for a field or value no longer offered. */
export type TermLabel = {
  field?: string;
  value: string;
};

/** Whether a value can be picked: one with a count of zero would narrow the list to nothing. */
export function isOffered({ count, disabled }: FilterValue): boolean {
  return disabled !== true && (count === undefined || count > 0);
}

/**
 * The values by hits, most first, the ones with none last. A value without a count comes first: it is
 * offered whatever the rows, so it must not sink below the empty ones. Ties keep the field's own order.
 */
export function orderedValues(values: readonly FilterValue[]): FilterValue[] {
  return [...values].sort((a, b) => rank(b) - rank(a));
}

function rank({ count }: FilterValue): number {
  return count ?? Number.POSITIVE_INFINITY;
}

/**
 * The values as the dropdown lists them: the ungrouped ones first, then every group in the order it
 * first appears, each run ordered by hits on its own — a group's empty values sink to its end, not
 * to the end of the list, or the group would lose them to the one below.
 */
export function groupedValues(values: readonly FilterValue[]): FilterValueGroup[] {
  const runs = new Map<string | undefined, FilterValue[]>([[undefined, []]]);
  for (const value of values) {
    const run = runs.get(value.group);
    if (run === undefined) {
      runs.set(value.group, [value]);
    } else {
      run.push(value);
    }
  }

  return [...runs]
    .filter(([, run]) => run.length > 0)
    .map(([label, run]) => ({ label, values: orderedValues(run) }));
}

/** The fields whose label contains what was typed, case-insensitive; every field for a blank. */
export function matchingFields(fields: readonly FilterField[], typed: string): FilterField[] {
  const needle = typed.trim().toLowerCase();
  return needle.length === 0
    ? [...fields]
    : fields.filter(({ label }) => label.toLowerCase().includes(needle));
}

export function matchingValues(values: readonly FilterValue[], typed: string): FilterValue[] {
  const needle = typed.trim().toLowerCase();
  return needle.length === 0
    ? [...values]
    : values.filter(({ label }) => label.toLowerCase().includes(needle));
}

/** The forms a field's label is typed in to enter it: `Label:` always, plus what the tags show, as a locale punctuates it. */
export type FieldPrefixes = (label: string) => readonly string[];

const ASCII_PREFIXES: FieldPrefixes = (label) => [`${label}:`];

/**
 * The field a typed prefix names, case-insensitive, with the text after it: what was typed up to the
 * colon, or a whole `Label: value` pasted in. The longest prefix wins where one is a prefix of another.
 */
export function fieldTyped(
  fields: readonly FilterField[],
  typed: string,
  prefixesOf: FieldPrefixes = ASCII_PREFIXES,
): TypedField | undefined {
  const text = typed.trimStart();
  const needle = text.toLowerCase();
  const matches = fields.flatMap((field) =>
    prefixesOf(field.label)
      .filter((prefix) => prefix.length > 0 && needle.startsWith(prefix.toLowerCase()))
      .map((prefix) => ({ field, prefix })),
  );
  const longest = matches.sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return longest === undefined
    ? undefined
    : { field: longest.field, text: text.slice(longest.prefix.length).trim() };
}

export function termLabel(term: FilterTerm, fields: readonly FilterField[]): TermLabel {
  if (isTextTerm(term)) {
    return { value: term.text };
  }

  const field = fields.find(({ id }) => id === term.field);
  const value = field?.values.find(({ id }) => id === term.value);

  return { field: field?.label ?? term.field, value: value?.label ?? term.value };
}
