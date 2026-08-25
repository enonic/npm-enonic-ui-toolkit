# Architecture

## Why the packages split this way

`@enonic/ui` (`npm-enonic-ui`) is a component library with no opinion about a domain: a button, a
dialog, a select. Above it every Enonic application rebuilds the same things — a browse screen, a
split panel with a toolbar over it, a form built from XP's input types, a request transport, date
and string formatting, a phrase lookup. Content Studio and the admin applications have each solved
that once, differently. This repository is where the second copy stops being written.

The split is by **what a consumer has to accept to use it**, not by subject matter. Types cost
nothing. Helpers cost a few kilobytes and no view layer. Components cost Preact, `@enonic/ui` and a
styling contract. Input types cost all of that plus XP's schema model. A consumer that only needs a
date formatter should not be made to install a component library to get one, and that is the whole
reason there is more than one package here.

### `@enonic/ui-types`

Types and nothing else — no runtime, no dependencies, no imports. Two kinds of thing live here:

- **Base domain types** shared across applications and packages, where a wrong shape would be a bug
  in two repositories at once: content, principals, schema shapes.
- **Behavioural contracts between applications** — the named shape two independently released
  programs have to agree on to talk. A contract belongs here exactly when both sides ship
  separately; a prop type read by one component does not.

The first of those contracts is the admin section contract from app-settings' extensions work
(`docs/extensions/docs.md` in that repository): what the shell hands a section it mounts. The
decision to keep it here is made; the types move when that work reaches the extraction phase, not
before.

### `@enonic/ui-utils`

Everything that is useful without a view layer: strings, URLs, dates and formatting, the GraphQL
request transport, the i18n core (the phrase store and the lookup, never the phrases). **Nothing
here imports Preact or a component.** That rule is the package's whole value — it can be used from
a store, a worker, a test, or code that has no DOM at all.

The i18n core is mechanism only: phrases always come from the consumer, which fetches them from its
own server and feeds them in.

### `@enonic/ui-kit`

The composite components — what `@enonic/ui` would be if its parts carried behaviour. Layouts,
split panels, toolbars, browse screens with their list and details columns, dialog and form shells.
A component belongs here when it holds state, coordinates several base components, or encodes a
screen pattern that more than one application repeats.

This is the package that makes screens from different applications look and behave alike, so it is
also the one where a change is most expensive. Props in, callbacks out: nothing here may reach into
a host application's configuration, stores, router or phrase keys.

### `@enonic/input-types`

XP's input types as Preact components, and the form that composes them from a schema. Separate from
`ui-kit` because the dependency runs one way and the audience is narrower: a form is a screen
element, but XP's schema model is a domain the rest of the toolkit knows nothing about.

## Two consumers, from the first line of code

The toolkit answers to the admin applications **and** to Content Studio, and it has to keep doing
both. A design that fits only one of them is a defect here, not a trade-off: the whole reason the
packages exist is that these applications solved the same problems separately, and a toolkit that
serves one of them is just a third copy with a nicer name.

What that means concretely, measured against Content Studio's manifests rather than assumed: its
`modules/lib` already installs `preact ^10.29.8`, `@enonic/ui ^1.1.1`, `nanostores ^1.5.1` with
`@nanostores/preact`, `neverthrow ^8.2.0`, `react-virtuoso ^4.18.11`, `tailwindcss ^4.3.3`,
TypeScript 7 and vitest 4. Every version this toolkit plans to peer on is a version Content Studio
has already chosen, so nothing here asks it to move first. It builds with Vite, so an ESM-only
package is not a problem for it either.

Its `v6` tree also shows what is waiting to move: `widgets/` (browse-grid, browse-toolbar,
browse-tree, context-panel, preview-panel, inspectors), `shared/ui/split-view`, and
`features/shared/form/input-types` — the union of those and app-settings' `widgets/` is the shape
`ui-kit` and `input-types` have to end up fitting.

Out of scope, so nobody expects otherwise: Content Studio's `lib-admin-ui` layer, the page editor
and the rich-text editor are separate packages with separate lifetimes, and none of them is toolkit
material.

## Dependency direction

