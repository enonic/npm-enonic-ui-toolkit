# Releasing

One version for all four packages, one tag, one publish. `@enonic/ui-kit` at 0.4.0 means
`@enonic/ui-types` is at 0.4.0 too, whether or not anything in it changed.

The cost is visible and accepted: a package gets a version bump it did not earn, and a consumer
reading the version cannot tell whether that package changed. What it buys is that nobody has to
work out which combination of four packages is meant to go together — the version answers it. If
one of these packages ever stabilizes enough that its consumers want it to stand still while the
others move, that is the moment to move to per-package versions, and only then.

## Cutting a release

```sh
pnpm version:set 0.2.0        # rewrites the root and all four package.json files
pnpm install                  # the lockfile records the workspace versions
pnpm check && pnpm build && pnpm test

git commit -am "Release v0.2.0"
git tag v0.2.0
git push origin master --follow-tags
```

The tag is what publishes. `.github/workflows/release.yml` refuses to run unless the tagged commit
is on `master` or a version branch, then verifies that every `package.json` in the repository
carries exactly the version the tag names, runs the checks again, and publishes the workspace with
`pnpm -r publish`.

A tag with a suffix — `v0.3.0-beta.1` — publishes to the `beta` dist-tag instead of `latest`, so it
can be installed on purpose and never by default.

`workspace:^` in a package's dependencies is rewritten to the real version at publish time, so a
released `@enonic/ui-kit` asks for `^0.2.0` of its siblings. Nothing in the published manifests
mentions the workspace.

## What the release needs

Credentials and publish hardening belong to whoever administers the repository, and are set up
separately from this scaffolding. What the workflow expects to find:

- `NPM_TOKEN` in the repository secrets, with publish rights on the `@enonic` scope.
- The four names are unclaimed on npm as of the first release; the first publish takes them.

**Provenance is off, deliberately and not permanently.** npm can attest that a package was built by
this repository's workflow from a named commit, and nothing structural blocks it here — the
repository is public and the release runs in GitHub Actions. Two things are missing, both for the
administrator rather than for this repository's code: `release.yml` grants only `contents: write`
and would need `id-token: write` for the workflow to get its OIDC identity, and `pnpm publish` at
the version pinned here exposes no provenance flag, so whether it honours
`publishConfig.provenance` has to be settled on a live publish or worked around by publishing each
package with `npm publish --provenance`. Until then `provenance` is `false` in every manifest —
honestly off rather than claimed and unverified.
