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

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
