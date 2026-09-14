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

Internal dependencies are declared as `workspace:^` and published as a real version range. The first
real edge is `ui-kit → ui-utils`, and it settles the question this paragraph used to leave open: the
sibling stays an import in the emitted `.d.ts` (`import { Phrases } from '@enonic/ui-utils'`) rather
than being copied in, `vp run -r` builds ui-utils first, and ui-kit's own emit does not need that
build to have happened. What proves the two sides agree is the workspace typecheck, where `paths`
resolve the sibling to source.

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
| `ui-utils`    | `neverthrow`\*                                                                                 | `nanostores`                                                                 |
| `ui-kit`      | `react`\*, `react-dom`\*, `preact`\*, `@enonic/ui`, `react-virtuoso`, `react-resizable-panels` | `@enonic/ui-types`, `@enonic/ui-utils`, `@nanostores/preact`, `lucide-react` |
| `input-types` | `react`\*, `react-dom`\*, `preact`\*, `@enonic/ui`                                             | `@enonic/ui-types`, `@enonic/ui-utils`                                       |

The calls that are not obvious from the rule alone:

- **`@enonic/ui` is a peer because of `PortalProvider`.** A context created in one copy of a
  package is invisible to components from another: two copies means an overlay portals somewhere
  other than the layer its section opened, silently.
- **`neverthrow` is a peer because `Result` is a class in an exported signature.** Two copies are
  two unrelated classes, and an `instanceof` across that boundary fails. It is **optional** because
  only the transport needs it: a consumer of `localize` alone must not have it pulled in.
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
  deduplicate to one copy. `ui-utils` holds no module-level state — `fromPhrases` reads the
  application's store through a closure, never one of its own — so two copies of it are harmless.
  `ui-kit` is the exception: it holds `UiKitContext`, and a context created in one copy is
  invisible to components from another, so a kit component in a second copy speaks English past the
  application's provider, silently. The day `input-types` walks its allowed edge to `ui-kit`, it
  declares `@enonic/ui-kit` as a **peer**, by the same rule that makes `@enonic/ui` one.
- **`@tanstack/react-router` appears nowhere.** Routing belongs to the host application; extracted
  widgets take the path and a callback as props.
- **`tailwindcss` is a devDependency** — it builds the packages, a consumer never receives it.

## How a package says anything

The i18n core — `Translate`, `fromPhrases`, `resolveText` — is in `ui-utils`, because every package
with a screen needs it and `input-types` may not reach `ui-kit` for it. The React half — the
context, `UiKitProvider`, `useText` — is in `ui-kit`. Each package ships its own English in
fragments beside its components and resolves a key as it renders; the application translates by
handing one `Translate` to the provider. The full design is toolkit issue #13.

Two limits are the core's, not any one component's:

- **No plural forms.** `localize` fills `{0}`-style placeholders and nothing else. A phrase that
  varies with a count is two keys, `<name>.single` and `<name>.multiple`, and the component picks
  one — the convention Content Studio's own phrase files already follow.
- **`@enonic/ui` speaks English of its own** — `Dialog`'s close button, `SearchField`'s
  placeholder and clear label, the date picker's month navigation — and reads none of it from the
  kit's provider. Where a base component takes the text as a prop, the kit component that composes
  it passes its own phrase through; where it does not, the text stays English until `@enonic/ui`
  grows the prop.

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

That dev-time choice has one seam: `vp pack` reads the **package's** tsconfig, so a package with JSX
overrides `jsxImportSource` to `react` there. Without the override the emitted `dist` imports
`preact/jsx-runtime`, which makes preact a hard runtime dependency of every consumer — and the
declaration check passes, because preact is a declared optional peer. `scripts/assert-externals.mjs`
refuses a `preact` import in dist for that reason.

## How it is built

- **ESM only.** Every consumer bundles. If server-side XP code ever needs one of these packages, a
  `cjs` output is a one-line change to that package's `pack` config — worth doing then, not now.
- **No CSS is published yet.** How `ui-kit` reaches a consumer's Tailwind build is an open
  question tracked on the epic.

## What a package declares

A package declares every bare import under its `src`, tests included — `vitest` as a devDependency
where a test imports it, not borrowed from the root manifest. The root's devDependencies are the
workspace toolchain, and a package that happens to resolve through them is one `pnpm install` away
from not resolving; the TS2307 guard below cannot see it, because pnpm never places an undeclared
sibling in the root but does place the root's own devDependencies there.

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
