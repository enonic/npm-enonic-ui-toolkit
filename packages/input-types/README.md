# @enonic/input-types

Enonic XP's input types as React components, and the form that composes them from a schema.

Separate from [`@enonic/ui-kit`](https://www.npmjs.com/package/@enonic/ui-kit) because the audience
is narrower and the dependency runs one way: a form is a screen element, but XP's schema model is a
domain the rest of the toolkit knows nothing about.

> **Status**: scaffolding, pre-1.0. The build and release path work end to end; the input types
> land type by type.

## Install

```sh
pnpm add @enonic/input-types preact
```

The components are written as React code and run on Preact, the same way `@enonic/ui` does. The
published files import `react` as a bare specifier; the consuming application maps it to
`preact/compat` in its bundler, and the real React never installs:

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