```
ui-types  ←  ui-utils  ←  ui-kit
                      ←  input-types
```

One way, no cycles. `ui-types` depends on nothing at all. `input-types` and `ui-kit` are siblings
with no edge between them; if one is ever needed by the other, the edge goes `input-types → ui-kit`
and never back — a split panel must not depend on a form.

The arrows are what a package is **allowed** to depend on, which is not the same as what it
declares. Today nothing declares a runtime dependency at all, and that is deliberate: `ui-utils`
works on primitives and type parameters, and `ui-kit` and `input-types` have no component yet to
name a domain type in a prop. An edge is declared by the first import that crosses it — as a
dependency rather than a devDependency whenever the imported name reaches an exported signature,
because the consumer needs it to resolve.

An edge nobody walks is worse than an absent one: the manifest is the only thing deciding what
stays external to a build, so everything in it has to mean something. The cost of keeping it honest
is that the workspace wiring — `workspace:^` resolving to a link, the build ordering that follows
from it — has no live example in the repository. Re-check it when the first real edge lands.

Internal dependencies are declared as `workspace:^` and published as a real version range, so a
released package asks for its siblings by version like any other consumer would.

## What is a peer and what is a dependency

The rule, with `@enonic/ui`'s own manifest as the precedent: **peer** for what must exist exactly
once in a consumer's bundle, or what appears in a public signature; **regular dependency** for
internals that tolerate two copies.

Where that rule lands for the code these packages are waiting for:

| Package       | Peer                                                               | Dependency                                                                   |
| ------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `ui-types`    | —                                                                  | —                                                                            |
| `ui-utils`    | `neverthrow`                                                       | `nanostores`                                                                 |
| `ui-kit`      | `preact`, `@enonic/ui`, `react-virtuoso`, `react-resizable-panels` | `@enonic/ui-types`, `@enonic/ui-utils`, `@nanostores/preact`, `lucide-react` |
| `input-types` | `preact`, `@enonic/ui`                                             | `@enonic/ui-types`, `@enonic/ui-utils`                                       |

A peer is declared when the code that needs it lands, not before. An empty package declaring peers
would only make the first install harder to reason about.

The calls in that table that are not obvious from the rule alone:

- **`@enonic/ui` is a peer because of `PortalProvider`.** It is a Preact context, and a context
  created in one copy of a package is invisible to components from another: two copies means an
  overlay portals somewhere other than the layer its section opened, silently. The floor of the
  range is the first version shipping `AppRoot`, which is not released yet.
- **`neverthrow` is a peer because `Result` is a class in an exported signature.** The transport
  answers with `ResultAsync<T, E>` and consumers call `.match()` on it; two copies of the library
  are two unrelated classes, and an `instanceof` across that boundary fails.
- **`nanostores` is a dependency because an atom has no identity to share.** It is a structural
  `{get, subscribe}` object — a subscriber does not care which copy of the library made it. Icon
  packs are dependencies for the same reason: leaf components, nothing to match against.
- **`react-virtuoso` is a peer to mirror `@enonic/ui`'s own manifest.** Declaring it as a
  dependency here would let a consumer end up with two virtualizers behind one list.
- **`react-resizable-panels` is a peer for the `PortalProvider` reason.** A panel finds its group
  through a React context, so a group from one copy and a panel from another do not see each other.
  Content Studio's `shared/ui/split-view` is already built on it, which is also why the split panel
  in `ui-kit` should be the same library rather than a second implementation.
- **`@enonic/ui`'s own peers are not re-declared** — `@radix-ui/react-slot`, `focus-trap-react`,
  `tw-animate-css` are its contract with the consumer, not ours. They appear here only as
  devDependencies of the packages that build against it.
- **`preact` is always a peer, `react` is never a dependency at all.** `react` and `react-dom` are
  aliased to `preact/compat` at build time; declaring them would eventually pull the real React in.
- **`tailwindcss` is a devDependency, not a runtime one.** It builds and previews the packages; it
  is not something a consumer receives. That changes only if `ui-kit` starts shipping compiled CSS
  — see the open questions.
