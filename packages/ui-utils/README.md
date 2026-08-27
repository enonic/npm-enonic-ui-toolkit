# @enonic/ui-utils

Everything useful without a view layer: strings, URLs, dates and formatting, the request transport,
the i18n core.

**Nothing here imports a component or a framework.** That is the package's whole value — it can be
used from a store, a worker, a test, or code that has no DOM at all. The i18n core is mechanism
only: phrases come from the consumer, which fetches them from its own server and feeds them in.

> **Status**: scaffolding, pre-1.0. The build and release path work end to end; the helpers land
> module by module.

```sh
pnpm add @enonic/ui-utils
```

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
