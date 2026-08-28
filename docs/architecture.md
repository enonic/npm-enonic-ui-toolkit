# Architecture

Decisions and their reasons. What belongs in which package is on each package's README and in
CLAUDE.md's table; how to build, test and release the workspace is in README.md.

## Boundaries that are easy to lose

- The first contract in `ui-types` is the admin section contract from app-settings' extensions
  work (`docs/extensions/docs.md` in that repository): what the shell hands a section it mounts.
  The decision to keep it here is made; the types move when that work reaches the extraction
  phase, not before.
- `input-types` and `ui-kit` are siblings with no edge between them. If one is ever needed by the
  other, the edge goes `input-types → ui-kit` and never back — a split panel must not depend on a
  form.

## Dependency direction

One way, no cycles: `ui-types` depends on nothing, `ui-utils` only on `ui-types`, the two
component packages on both plus `@enonic/ui`. That is what a package is **allowed** to depend on,
not what it declares: an edge is declared by the first import that crosses it — as a dependency
rather than a devDependency whenever the imported name reaches an exported signature. An edge
nobody walks is worse than an absent one: the manifest decides what stays external to a build, so
everything in it has to mean something.

Internal dependencies are declared as `workspace:^` and published as a real version range. The
workspace wiring has no live example yet — re-check the build ordering when the first real edge
lands.

## What is a peer and what is a dependency

The rule, with `@enonic/ui`'s own manifest as the precedent: **peer** for what must exist exactly
once in a consumer's bundle, or what appears in a public signature; **regular dependency** for
internals that tolerate two copies. A peer is declared when the code that needs it lands, not
before.

Where that rule lands for the code these packages are waiting for (\* = optional peer, see the
next section):

| Package       | Peer                                                                                           | Dependency                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ui-types`    | —                                                                                              | —                                                                            |
| `ui-utils`    | `neverthrow`                                                                                   | `nanostores`                                                                 |
| `ui-kit`      | `react`\*, `react-dom`\*, `preact`\*, `@enonic/ui`, `react-virtuoso`, `react-resizable-panels` | `@enonic/ui-types`, `@enonic/ui-utils`, `@nanostores/preact`, `lucide-react` |
| `input-types` | `react`\*, `react-dom`\*, `preact`\*, `@enonic/ui`                                             | `@enonic/ui-types`, `@enonic/ui-utils`                                       |

The calls that are not obvious from the rule alone:

- **`@enonic/ui` is a peer because of `PortalProvider`.** A context created in one copy of a
  package is invisible to components from another: two copies means an overlay portals somewhere
  other than the layer its section opened, silently.
- **`neverthrow` is a peer because `Result` is a class in an exported signature.** Two copies are
  two unrelated classes, and an `instanceof` across that boundary fails.
- **`nanostores` is a dependency because an atom has no identity to share** — a structural
  `{get, subscribe}` object. Icon packs are dependencies for the same reason: leaf components,
  nothing to match against.
- **`@nanostores/preact` needs a revisit** before the first store-bound component lands: a hard
  Preact dependency contradicts the React target below.
- **`react-virtuoso` and `react-resizable-panels` are peers** for the same two reasons: the first
  mirrors `@enonic/ui`'s own manifest, the second finds its panel group through a context.
- **`@enonic/ui`'s own peers are not re-declared** — they are its contract with the consumer, not
  ours. They appear here only as devDependencies of the packages that build against it.
- **The workspace packages are dependencies, not peers.** Lockstep versions plus a `^` range
  deduplicate to one copy. The caveat is `ui-utils`, which owns the phrase store: if module-level
  state is ever duplicated in a bundle, `@enonic/ui-utils` becomes a peer of the packages that
  hold it.
- **`@tanstack/react-router` appears nowhere.** Routing belongs to the host application; extracted
  widgets take the path and a callback as props.
- **`tailwindcss` is a devDependency** — it builds the packages, a consumer never receives it.

## React, or Preact via compat

React is the target and Preact an equally supported runtime, exactly as `@enonic/ui@1.2.0`
encodes it. Sources are written as React code (`import { useState } from 'react'`); the emitted
`dist` carries `react` as a bare external; and with the first component `react`, `react-dom` and
`preact` all land as peers with `peerDependenciesMeta: { optional: true }` — the consumer picks
one framework. A React consumer aliases nothing. A Preact consumer maps `react` and `react-dom`
to `preact/compat` in its bundler, and the `optional` flag is what keeps pnpm's automatic peer
installation from pulling the real React in next to it.

The workspace itself builds and tests on Preact (`jsxImportSource: preact`, the compat aliases in
the root Vite config) — a dev-time choice, not part of the published contract. Never import
`preact/compat` directly in package sources.

## How it is built

- **ESM only.** Every consumer bundles. If server-side XP code ever needs one of these packages, a
  `cjs` output is a one-line change to that package's `pack` config — worth doing then, not now.
- **No CSS is published yet.** How `ui-kit` reaches a consumer's Tailwind build is an open
  question tracked on the epic.

## How it is typechecked

One program for the whole workspace: the root `tsconfig.json` includes every package's sources and
maps `@enonic/*` to sibling **sources** through `paths`, so a typecheck needs no build and a change
in `ui-utils` is seen immediately by `ui-kit`.

A package's own `tsconfig.json` deliberately has **no** path mapping. What decides whether a
sibling stays an import in the emitted `.d.ts` is the package's own `dependencies` and
`peerDependencies` — everything declared there is external to the build. Mapped to source, a
package compiles against a sibling it never declared, and that sibling's types are **copied** into
the published `.d.ts`, its values bundled into the published `.js`; `publint` reports no issues in
that state. Without the mapping the same mistake fails `pnpm check`: oxlint's type-aware pass reads
the package's own tsconfig, where an undeclared sibling does not resolve (TS2307). The root
typecheck does **not** catch it — `paths` resolve it — and `vp pack` externalizes it silently,
which is what `scripts/assert-externals.mjs` and `deps.onlyBundle` in the pack configs exist for.
