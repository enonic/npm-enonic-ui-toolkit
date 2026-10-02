/// <reference types="node" />
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// The entry may only re-export by name: `export { … } from` or `export type { … } from`. Which
// names it exports is the entry's own diff; this catches the forms a review skims past.
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

describe('public entry', () => {
  it('only re-exports by name', () => {
    expect(unreadableExports('./index.ts')).toEqual([]);
  });
});
