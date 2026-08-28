#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// `vp pack` externalizes a bare specifier it cannot resolve and still exits 0, so nothing in
// the build itself enforces that what `dist` imports is declared. Run from a package directory
// after `vp pack`: every bare specifier the emitted files import must appear in dependencies
// or peerDependencies — an undeclared sibling, a stray `react`, or a `node:*` import in browser
// code all fail here instead of at the consumer. The inverse mistake — a resolvable dependency
// bundled *into* dist — is `deps.onlyBundle` in the pack config, not this script.

const pkgDir = process.cwd();
const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const declared = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
]);

const distDir = join(pkgDir, 'dist');
const files = readdirSync(distDir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(js|mjs|cjs|d\.ts|d\.mts|d\.cts)$/.test(entry.name))
  .map((entry) => relative(distDir, join(entry.parentPath, entry.name)));

if (files.length === 0) {
  console.error(
    `[assert-externals] nothing to scan in dist/ of ${manifest.name} — did the build run?`,
  );
  process.exit(1);
}

const importRe =
  /(?:^|[\n;])\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|[\n;])\s*import\s*['"]([^'"]+)['"]|\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g;

const violations = [];
for (const file of files) {
  const source = readFileSync(join(distDir, file), 'utf8');
  for (const match of source.matchAll(importRe)) {
    const spec = match[1] ?? match[2] ?? match[3];
    if (spec.startsWith('.') || spec.startsWith('/')) continue;
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (!declared.has(name)) violations.push({ spec, name, file });
  }
}

if (violations.length > 0) {
  for (const { spec, name, file } of violations) {
    console.error(
      `dist/${file} imports '${spec}', but '${name}' is not in dependencies or peerDependencies of ${manifest.name}`,
    );
  }
  process.exit(1);
}
console.log(`[assert-externals] every bare import in dist is declared (${manifest.name})`);
