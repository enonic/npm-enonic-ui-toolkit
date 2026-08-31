# @enonic/input-types

Enonic XP's input types as React components, and the form that composes them from a schema.

Separate from [`@enonic/ui-kit`](https://www.npmjs.com/package/@enonic/ui-kit) because the audience
is narrower and the dependency runs one way: a form is a screen element, but XP's schema model is a
domain the rest of the toolkit knows nothing about.

> **Status**: scaffolding, pre-1.0. The build and release path work end to end; the input types
> land type by type.

## Install

Pick one framework — the same contract as `@enonic/ui`:

```sh
pnpm add @enonic/input-types react react-dom   # React
pnpm add @enonic/input-types preact            # Preact
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
