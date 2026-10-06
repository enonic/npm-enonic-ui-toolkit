/**
 * A phrase with its `{n}` placeholders replaced by values that are not strings — a node to render
 * a name in bold inside a sentence the translator sees whole. A placeholder with no value stays as
 * written, as `localize` leaves it.
 */
export function fillPhrase<T>(phrase: string, values: readonly T[]): (string | T)[] {
  const parts: (string | T)[] = [];
  let last = 0;

  for (const match of phrase.matchAll(/\{(\d+)\}/g)) {
    const value = values[Number(match[1])];
    if (value === undefined) {
      continue;
    }
    const text = phrase.slice(last, match.index);
    if (text !== '') {
      parts.push(text);
    }
    parts.push(value);
    last = match.index + match[0].length;
  }

  const rest = phrase.slice(last);
  if (rest !== '') {
    parts.push(rest);
  }

  return parts;
}
