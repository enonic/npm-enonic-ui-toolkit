# Enonic UI Toolkit

The layer between `@enonic/ui` and an Enonic application: the parts that are the same problem solved
twice in Content Studio, the admin applications and everything that follows them. `@enonic/ui` stays
what it is — base components with no opinion about a domain. This repository holds what sits on top
of it, plus the helpers and types that have no view layer at all.

Four packages, one version, published to npm from one tag.

| Package               | What it is                                                                                       | May depend on                        |
| --------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `@enonic/ui-types`    | Types only — base domain types and the behavioural contracts between applications                | nothing                              |
| `@enonic/ui-utils`    | Helpers with no view layer: strings, URLs, dates, formatting, the request transport, i18n        | `ui-types`                           |
| `@enonic/ui-kit`      | Composite React components that carry behaviour: layouts, split panels, toolbars, browse screens | `ui-types`, `ui-utils`, `@enonic/ui` |
| `@enonic/input-types` | XP's input types as React components, and the form that composes them from a schema              | `ui-types`, `ui-utils`, `@enonic/ui` |

The packages are scaffolding right now: the manifests, the build and the release path work end to
end, and the code moves in package by package. `docs/architecture.md` is what belongs where and why.

## Getting started

```sh
pnpm install
pnpm build     # every package, in dependency order, cached
pnpm check     # format, lint, typecheck
pnpm test
```

| Intent                         | Command                          |
| ------------------------------ | -------------------------------- |
| Verify everything              | `pnpm check`                     |
| Verify, fixing format and lint | `pnpm check:fix`                 |
| Build every package            | `pnpm build`                     |
| Build one package              | `vp run -F @enonic/ui-kit build` |
| Tests                          | `pnpm test` / `pnpm test:watch`  |
| Set the version everywhere     | `pnpm version:set 0.2.0`         |

## Releasing

One version for all four packages, one tag, one publish: `@enonic/ui-kit` at 0.4.0 means
`@enonic/ui-types` is at 0.4.0 too, whether or not anything in it changed — the version answers
which packages go together, and nobody has to work it out.

```sh
pnpm version:set 0.2.0        # rewrites the root and all four package.json files
pnpm install
pnpm check && pnpm build && pnpm test

git commit -am "Release v0.2.0"
git tag v0.2.0
git push origin master --follow-tags
```

The tag is what publishes: `.github/workflows/release.yml` refuses a tag whose commit is not on
`master` or a version branch, verifies every manifest carries exactly the tagged version, runs the
checks, and publishes the workspace. A suffixed tag — `v0.3.0-beta.1` — publishes to the `beta`
dist-tag instead of `latest`, so it installs on purpose and never by default. The workflow expects
`NPM_TOKEN` in the repository secrets with publish rights on the `@enonic` scope.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — the package boundaries and the dependency rules
