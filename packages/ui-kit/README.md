# @enonic/ui-kit

Composite React components for Enonic applications — what
[`@enonic/ui`](https://www.npmjs.com/package/@enonic/ui) would be if its parts carried behaviour:
layouts, split panels, toolbars, browse screens with their list and details columns, dialog and
form shells.

A component belongs here when it holds state, coordinates several base components, or encodes a
screen pattern more than one application repeats. Props in, callbacks out: nothing here reaches
into a host application's configuration, stores, router or phrase keys.

> **Status**: scaffolding, pre-1.0. The build and release path work end to end; the components
> land package by package.

## Install

Pick one framework — the same contract as `@enonic/ui`:

```sh
pnpm add @enonic/ui-kit react react-dom   # React
pnpm add @enonic/ui-kit preact            # Preact
```

The components are written as React code. On Preact, map React's names to `preact/compat` in the
application's bundler — the real React never installs:

```ts
// vite.config.ts of the consuming application
resolve: {
  alias: {
    react: 'preact/compat',
    'react-dom': 'preact/compat',
    'react-dom/client': 'preact/compat/client',
  },
},
```

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
