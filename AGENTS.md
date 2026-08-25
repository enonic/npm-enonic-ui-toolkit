# Enonic UI Toolkit

A pnpm monorepo publishing four npm packages: the layer between `@enonic/ui` and an Enonic
application. `@enonic/ui` (in `../npm-enonic-ui`) stays base components with no domain opinion;
this repository holds what sits on top of it, plus the helpers and types with no view layer at all.

**Read `docs/architecture.md` before adding code to a package or moving code between packages** —
what belongs where, the dependency direction, and the peer-versus-dependency rule are decided
there. `docs/releasing.md` is the version model.

| Package               | Contains                                                                                    | May depend on                        |
| --------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| `@enonic/ui-types`    | types only — base domain types, contracts between separately released applications          | nothing                              |
| `@enonic/ui-utils`    | strings, URLs, dates, formatting, the request transport, the i18n core — **never Preact**   | `ui-types`                           |
| `@enonic/ui-kit`      | composite Preact components with behaviour: layouts, split panels, toolbars, browse screens | `ui-types`, `ui-utils`, `@enonic/ui` |
| `@enonic/input-types` | XP input types as Preact components, and the form that composes them                        | `ui-types`, `ui-utils`, `@enonic/ui` |

The packages are scaffolding: manifests, build and release path work end to end, and the code moves
in package by package.

## Scripts

| Intent                         | Command                          |
| ------------------------------ | -------------------------------- |
| Verify changes                 | `pnpm check`                     |
| Verify, fixing format and lint | `pnpm check:fix`                 |
| Build every package            | `pnpm build`                     |
| Build one package              | `vp run -F @enonic/ui-kit build` |
| Tests                          | `pnpm test` / `pnpm test:watch`  |
| Set the version everywhere     | `pnpm version:set 0.2.0`         |

`pnpm check` is what CI runs: format, lint (type-aware oxlint) and a workspace-wide typecheck.

## Toolchain

- **Build, lint, format, test**: vite-plus (`vp`), configured in `vite.config.ts`. Lint is oxlint,
  format is oxfmt — 2-space indent, single quotes, sorted imports. Root config owns lint, format
  and tests; each package's own config owns only its `pack` (build) block.
- **`vp run -r <task>`** is the workspace runner: dependency order and task caching, no Turborepo.
- **Typecheck**: TypeScript 7, `strict`, one program for the workspace. The root `tsconfig.json`
  maps `@enonic/*` to sibling **sources**, so a typecheck needs no build; a package's own tsconfig
  deliberately has no path mapping, so that a sibling it forgot to declare is an unresolved import
  rather than a silent copy inlined into the published declarations.
- **Preact**, with `react`/`react-dom` aliased to `preact/compat` in the root Vite config.
- **Versions**: lockstep — all four packages and the root always carry the same version, and the
  release tag has to match it.
- The toolchain versions live in `pnpm-workspace.yaml`'s catalog and are bumped by hand; a
  package's own dependencies live in its `package.json`, where Dependabot updates them.

## Conventions

- Tests sit next to the code as `*.test.ts`. The vitest environment is `node` and no DOM library is
  installed, so keep testable logic in pure helpers; component rendering is not tested yet.
- No explanatory comments that restate the code. Comment a genuine non-obvious constraint.
- Plain descriptive language in commits and issues, no conventional-commit prefixes.
- `AGENTS.md` is a copy of this file for agents that read that name. Edit both, keep them identical.

## Reference repositories

Sibling checkouts, read-only.

| Repo                   | What to read it for                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../npm-enonic-ui`     | `@enonic/ui` itself — the base components this toolkit composes, and the precedent for how a package here is built, packaged and released.                                             |
| `../app-settings`      | The first consumer. `docs/extensions/` is the admin-section work whose contract lands in `ui-types`; its `widgets/` and `shared/` are what `ui-kit` and `ui-utils` are extracted from. |
| `../app-contentstudio` | `modules/lib/src/main/resources/assets/js/v6/` — the same widgets solved a second time, and the toolkit's other intended consumer.                                                     |
