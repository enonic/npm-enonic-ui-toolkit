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
workspace wiring was checked on the first `ui-kit → ui-utils` edge before it moved out again: the
sibling stays an import in the emitted `.d.ts` (`import { Phrases } from '@enonic/ui-utils'`) rather
than being copied in, and `vp run -r` builds the dependency first. What that edge broke was
`pnpm check` on a clean checkout — `vp lint` reads the depending package's tsconfig, which has no
`paths`, resolves the sibling through node_modules to a `dist/index.d.ts` that no build has made yet,
and fails with TS2307. A package other packages depend on therefore points its `main`, `types` and
`exports` at `src/index.ts` and carries the `dist` versions under `publishConfig`, which pnpm swaps
in at publish; `ui-utils` does so, and `ui-types` since `input-types` took its first import from it. The published `.d.ts` still keeps the sibling as an import,
because what decides that is the depending package's manifest, not where the import resolves.

## What is a peer and what is a dependency

The rule, with `@enonic/ui`'s own manifest as the precedent: **peer** for what must exist exactly
once in a consumer's bundle, or what appears in a public signature; **regular dependency** for
internals that tolerate two copies. A peer is declared when the code that needs it lands, not
before.

Where that rule lands for the code these packages are waiting for (\* = optional peer, see the
next section):

| Package       | Peer                                                                                                         | Dependency                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `ui-types`    | —                                                                                                            | —                                                                            |
| `ui-utils`    | `neverthrow`\*                                                                                               | `nanostores`                                                                 |
| `ui-kit`      | `react`\*, `react-dom`\*, `preact`\*, `@enonic/ui`, `react-virtuoso`, `react-resizable-panels`               | `@enonic/ui-types`, `@enonic/ui-utils`, `@nanostores/preact`, `lucide-react` |
| `input-types` | `react`\*, `react-dom`\*, `preact`\*, `@enonic/ui`, `@dnd-kit/core`, `@dnd-kit/sortable`, `focus-trap-react` | `@enonic/ui-types`, `@enonic/ui-utils`, `lucide-react`                       |

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
  deduplicate to one copy, and none of them holds module-level state or a React context: the i18n
  adapters in `ui-utils` read the application's store through a closure, never one of their own, and
  the one context every layer's labels resolve through lives in `@enonic/ui`, already a peer.
- **Auto-installed peers are off** (`autoInstallPeers: false`). With it on, an optional `react` peer
  put the real React into the lockfile next to preact, and a regenerated lock put it back.
- **`@tanstack/react-router` appears nowhere.** Routing belongs to the host application; extracted
  widgets take the path and a callback as props.
- **`tailwindcss` is a devDependency** — it builds the packages, a consumer never receives it.

## How a package says anything

Every layer renders labels of its own — `@enonic/ui`'s close buttons and pickers, the kit's dialogs,
the form package's controls — and an application translates them all through one function at its
root. The pieces sit where a React context can reach them:

- **`@enonic/ui` owns the context**: `I18nProvider`, `useTranslate` and `usePhrases(fragment)`, and
  reads its own labels through them. A context only works for code that imports the same
  `createContext` call; `input-types` may not import `ui-kit`, and `@enonic/ui` could not see a kit
  context at all, so the base layer is the only home that reaches all three — where react-aria puts
  its `I18nProvider` for the same reason. A context here and one there would leave a supported
  combination with two disconnected contexts and the base labels silently English.
- **`ui-utils` owns the framework-free core**, on the package's root entry, which resolves nothing
  outside the package; the transport and its `neverthrow` sit behind `@enonic/ui-utils/request`: the `Translate` type — structurally the one
  `@enonic/ui` declares, which takes no dependency on this workspace — and the adapters over an
  application's phrase source (`fromPhrases`, `fromLookup`, `passthrough`), `bindPhrases` for a
  store, `mergePhrases` for a package's catalogue, `comparePhrases` for an application's check.
- **The component packages own fragments and nothing else**: each component keeps its English in a
  fragment beside it, keyed `enonic.uiKit.<component>.<name>` — the `enonic.` namespace `@enonic/ui`
  chose for its own `enonic.ui.*` keys, so neither collides with an application's own — resolves it through `usePhrases` from
  `@enonic/ui`, and the package exports its merged catalogue. The first text-bearing component sets
  the `@enonic/ui` release that ships the provider as the kit's peer floor.

The function takes the English in rather than answering `undefined` on a miss: every translate
function in the estate answers `#key#` for a key it lacks, so none of them could be handed over as
is, while `defaultValue` makes each adapter one line and an i18next adapter `t(key, { defaultValue })`.

Two limits are the core's, not any one component's:

- **No plural forms.** `localize` fills `{0}`-style placeholders and nothing else. A phrase that
  varies with a count is two keys, `<name>.single` and `<name>.multiple`, and the component picks
  one — the convention Content Studio's own phrase files already follow.
- **Phrases are resolved as they render.** A component re-renders when the `Translate` it reads
  changes identity; an application whose phrases change after mount hands the provider a new one,
  and hoists the adapter out of the render so an unchanged one keeps its identity.

## React, or Preact via compat

React is the target and Preact an equally supported runtime, exactly as `@enonic/ui@1.2.0`
encodes it. Sources are written as React code (`import { useState } from 'react'`); the emitted
`dist` carries `react` as a bare external; and with the first component `react`, `react-dom` and
`preact` all land as peers with `peerDependenciesMeta: { optional: true }` — the consumer picks
one framework. A React consumer aliases nothing. A Preact consumer maps `react` and `react-dom`
to `preact/compat` in its bundler, and the `optional` flag is what keeps pnpm's automatic peer
installation from pulling the real React in next to it.

The workspace itself tests on Preact through the compat aliases in the root Vite config — a
dev-time choice, not part of the published contract. JSX compiles against `react/jsx-runtime`
(`jsxImportSource: react`) so that `dist` imports React's runtime, which the aliases point at
Preact in tests and a Preact consumer points there in its bundler. Never import `preact/compat`
directly in package sources.

## How it is built

- **ESM only.** Every consumer bundles. If server-side XP code ever needs one of these packages, a
  `cjs` output is a one-line change to that package's `pack` config — worth doing then, not now.
- **No CSS is published yet.** How `ui-kit` reaches a consumer's Tailwind build is an open
  question tracked on the epic.

## What a package declares

A package declares every bare import under its `src`, tests and stories included — `vitest` as a
devDependency where a test imports it, `@storybook/preact-vite` where a story does, not borrowed
from the root manifest. Storybook itself and what it needs to render `@enonic/ui` are the root's. The root's devDependencies are the
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
