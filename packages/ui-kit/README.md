# @enonic/ui-kit

Composite React components for Enonic applications — what
[`@enonic/ui`](https://www.npmjs.com/package/@enonic/ui) would be if its parts carried behaviour.
The dialog with an outcome and its confirmations are here; layouts, toolbars and browse screens follow.

A component belongs here when it holds state, coordinates several base components, or encodes a
screen pattern more than one application repeats. Props in, callbacks out: nothing here reaches
into a host application's configuration, stores, router or phrase keys.

## Install

Pick one framework — the same contract as `@enonic/ui`:

```sh
pnpm add @enonic/ui-kit @enonic/ui react react-dom   # React
pnpm add @enonic/ui-kit @enonic/ui preact            # Preact
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

## Styles

The components carry Tailwind classes and ship no CSS: the application's Tailwind build generates
what they use. Import the kit's preset after `@enonic/ui`'s — it points the build at the package's
`dist`, and the tokens the classes use are `@enonic/ui`'s:

```css
@import 'tailwindcss';
@import '@enonic/ui/preset.css';
@import '@enonic/ui-kit/preset.css';
```

## Labels

Every text a component renders on its own — a Cancel, a Confirm, the gate's hint — is English in
`uiKitPhrases`, keyed `enonic.uiKit.<area>.<name>`, and goes through the `Translate` the
application hands `@enonic/ui`'s `I18nProvider`; a key the application has no text for renders the
English. Titles, questions and target labels are props. `comparePhrases` from `@enonic/ui-utils`
tells an application which keys its bundle lacks.

## What is here

| Export                                         | What it does                                                                                                                                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActionDialog`                                 | `Dialog` from `@enonic/ui` plus an outcome: a `Content` that holds whether the action may be taken, a `Body` that goes inert while the footer asks, a `Footer` that takes the action or asks |
| `ActionDialog.Footer`                          | Cancel and Confirm when given `onConfirm`, or the controls it is given as children — a wizard's step indicator; `intent`, `error`, `confirmRef`; `question` asks in place of the controls    |
| `ActionDialog.Action`                          | a further button of the footer, enabled by the content like Confirm; `intent`, `closeOnClick`                                                                                                |
| `useCloseGuard({ dirty, open, onOpenChange })` | the dirty-close question: the mask, the X, `Escape` and Cancel ask before a close that would lose something; `asking` feeds the footer's `question`, `keep` returns the focus                |
| `Gate`                                         | `Root`, `Hint` naming what to type back, `Input` that enables the confirm button on a match and locks                                                                                        |
| `DialogPreset.Confirm`                         | the plain question: title, question, two answers of equal weight                                                                                                                             |
| `DeleteConfirm`                                | the delete view: question, targets, the gate asking for the one name or the count, a red button — the first view, or the view after a list, with `closeOnCancel` off to go back to it        |
| `deleteExpectation(targets)`                   | the one name, or the count                                                                                                                                                                   |
| `matchesExpected(typed, expected)`             | the gate's comparison, spaces around the entry forgiven                                                                                                                                      |
| `fillPhrase(phrase, values)`                   | a phrase with its `{n}` placeholders replaced by nodes                                                                                                                                       |
| `uiKitPhrases`, `useUiKitPhrases()`            | the catalogue, and the hook that resolves it through the application's `Translate`                                                                                                           |
| `useActionDialog()`                            | the content's state, for anything inside it that enables the action                                                                                                                          |

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
