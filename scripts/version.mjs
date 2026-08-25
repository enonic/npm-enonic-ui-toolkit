#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Lockstep versioning: the root and every package always carry the same version, and the
// release tag has to match it. See docs/releasing.md.

const version = process.argv[2];

if (version == null || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('Usage: pnpm version:set <x.y.z[-tag]>');
  process.exit(1);
}

const root = new URL('..', import.meta.url).pathname;
const manifests = [
  join(root, 'package.json'),
  ...readdirSync(join(root, 'packages')).map((name) =>
    join(root, 'packages', name, 'package.json'),
  ),
];

for (const path of manifests) {
  const source = readFileSync(path, 'utf8');
  const field = /("version":\s*")[^"]+(")/;

  if (!field.test(source)) {
    console.error(`No version field in ${path}`);
    process.exit(1);
  }

  const updated = source.replace(field, `$1${version}$2`);

  writeFileSync(path, updated);
  console.log(`${JSON.parse(updated).name} -> ${version}`);
}
