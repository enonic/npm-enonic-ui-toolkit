#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Lockstep versioning: the root and every package always carry the same version, and the
// release tag has to match it. See the Releasing section of README.md.

const version = process.argv[2];

// semver without build metadata, which npm strips from a published version anyway.
const identifier = String.raw`(0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)`;
const shape = new RegExp(
  String.raw`^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-${identifier}(\.${identifier})*)?$`,
);

if (version == null || !shape.test(version)) {
  console.error('Usage: pnpm version:set <x.y.z[-tag]>');
  process.exit(1);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const manifests = [
  join(root, 'package.json'),
  ...readdirSync(join(root, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, 'packages', entry.name, 'package.json')),
];

const field = /("version":\s*")[^"]+(")/;

// Read and validate every manifest before writing any, so a failure cannot leave them
// disagreeing on the version.
const updates = manifests.map((path) => {
  const source = readFileSync(path, 'utf8');

  if (!field.test(source)) {
    console.error(`No version field in ${path}`);
    process.exit(1);
  }

  return { path, updated: source.replace(field, `$1${version}$2`) };
});

for (const { path, updated } of updates) {
  writeFileSync(path, updated);
  console.log(`${JSON.parse(updated).name} -> ${version}`);
}
