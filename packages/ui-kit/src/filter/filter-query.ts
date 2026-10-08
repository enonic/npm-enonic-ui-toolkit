/**
 * One term of a filter: a value of a named field, or free text. Ids, never labels — what a term
 * is called is the business of whoever offers the fields. Discriminated by `kind`, so a term shape
 * added later fails to compile where it is not handled instead of passing for one of these.
 */
export type FieldTerm = { kind: 'field'; field: string; value: string };
export type TextTerm = { kind: 'text'; text: string };
export type FilterTerm = FieldTerm | TextTerm;

/** What a list is narrowed by, in the order the terms were added. */
export type FilterQuery = readonly FilterTerm[];

export const EMPTY_FILTER: FilterQuery = [];

export function fieldTerm(field: string, value: string): FieldTerm {
  return { kind: 'field', field, value };
}

export function isTextTerm(term: FilterTerm): term is TextTerm {
  return term.kind === 'text';
}

export function isFieldTerm(term: FilterTerm): term is FieldTerm {
  return term.kind === 'field';
}

/** A key that tells terms apart in a list, stable across renders; a tuple, so no id can collide with another kind. */
export function termKey(term: FilterTerm): string {
  return JSON.stringify(
    isTextTerm(term) ? [term.kind, term.text.toLowerCase()] : [term.kind, term.field, term.value],
  );
}

/** The free text of a query as one string, the text terms joined by a space. */
export function textOf(query: FilterQuery): string {
  return query
    .filter(isTextTerm)
    .map(({ text }) => text)
    .join(' ');
}

/** Every value the query holds for a field. Empty narrows nothing, the reading every multi-select filter takes. */
export function valuesOf(query: FilterQuery, field: string): ReadonlySet<string> {
  const values = new Set<string>();
  for (const term of query) {
    if (!isTextTerm(term) && term.field === field) {
      values.add(term.value);
    }
  }
  return values;
}

/** Text is compared without regard to case, as the matching reads it; a value by its id, exactly. */
export function sameTerm(a: FilterTerm, b: FilterTerm): boolean {
  if (isTextTerm(a) || isTextTerm(b)) {
    return isTextTerm(a) && isTextTerm(b) && a.text.toLowerCase() === b.text.toLowerCase();
  }

  return a.field === b.field && a.value === b.value;
}

/** A text term from what was typed, or nothing for a blank. */
export function textTerm(typed: string): TextTerm | undefined {
  const text = typed.trim();
  return text.length === 0 ? undefined : { kind: 'text', text };
}

/** The query with a term added at the end; one it already holds leaves it unchanged. */
export function withTerm(query: FilterQuery, term: FilterTerm): FilterQuery {
  return query.some((held) => sameTerm(held, term)) ? query : [...query, term];
}

export function withoutTerm(query: FilterQuery, index: number): FilterQuery {
  return query.filter((_, at) => at !== index);
}

/** The query with a term taken out if it holds it, and added at the end if it does not. */
export function toggledTerm(query: FilterQuery, term: FilterTerm): FilterQuery {
  const held = query.some((candidate) => sameTerm(candidate, term));
  return held ? query.filter((candidate) => !sameTerm(candidate, term)) : [...query, term];
}
