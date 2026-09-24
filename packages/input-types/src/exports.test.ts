import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// The entries may only re-export by name: `export { … } from` or `export type { … } from`. Which
// names they export is the entry's own diff; this catches the forms a review skims past.
function unreadableExports(entry: string): string[] {
  const source = readFileSync(new URL(entry, import.meta.url), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  return [...source.matchAll(/^export\b/gm)].flatMap(({ index }) => {
    const statement = /export (type )?\{[^}]*\} from '[^']+';$/my;
    statement.lastIndex = index;
    return statement.test(source) ? [] : [source.slice(index).split('\n', 1)[0]!];
  });
}

describe('public entries', () => {
  it.each(['./index.ts', './data/index.ts', './schema/index.ts'])(
    '%s only re-exports by name',
    (entry) => {
      expect(unreadableExports(entry)).toEqual([]);
    },
  );
});
