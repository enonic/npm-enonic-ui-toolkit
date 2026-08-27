# Architecture

## Why the packages split this way

`@enonic/ui` (`npm-enonic-ui`) is a component library with no opinion about a domain: a button, a
dialog, a select. Above it every Enonic application rebuilds the same things — a browse screen, a
split panel with a toolbar over it, a form built from XP's input types, a request transport, date
and string formatting, a phrase lookup. Content Studio and the admin applications have each solved
that once, differently. This repository is where the second copy stops being written.

The split is by **what a consumer has to accept to use it**, not by subject matter. Types cost
nothing (`ui-types`). Helpers cost a few kilobytes and no view layer (`ui-utils`). Components cost
Preact, `@enonic/ui` and a styling contract (`ui-kit`). Input types cost all of that plus XP's
schema model (`input-types`). A consumer that only needs a date formatter should not be made to
install a component library to get one, and that is the whole reason there is more than one package
here.

What belongs in each package is on that package's README. Two boundary decisions are recorded here
because they are easy to lose:

- The first contract in `ui-types` is the admin section contract from app-settings' extensions
  work (`docs/extensions/docs.md` in that repository): what the shell hands a section it mounts.
  The decision to keep it here is made; the types move when that work reaches the extraction
  phase, not before.
- `input-types` and `ui-kit` are siblings with no edge between them. If one is ever needed by the
  other, the edge goes `input-types → ui-kit` and never back — a split panel must not depend on a
  form.

## Two consumers, from the first line of code

The toolkit answers to the admin applications **and** to Content Studio, and it has to keep doing
both — a design that fits only one of them is a defect, not a trade-off. Content Studio's
`modules/lib` manifests already carry every version this toolkit plans to peer on (preact,
`@enonic/ui`, nanostores, neverthrow, react-virtuoso, TypeScript 7, vitest 4), so nothing here asks
it to move first; it builds with Vite, so ESM-only is fine. Its `v6` tree (`widgets/`,
`shared/ui/split-view`, `features/shared/form/input-types`) united with app-settings' `widgets/` is
the shape `ui-kit` and `input-types` have to end up fitting.

Out of scope: Content Studio's `lib-admin-ui` layer, the page editor and the rich-text editor are
separate packages with separate lifetimes.

## Dependency direction

```
ui-types  ←  ui-utils  ←  ui-kit
                      ←  input-types
```

One way, no cycles; `ui-types` depends on nothing at all. The arrows are what a package is
**allowed** to depend on, not what it declares: today nothing declares a runtime dependency, and an
edge is declared by the first import that crosses it — as a dependency rather than a devDependency
whenever the imported name reaches an exported signature. An edge nobody walks is worse than an
absent one: the manifest decides what stays external to a build, so everything in it has to mean
something.

Internal dependencies are declared as `workspace:^` and published as a real version range. The
workspace wiring has no live example yet — re-check the build ordering when the first real edge
lands.

## What is a peer and what is a dependency

The rule, with `@enonic/ui`'s own manifest as the precedent: **peer** for what must exist exactly
once in a consumer's bundle, or what appears in a public signature; **regular dependency** for
internals that tolerate two copies. A peer is declared when the code that needs it lands, not
before.

Where that rule lands for the code these packages are waiting for:

| Package       | Peer                                                                                     | Dependency                                                                   |
| ------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ui-types`    | —                                                                                        | —                                                                            |
| `ui-utils`    | `neverthrow`                                                                             | `nanostores`                                                                 |
| `ui-kit`      | `preact`, `react`, `react-dom`, `@enonic/ui`, `react-virtuoso`, `react-resizable-panels` | `@enonic/ui-types`, `@enonic/ui-utils`, `@nanostores/preact`, `lucide-react` |
| `input-types` | `preact`, `react`, `react-dom`, `@enonic/ui`                                             | `@enonic/ui-types`, `@enonic/ui-utils`                                       |

The calls that are not obvious from the rule alone:

- **`@enonic/ui` is a peer because of `PortalProvider`.** A context created in one copy of a
  package is invisible to components from another: two copies means an overlay portals somewhere
  other than the layer its section opened, silently.
- **`neverthrow` is a peer because `Result` is a class in an exported signature.** Two copies are
  two unrelated classes, and an `instanceof` across that boundary fails.
- **`nanostores` is a dependency because an atom has no identity to share** — a structural
  `{get, subscribe}` object. Icon packs are dependencies for the same reason: leaf components,
  nothing to match against.
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

## React on Preact

Package sources are written as React code — `import { useState } from 'react'` — exactly like
`@enonic/ui`. The workspace `resolve.alias` mapping `react` to `preact/compat` serves **lint and
tests only**; `vp pack` is configured per package, resolves nothing, and emits `react` as a bare
external import. `react` and `react-dom` are therefore declared as peerDependencies alongside
`preact`, and the consumer's bundler maps them to `preact/compat` — the same aliases, in its own
config. The real React never installs on either side. Never import `preact/compat` directly in
package sources.

## How it is built

- **`vp pack` per package** (`vite-plus`, tsdown underneath): one entry, `dist/index.js` plus
  `dist/index.d.ts`, ESM only, `es2023`, source maps, `publint` on every build.
- **`scripts/assert-externals.mjs` after every pack**: `vp pack` externalizes a bare specifier it
  cannot resolve and still exits 0, so the build itself would let an undeclared sibling or a stray
  import ship. The assert fails the build unless every bare specifier in `dist` appears in that
  package's `dependencies` or `peerDependencies`.
- **ESM only.** Every consumer bundles. If server-side XP code ever needs one of these packages, a
  `cjs` output is a one-line change to that package's `pack` config — worth doing then, not now.
- **`vp run -r build`** walks the packages in dependency order and caches: a second local build
  with nothing changed is a cache hit. CI installs from scratch each run, so the task cache is cold
  there — wiring it up is deliberately deferred until the builds cost real time.
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
which is what `scripts/assert-externals.mjs` exists for.

## Workspace mechanics

- **The catalog holds the toolchain only** — TypeScript, Vite+, vitest, Preact, the shared type
  packages. Dependabot does read `catalog:` specifiers, but its catalog bumps break the lockfile
  (dependabot-core#12244), so anything there is bumped by hand — followed by a full regeneration
  (`rm -rf node_modules pnpm-lock.yaml && pnpm install`; with `node_modules` present the resolver
  reuses previously auto-installed peers), never an incremental update. A package's own
  dependencies stay in its `package.json`, where Dependabot updates them normally.
- **Formatting, linting and tests are the workspace root's**, building is each package's. One
  oxfmt/oxlint pass over everything, one vitest run, four independent builds.
- Tests sit next to the code as `*.test.ts`. The environment is `node` and no DOM library is
  installed; component testing (probably `@testing-library/preact`, which Content Studio already
  uses) is decided before the first extraction, tracked on the epic.
