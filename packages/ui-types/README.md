# @enonic/ui-types

Types and nothing else: no runtime, no dependencies, no imports.

Two kinds of thing belong here — the base domain types more than one package or application shares
(content, principals, schema shapes), and the behavioural contracts between programs that are
released separately, where both sides have to agree on a shape they cannot import from each other.
A prop type read by one component is not one of those.

> **Status**: scaffolding, pre-1.0. The build and release path work end to end; the types land
> together with the code that needs them.

```sh
pnpm add -D @enonic/ui-types
```

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
