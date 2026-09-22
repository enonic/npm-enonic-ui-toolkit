# @enonic/input-types

Enonic XP's input types as React components, and the form that composes them from a schema.

Separate from [`@enonic/ui-kit`](https://www.npmjs.com/package/@enonic/ui-kit) because the audience
is narrower and the dependency runs one way: a form is a screen element, but XP's schema model is a
domain the rest of the toolkit knows nothing about.

> **Status**: pre-1.0. The model is in; the input types and the form land step by step
> (npm-enonic-ui-toolkit#18).

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

## The model

Two framework-free entries carry what the form edits and what describes it. A store or a test
imports them without the components, and a consumer without lib-admin-ui uses two calls and looks
at nothing in between: `fromJson` in, `toJson` out.

```ts
import { PropertyTree, ValueTypes } from '@enonic/input-types/data';
import { Form } from '@enonic/input-types/schema';

const form = Form.fromJson(schema.form); // XP's dialect: items by `formItemType`
const tree = PropertyTree.fromJson(content.data); // `[{ name, type, values: [{ v } | { set }] }]`
tree.setStringByPath('address.zip', '0150');
tree.onChanged((event) => console.log(event.getType(), event.getPath().toString()));
save(tree.toJson());
```

| Entry                        | What is there                                                                                                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@enonic/input-types/data`   | `PropertyTree`, `PropertySet`, `PropertyArray`, `Property`, `PropertyPath`; `Value` and `ValueTypes`, one instance per XP value type; `ValueTypeConverter`; the four events every change reports up to the root                  |
| `@enonic/input-types/schema` | `Form` and its items — `Input`, `FieldSet`, `FormItemSet`, `FormOptionSet` with `FormOptionSetOption` — each with a `kind` to switch on; `Occurrences`, `InputTypeName`, `FormItemPath`; `Form.fromJson` over `@enonic/ui-types` |

The classes are lib-admin-ui's `data/` and `form/` with the same method surface and without its
idioms: no `Equitable`, no `iFrameSafeInstanceOf`, `equals(other)` on every class, `undefined`
where a lookup finds nothing, and a `kind` on `FormItem` in place of `instanceof`.

## The engine

The root entry is what renders one input and what a form composes: `InputField` finds the input's
type in the registry, keeps its array in the tree filled to the minimum, validates every change
through the type's descriptor, and shows the server's errors on the right occurrence.

```tsx
import { I18nProvider } from '@enonic/ui';
import {
  InputField,
  inputTypeRegistry,
  TextLineDescriptor,
  validateForm,
} from '@enonic/input-types';

inputTypeRegistry.registerType({
  mode: 'list',
  descriptor: TextLineDescriptor,
  component: MyTextLine,
});

<I18nProvider translate={translate}>
  <InputField input={form.getInputByName('title')} propertySet={tree.getRoot()} enabled />
</I18nProvider>;

const { isValid, children } = validateForm(form, tree.getRoot(), { rawValues, serverErrors });
```

| Piece                                                                                     | What it is                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InputTypeDescriptor`, the 15 built-in descriptors                                        | the pure half of an input type: its value type, how its config reads, its default, how a value validates                                           |
| `InputTypeRegistry`, `inputTypeRegistry`, `createInputTypeRegistry`                       | the types a form can render, by name; a value each bundle registers into, not a global                                                             |
| `OccurrenceManager`, `SetOccurrenceManager`, `validateForm`                               | the occurrences of an input or a set with a stable id each, and the whole form validated against its data                                          |
| `ValidationResult`                                                                        | a phrase `{ key, values }` resolved where it renders, or a text `{ message }` — a server's, a schema's own                                         |
| `InputField`, `OccurrenceList`, `InputLabel`, `FieldError`, `Counter`, `UnsupportedInput` | one input in a form, and the parts every input type is built from                                                                                  |
| `SortableList`, `SortableGridList`                                                        | drag-to-reorder lists on `@dnd-kit`; the grid list keeps one tab stop for a list of editable rows                                                  |
| the providers                                                                             | `ValidationVisibilityProvider`, `RawValueProvider`, `ServerErrorsProvider`, `LocaleProvider`, `FieldRegistryProvider`, `InputTypeRegistryProvider` |
| `FieldRegistry`                                                                           | reaches a field from outside the form by its data path: an error to show, an occurrence to lock while something works on it, a field to reveal     |
| `inputTypesPhrases`                                                                       | every text the package renders, under `enonic.inputTypes.*`, translated through `@enonic/ui`'s `I18nProvider`                                      |

The components need `react`, `@enonic/ui` and the `@dnd-kit` pair as peers; the model entries need
none of them.

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
