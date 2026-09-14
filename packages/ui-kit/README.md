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
    'react/jsx-runtime': 'preact/jsx-runtime',
  },
},
```

## Text

The kit ships its own English, keyed `uiKit.<component>.<name>`, and works without any setup. To
render it in the application's words, add the keys to the phrase source the application already has
and hand the kit an adapter over it, once, at the React root:

```tsx
import { UiKitProvider, fromPhrases } from '@enonic/ui-kit';

<UiKitProvider translate={fromPhrases(() => $phrases.get())}>
  <App />
</UiKitProvider>;
```

The adapter must answer `undefined` for a key it does not carry — that is what lets the kit fall
back to its own text. `fromPhrases` does so over a plain phrase map; a source with a
`getMessage`-style API writes its `Translate` by hand, guarded the same way. `uiKitPhrases` lists
every key the kit can render, for an application to assert its own bundle against; texts only the
application knows — a title, a question about its own item — are props.

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
