# Enonic UI Toolkit

A pnpm monorepo publishing four npm packages: the layer between `@enonic/ui` and an Enonic
application. **Read `docs/architecture.md` before adding code to a package or moving code between
packages** — what belongs where, the dependency direction, and the peer-versus-dependency rule are
decided there.

| Package               | Contains                                                                                   | May depend on                        |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| `@enonic/ui-types`    | types only — base domain types, contracts between separately released applications         | nothing                              |
| `@enonic/ui-utils`    | strings, URLs, dates, formatting, the request transport, the i18n core — **no view layer** | `ui-types`                           |
| `@enonic/input-types` | XP input types as React components, and the form that composes them                        | `ui-types`, `ui-utils`, `@enonic/ui` |
| `@enonic/ui-kit`      | composite React components with behaviour: layouts, split panels, toolbars, browse screens | `ui-types`, `ui-utils`, `@enonic/ui` |

## Commands

```bash
pnpm check                        # format, lint (type-aware oxlint), workspace typecheck — the gate
pnpm check:fix                    # same, fixing format and lint
pnpm build                        # every package in dependency order, cached
pnpm test                         # vitest, node environment
vp run -F @enonic/ui-kit build    # one package
pnpm version:set 0.2.0            # lockstep bump of all five manifests (see README → Releasing)
```

## Rules that break the published packages silently

- Everything `dist` imports must be declared in that package's `dependencies` or
  `peerDependencies` — `vp pack` externalizes what it cannot resolve and still exits 0;
  `scripts/assert-externals.mjs` fails the build on the difference. The inverse — a resolvable
  devDependency bundled _into_ dist — is an error via `deps.onlyBundle: []` in each pack config.
- Package sources import `react`, never `preact/compat` — the workspace alias serves lint and
  tests only, and the published artifact carries bare `react` imports. `react`, `react-dom` and
  `preact` become **optional** peers with the first component; the consumer picks one framework.
- A package's own tsconfig keeps **no** `paths`: `vp lint` and `vp pack` read it, and mapping
  siblings to source would inline their types into the published declarations.
- After changing a version in the catalog: `rm -rf node_modules pnpm-lock.yaml && pnpm install`,
  never an incremental update — a stale lock keeps auto-installed peers alive and still passes
  `--frozen-lockfile`.

## Toolchain

- **vite-plus (`vp`)** builds, lints, formats and tests. Root `vite.config.ts` owns lint, format,
  tests and the staged hooks; each package's config owns only its `pack` block. Single quotes and
  sorted imports come from `vite.config.ts`; the 2-space indent from `.editorconfig`, which oxfmt
  reads.
- **TypeScript 7**, `strict`, one program: the root tsconfig maps `@enonic/*` to sibling sources,
  so a typecheck needs no build.
- Toolchain versions live in `pnpm-workspace.yaml`'s catalog and are bumped by hand; package
  dependencies live in each `package.json`, where Dependabot updates them.

## Conventions

- Tests sit next to the code as `*.test.ts`. The vitest environment is `node` with no DOM library,
  so keep testable logic in pure helpers; component rendering is not tested yet.
- No explanatory comments that restate the code. Comment a genuine non-obvious constraint.
- `AGENTS.md` is a symlink to this file. Edit only this file.

## Commits & PRs

- Plain descriptive language, no conventional-commit prefixes: `Monorepo scaffolding #1`, not
  `feat: scaffolding`.
- Reference the issue in the commit subject when there is one; PR titles match the commit.
- A release is a `Release vX.Y.Z` commit whose tag matches every manifest — made with
  `pnpm version:set`, never by editing a manifest by hand.

## Reference repositories

Sibling checkouts, read-only.

| Repo                   | What to read it for                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../npm-enonic-ui`     | `@enonic/ui` itself — the base components this toolkit composes, and the precedent for how a package here is built, packaged and released.                                             |
| `../app-settings`      | The first consumer. `docs/extensions/` is the admin-section work whose contract lands in `ui-types`; its `widgets/` and `shared/` are what `ui-kit` and `ui-utils` are extracted from. |
| `../app-contentstudio` | `modules/lib/src/main/resources/assets/js/v6/` — the same widgets solved a second time, and the toolkit's other intended consumer.                                                     |