- **The workspace packages are dependencies, not peers.** Lockstep versions plus a `^` range
  deduplicate to one copy, and making a consumer install all four by hand buys nothing. The caveat
  is `ui-utils`, which owns the phrase store: module-level state duplicated in a bundle would take
  writes in one copy and reads from the other. If that ever happens, `@enonic/ui-utils` becomes a
  peer of the packages that hold it, which is the only cure for that class of bug.
- **`@tanstack/react-router` appears nowhere.** Routing belongs to the host application; the
  extracted widgets take the path and a callback as props.

## Preact, not React

Every package here is Preact, like `@enonic/ui`. `react` and `react-dom` are aliased to
`preact/compat` in the workspace Vite config, and `@types/react` is what the ecosystem's types
import. Consumers do the same aliasing in their own builds.

## How it is built

- **`vp pack` per package** (`vite-plus`, which is tsdown underneath): one entry, `dist/index.js`
  plus `dist/index.d.ts`, ESM only, `es2023`, source maps, and `publint` on every build so a broken
  `exports` or `files` field fails the build rather than the install.
- **ESM only.** Every consumer bundles. If server-side XP code (CommonJS under GraalJS) ever needs
  one of these packages, adding a `cjs` output is a one-line change to that package's `pack` config
  — worth doing then, not now.
- **`vp run -r build`** walks the packages in dependency order and caches: a second build with
  nothing changed is a cache hit, in CI too.
- **No CSS is published yet.** `@enonic/ui` distributes compiled stylesheets (`preset.css`,
  `tokens.css`, `base.css`, `utilities.css`); how `ui-kit` reaches a consumer's Tailwind build is an
  open question below.

## How it is typechecked

One program for the whole workspace: the root `tsconfig.json` includes every package's sources and
maps `@enonic/*` to sibling **sources** through `paths`, so a typecheck needs no build and a change
in `ui-utils` is seen immediately by `ui-kit`.

A package's own `tsconfig.json` deliberately has **no** path mapping, and the reason is narrower
than it looks. What decides whether a sibling stays an import in the emitted `.d.ts` is the
package's own `dependencies` and `peerDependencies` — everything declared there is external to the
build, path mapping or not. Measured on this toolchain with a throwaway type passed between two of
these packages: while the sibling was declared, the emitted declaration kept
`import { … } from "@enonic/ui-types"` whether or not the paths were mapped to source.

What path mapping removes is the guardrail. Mapped to source, a package compiles against a sibling
it never declared — and then that sibling is not external, so its types are **copied** into the
published `.d.ts` and its values would be bundled into the published `.js`. The consumer installs
one package and silently receives a second one's code, frozen at the version that happened to be
checked out. `publint` reports no issues in that state. Without the mapping the same mistake is an
unresolved import at compile time, which is where it belongs.

## Workspace mechanics

- **The catalog holds the toolchain only** — TypeScript, Vite+, vitest, Preact, the shared type
  packages. Dependabot cannot update a `catalog:` specifier (dependabot-core#12244), so anything
  there is bumped by hand; a package's own dependencies stay in its `package.json`, where Dependabot
  updates them normally.
- **Formatting, linting and tests are the workspace root's**, building is each package's. One
  oxfmt/oxlint pass over everything, one vitest run, four independent builds.
- Tests sit next to the code as `*.test.ts`. The environment is `node` and no DOM library is
  installed, so component rendering is not tested yet — see the open questions.

## Open questions

- **How `ui-kit` reaches a consumer's Tailwind build.** Its components carry utility classes in
  their markup, which Tailwind only emits if it scans them. Either every consumer adds an
  `@source` for the package, or `ui-kit` ships compiled CSS the way `@enonic/ui` does. This has to
  be answered before the first component lands, because it decides whether `dist` contains CSS.
- **Component testing.** Nothing renders a component here today, but Content Studio already tests
  its own with `@testing-library/preact` — its form and selector tests sit next to the code that
  `input-types` is meant to absorb, and they travel with it. So the answer is probably a DOM
  environment and testing-library rather than Storybook, whose shadow-root smoke belongs to
  `@enonic/ui` and its components. Decide before the first extraction, not after.
