# @enonic/ui-kit

Composite React components for Enonic applications — what
[`@enonic/ui`](https://www.npmjs.com/package/@enonic/ui) would be if its parts carried behaviour.
The dialog with an outcome and its confirmations are here, and the filter input of a browse screen;
layouts, toolbars and the rest of the browse screen follow.

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

| Export                                         | What it does                                                                                                                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActionDialog`                                 | `Dialog` from `@enonic/ui` plus an outcome: a `Content` that holds whether the action may be taken, a `Body` that goes inert while the footer asks, a `Footer` that takes the action or asks                                            |
| `ActionDialog.Footer`                          | Cancel and Confirm when given `onConfirm`, or the controls it is given as children — a wizard's step indicator; `intent`, `error`, `confirmRef`; `question` asks in place of the controls                                               |
| `ActionDialog.Action`                          | a further button of the footer, enabled by the content like Confirm; `intent`, `closeOnClick`                                                                                                                                           |
| `useCloseGuard({ dirty, open, onOpenChange })` | the dirty-close question: the mask, the X, `Escape` and Cancel ask before a close that would lose something; `asking` feeds the footer's `question`, `keep` returns the focus                                                           |
| `Gate`                                         | `Root`, `Hint` naming what to type back, `Input` that enables the confirm button on a match and locks                                                                                                                                   |
| `DialogPreset.Confirm`                         | the plain question: title, question, two answers of equal weight                                                                                                                                                                        |
| `DeleteConfirm`                                | the delete view: question, targets, the gate asking for the one name or the count, a red button — the first view, or the view after a list, with `closeOnCancel` off to go back to it                                                   |
| `deleteExpectation(targets)`                   | the one name, or the count                                                                                                                                                                                                              |
| `matchesExpected(typed, expected)`             | the gate's comparison, spaces around the entry forgiven                                                                                                                                                                                 |
| `fillPhrase(phrase, values)`                   | a phrase with its `{n}` placeholders replaced by nodes                                                                                                                                                                                  |
| `uiKitPhrases`, `useUiKitPhrases()`            | the catalogue, and the hook that resolves it through the application's `Translate`                                                                                                                                                      |
| `useActionDialog()`                            | the content's state, for anything inside it that enables the action                                                                                                                                                                     |
| `FilterInput`                                  | one input for a list's filter: values of predefined `fields` combined with free text, every term a `Tag`; `value`/`onChange` or `defaultValue`; `disabled`, `readOnly` (the tags alone, no input), `error`; the ref is the text input's |
| `FilterField`, `FilterValue`                   | what the dropdown offers: a field with an id, a label, an icon, its values, `multiple` and a `notice`; a value with a `count`, a `group` and `disabled`                                                                                 |
| `FilterQuery`, `FilterTerm`                    | what the list is narrowed by: `FieldTerm` and `TextTerm`, discriminated by `kind`, ids never labels, in the order they were added; `fieldTerm`, `textTerm`, `termKey`                                                                   |
| `textOf(query)`, `valuesOf(query, field)`      | the two readings a list takes of a query: the free text as one string, and every value picked for a field — empty narrows nothing                                                                                                       |
| `withTerm`, `withoutTerm`, `toggledTerm`       | the pure operations on a query the input is built from, with `sameTerm`, `isTextTerm`, `isFieldTerm` and `EMPTY_FILTER`                                                                                                                 |
| `filterInputPhrases`                           | the input's English, for an application's `comparePhrases`                                                                                                                                                                              |

## The filter

`FilterInput` is the GitHub-style filter of a browse screen. Its dropdown offers the `fields` the
caller passes — each with an id, a label, an icon and the values it can take; a value carries a
`count` where the list knows its hits, a `group` where values are listed under a labelled heading,
and `disabled` where it is withheld for another reason; a field with `multiple: false` holds one
value at a time, one with a `notice` says above its values why they may be short or stale, and one
with `loading` says its values are still on their way. The
dropdown opens on a click, a keystroke or an arrow, not on focus. The fields come first; picking
one, or typing its label and a colon — or pasting `Field: value` whole — opens its values ordered by
hits, the empty ones last and disabled, with a `No matches` row when the typed text finds none.
Enter picks the highlighted value, and the values stay open so several can be ticked; a tick picked
again, or the tag's cross, takes the term back. Typed text with no field entered becomes a tag on
Enter. Backspace in the empty input steps out of a field, or takes the last tag back; ArrowLeft at
the start of the input walks onto the tags, where arrows move between them and Backspace or Delete
removes one. The right-hand cross clears everything, and leaving the filter drops a field no value
was picked for. Every add, remove and clearing is announced to assistive technology.

The query is a list of terms, and the component decides nothing about what they mean. The reading
the helpers encode, and the one the list should match by, is: values of one field are ORed, fields
are ANDed, and free text is ANDed with everything, word by word, without regard to case.

```tsx
const [query, setQuery] = useState<FilterQuery>(EMPTY_FILTER);
const providers = valuesOf(query, 'idProvider'); // a Set of ids; empty narrows nothing
const text = textOf(query); // 'alice ward'

<FilterInput fields={fields} value={query} onChange={setQuery} placeholder="Search users" />;
```

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
