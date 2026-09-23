# Input types and the form

What `@enonic/input-types` extracts, from where, and what has to change on the way. The package
boundaries and the peer-versus-dependency rule are `architecture.md`'s; this document applies them
to one body of code. Written ahead of the code, from the three repositories it comes out of, so
the extraction has something to check against.

## Where the code is today

The XP form has been solved three times. Two of the copies are the source; the third is what the
package replaces.

| Where                                     | What                                                                                                                                                                                                 | Lines                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| lib-admin-ui `js/form2/`                  | The input types as Preact components, already written against `@enonic/ui`: 15 descriptors, 13 components, the registry, the occurrence engine, `validateForm`, the contexts, the sortable lists.    | 9.6k source, 14.6k tests, 4.1k stories                     |
| Content Studio `v6/features/shared/form/` | The form that composes them: `FormRenderer`, `FormItemRenderer`, `FieldSetView`, `ItemSetView`, `OptionSetView` with their hooks, `seedFormDefaults`, `normalizeFormValueTypes`.                     | 3.1k, plus 7.3k of Content Studio's own input types        |
| lib-admin-ui `js/form/`, `js/data/`       | The class-and-DOM form both of the above still lean on for their **model**: `Form`, `Input`, `Occurrences`, the sets, and the property tree — `Value`, `ValueTypes`, `PropertySet`, `PropertyArray`. | 1.4k schema, 4.6k data; 11.5k in all with the legacy views |

The split between the first two is historical, not architectural: `form2` is what lib-admin-ui
could host without a page to render into, and the renderer landed where the first page was. The
package reunites them. `form2` is the more finished half — every descriptor and component has a
test, the engine has tests for occurrence identity under move and remove, and nothing in it reads
Content Studio state. The renderer is generic in shape and Content Studio in its edges:
`FormRenderer` wraps itself in an `HtmlAreaShell` that subscribes to three Content Studio stores,
and the set views reach for `useI18n`, `ItemLabel`, `InlineButton` and `instanceOf` from
`shared/`.

Nothing in the legacy `js/form/` views moves. `BaseInputType` in `form2` is the bridge that lets a
descriptor drive a legacy `InputView`; it stays in lib-admin-ui with the views it bridges to.

## What the code is coupled to

Every import that leaves `form2` or the renderer, grouped, with where the group lands. The
package may depend on `ui-types`, `ui-utils` and `@enonic/ui` and nothing else in the estate, so
every row has to end in one of those, in the package itself, or in a peer.

| Group                                                                                                                                                                                        | Used by                                                                          | Lands in                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Property tree** — `Value`, `ValueType` and the 13 `ValueTypes`, `ValueTypeConverter`, `Property`, `PropertyArray`, `PropertySet`, `PropertyTree`, `PropertyPath`, the property events      | every descriptor, hook and component; `validateForm`; the renderer               | `@enonic/input-types/data`                                                                  |
| **Schema model** — `Form`, `FormItem`, `Input` with `RawInputConfig`, `Occurrences`, `InputTypeName`, `FieldSet`, `FormItemSet`, `FormOptionSet` and its option, `FormItemPath`, the factory | the descriptors' `readConfig`, `InputField`, `validateForm`, the renderer        | `@enonic/input-types/schema`                                                                |
| **Wire types** — a form as `FormJson` and its items by `formItemType`, a property tree as `PropertyTreeJson`, `InputConfigJson`, `PrincipalType`                                             | the schema model's `fromJson`, `PropertyTree.fromJson`; any consumer's transport | `@enonic/ui-types`, in XP's own dialect — see below                                         |
| **Value primitives** — `LocalDate`, `LocalTime`, `LocalDateTime`, `DateTime`, `GeoPoint`, `Reference`, `BinaryReference`, `Link`, `DateHelper`, `RelativeTimeParser`                         | the date and time descriptors and components, `Value`                            | `@enonic/ui-utils`, without `dayjs`: the relative time arithmetic is thirty lines of `Date` |
| **lib-admin-ui idioms** — `ObjectHelper.iFrameSafeInstanceOf`, `Equitable`, `ClassHelper`, `Store`, `util/Messages`                                                                          | throughout the model; the registry; the descriptors' messages                    | nowhere — replaced, see below                                                               |
| **Security** — `PrincipalKey`, `PrincipalType`                                                                                                                                               | `PrincipalSelectorDescriptor`'s config only; the type has no `form2` component   | a `PrincipalType` union in `ui-types`; keys stay strings                                    |
| `ApplicationKey` on `FormItem` and in `FormRenderContext`                                                                                                                                    | tells a custom input type and the HTML area which application's schema this is   | a string on the model; the context keeps it as an optional prop                             |
| `@enonic/ui` — `Input`, `TextArea`, `Checkbox`, `RadioGroup`, `Combobox`, `Listbox`, `DatePicker`, `TimePicker`, `Button`, `IconButton`, `Tooltip`, `cn`, `useBlinkAttention`, `getIsMobile` | the components                                                                   | peer, as planned                                                                            |
| `@dnd-kit/core`, `@dnd-kit/sortable`                                                                                                                                                         | `SortableList`, `SortableGridList`, `TagInput`, `sortableSensors`                | peers — `DndContext` is a context, and lib-admin-ui already declares them so                |
| `lucide-react`                                                                                                                                                                               | icons in the components and the set views                                        | dependency, as `ui-kit` has it                                                              |

The property tree and the schema model are the whole difficulty. They are mutable, event-emitting
classes — `usePropertyArray` subscribes to four events on a `PropertyArray`, `InputField` writes
through `propertyArray.set` and the tree tells every other subscriber — and every one of the 68
Content Studio files that import `form2` also imports them. The package cannot import lib-admin-ui,
so the model comes along.

### Two dialects of form JSON, one contract

XP's JS libraries — `lib-content` for a content type, `lib-schema` for a content type, mixin or
form fragment — serialize a form as a list of items told apart by `formItemType` (`Input`,
`ItemSet`, `OptionSet`, `Layout`, `FormFragment`), with `selection` on an option set and
`default` on an option; `@enonic-types/core` declares it as `FormItem`. Content Studio's own Java
REST serializes the same form differently: one wrapper key per item (`{ Input: { … } }`,
`{ FormItemSet: { … } }`), `multiselection`, `defaultOption`, and that is the dialect lib-admin-ui's
`Form.fromJson` and every `*Json` type under `form/json/` read. The property tree has one dialect
in both, core-api's `PropertyTreeJson`.

`ui-types` carries XP's dialect and not the wrapper. The wrapper is Content Studio's server
talking to Content Studio's client, not a contract between separately released programs, and a
server without lib-admin-ui behind it — app-users serializing `IdProviderDescriptor.getConfig()` —
has XP's mappers as its precedent and XP's types to check against. What follows for the steps:
`Form.fromJson` in `input-types/schema` (step 3) reads XP's dialect; lib-admin-ui keeps a
wrapper-to-contract adapter in its own re-export module for its legacy callers (step 7); and
Content Studio either moves its REST to XP's dialect or adapts at the client (step 8) — its
choice, and the only place the wrapper survives.

### Why the model lives in `input-types`, not `ui-utils`

`ui-utils` promises that nothing in it reads state it did not create and a function's result
depends on its arguments alone. A property tree is the opposite: shared mutable state with
subscribers, the thing the form exists to edit. It is also XP's schema domain, which the package
README already claims for `input-types` and the rest of the toolkit knows nothing about. It lands
on two framework-free entries, `@enonic/input-types/data` and `@enonic/input-types/schema`, the
pattern `@enonic/ui-utils/request` set: a store or a test imports the model without the
components, and the `.d.ts` of a component says `import { PropertySet } from './data'`, not a
copy. The one consumer that uses the model without the form today, Content Studio's wizard store,
also renders the form; if a second one appears that does not, the two entries become a fifth
package with one lockstep manifest and no API change.

## What changes on the move

Porting `form2` as it stands would carry five lib-admin-ui habits into a package whose rules
forbid them. Each is a decision, made here.

- **Messages become keys with English, resolved in the render.** Nine descriptors call the global
  `i18n()` from `util/Messages` at validate time, and `validateForm` encodes a parameter into a
  key string (`field.occurrence.breaks.min:2`). The toolkit's rule (#13) is that pure code returns
  keys or takes strings and only a component resolves a key. `ValidationResult` therefore becomes
  a union — a phrase `{ key, values }` or a server `{ message }` — and the occurrence error the
  same; the components resolve it through `usePhrases(inputTypesPhrases)` from `@enonic/ui`, and
  a store through `bindPhrases` from `ui-utils`. `form2`'s own `I18nProvider` and `useI18n` go:
  the context is `@enonic/ui`'s, and Content Studio hands it `fromLookup(Messages.hasMessage,
i18n)` at its root. The eight validation keys, the ten component keys and the set views' dozen
  become one `inputTypesPhrases` catalogue under `enonic.inputTypes.*`, with `comparePhrases`
  telling a consumer which of its own keys to add.
- **The registry is a value, not a window global.** `InputTypeRegistry` keeps its entries in
  lib-admin-ui's `Store` on `window`, so that the IIFE bundle and an app's bundle see one
  registry. The toolkit shares no runtime between bundles — each compiles its own copy, as
  `docs.md` in app-settings settles for Preact — so the registry is a module-level instance,
  `createInputTypeRegistry()` for a test or a second one, `registerBuiltInTypes(registry?)` in
  place of `initBuiltInTypes()`. `validateForm` and `seedFormDefaults` take the registry as an
  option that defaults to the shared instance; `FormRenderer` reads it from an optional provider
  with the same default.
- **`instanceof` gives way to a discriminant.** The model's `equals` methods go through
  `ObjectHelper.iFrameSafeInstanceOf`, and the renderer and `validateForm` dispatch on
  `instanceOf(item, Input)`. The classes keep their method surface — `getName()`,
  `getOccurrences()`, `getPropertyArray()` are called from a hundred places — but drop
  `Equitable` and `ClassHelper`, gain a `kind` discriminant on `FormItem` (`'input' | 'fieldset'
| 'itemset' | 'optionset'`) so the renderer switches on it as the validation nodes already do,
  and compare with a plain `equals` where one is still needed.
- **The model stays classes, behind an explicit boundary.** `getName()`, `getOccurrences()` and
  `getPropertyArray()` are called from a hundred places in `form2`, the renderer and Content
  Studio, and the legacy wizard hands the v6 form a class instance; a plain-object model would be
  the more toolkit-shaped API and a rewrite of every consumer, so it waits for the next major.
  What this pass adds is the boundary a consumer without lib-admin-ui needs: `Form.fromJson` and
  `PropertyTree.fromJson` in, `toJson` out, and nothing in between it has to look at — the tree is
  the form's editing buffer, not the application's state.
- **The renderer has no shell.** `FormRenderer` in Content Studio wraps the form in
  `HtmlAreaShell`, which reads the context content, the project and the assets uri from three
  stores. The package's `FormRenderer` renders the items and takes `enabled`, `applicationKey`,
  `excludeInputTypes` and a `registry`; Content Studio composes its `LocaleProvider` and
  `HtmlAreaProvider` around it, which is what its nested forms (the site configurator, the macro
  panel) do already.
- **Content Studio's input types stay in Content Studio.** The HTML area, the content, image and
  media selectors, the uploaders, the site configurator, the content-type filter, the custom
  selector and its `Tag` override are 7.3k lines of content domain — they register into the
  package's registry through the same `InputTypeDefinition` they use today, and the site
  configurator nests the package's `FormRenderer` for an application's config form.

Three things go with the code as they are. The **`FieldRegistry`** — external error and processing
state routed to a field by path, addressed by stable occurrence id — is the mechanism Content
Studio's AI bridge uses, and nothing in it is Content Studio's. The **tests** are 14.6k lines in
vitest's `node` environment with `@enonic/ui` mocked per file, which is exactly this workspace's
setup; they come along and are what makes the port checkable. The **stories** — 4.1k lines, one
per component, on `@storybook/preact-vite` — document the components better than a README will,
so the toolkit gets a Storybook at the workspace root and they come along with the first
component; `ui-kit`'s dialogs use the same one.

## The direction of the dependency

Content Studio compiles lib-admin-ui from source, and 284 of its v6 files import it — 72 the
property tree, 68 `form2`. Its legacy half hands the wizard a `PropertyTree` from
`Content.getContentData()`, and the v6 form edits that same tree. Two property trees — one from
lib-admin-ui for the content, one from the package for the form — would need a conversion at the
boundary and would lose the shared mutable tree the legacy wizard also writes to.

So the extraction is not a copy: **lib-admin-ui takes `@enonic/input-types` as a dependency**, and
its `data/`, `form/{Form,Input,Occurrences,sets}` and `form2/` become re-exports of the package,
the way it already takes `@enonic/ui` for its base components. One class identity across the
legacy views, the bridge and the v6 form. Content Studio then rewrites its imports — a mechanical
pass over the 284 files, the same `import { PropertySet }` from a different specifier — and the
re-exports exist to make that pass gradual rather than atomic.

app-users is the second consumer and not yet a consumer: an id provider's configuration is the
form its application's descriptor declares, and app-users#2636 is the renderer it lacks. The
package covers it — the forms are text, choice and number inputs with item and option sets — with
two gaps on app-users' side. `PrincipalSelector` has a descriptor and no component, because a
selector's data source is the application's; app-users writes one over `Combobox` and its own
`findPrincipals`, registered in `internal` mode the way Content Studio registers its content
selectors. And nothing serves the descriptor's `Form` to a client: `IdProviderDescriptor.getConfig()`
exists in Java, no XP lib exposes it, and app-users' own bean answers `hasConfig` only. The
package's part of that is `FormJson` and `PropertyArrayJson` in `ui-types`, so that the server
types what the client's `Form.fromJson` and `PropertyTree.fromJson` read — one reason the wire
types are step 1. app-users has no lib-admin-ui and never will, so it is the consumer that proves
the package stands on its own.

## The manifest

For `architecture.md`'s table, the row this package was waiting for, filled in:

| Package       | Peer                                                                                                         | Dependency                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `input-types` | `react`\*, `react-dom`\*, `preact`\*, `@enonic/ui`, `@dnd-kit/core`, `@dnd-kit/sortable`, `focus-trap-react` | `@enonic/ui-types`, `@enonic/ui-utils`, `lucide-react` |

`@enonic/ui`'s floor is the release that ships `I18nProvider` and `usePhrases` (npm-enonic-ui#542),
for the same reason it is `ui-kit`'s. The `@dnd-kit` pair is a peer for the reason
`react-resizable-panels` is: a sortable finds its `DndContext` through a context, and two copies
are two contexts. Content Studio and lib-admin-ui both carry the pair already. `focus-trap-react`
is what the set confirmations trap focus with, as `@enonic/ui`'s dialog does; a consumer with the
dialog has it.

The components carry Tailwind classes, as `ui-kit`'s dialogs will; how they reach a consumer's
build is decided once, in #14, and this package follows it.

## Sequence

One issue (#18), one branch, one commit per step; each step leaves `pnpm check` green. The order is the
dependency order — nothing in a step imports a later one.

1. **`ui-types`: the form and property JSON contracts.** `FormJson` and its items by
   `formItemType`, `PropertyTreeJson`, `InputConfigJson`, `PrincipalType` — XP's dialect, pinned
   by type tests and checked assignable from `@enonic-types/core`'s shapes.
2. **`ui-utils`: date, time and geo values.** `LocalDate`, `LocalTime`, `LocalDateTime`,
   `DateTime`, `GeoPoint`, `Reference`, `BinaryReference`, `Link`, the parse and format helpers
   behind `DateHelper`, and `parseRelativeTime` for a date input's default, minus `Equitable`,
   `ObjectHelper` and `dayjs` — the root entry stays dependency-free. lib-admin-ui has no tests
   for them; they get some here.
3. **`input-types/data` and `input-types/schema`.** The property tree with its events and the
   schema model with `Form.fromJson` over the contracts, on two framework-free entries; the
   `kind` discriminant; the package's first `dependencies` on the siblings. What the port
   changed, for the steps that build on it: a lookup that finds nothing answers `undefined`, not
   `null` (`getString()`, `get(index)`, `getProperty(path)`); the builders stay for `Property`,
   `PropertyArray` and `Input`, and go for `Occurrences` (`Occurrences.minmax`), the sets and
   `Form`, whose constructors take their fields; `FormSet.isHelpTextOn` and the `debug` flags,
   view state on a model, are gone; `getValuesAsString` and `syncEmptyArrays` stay behind in
   lib-admin-ui as functions over the tree, Content Studio being their only caller; `FieldSet`
   may have no name, as XP's dialect gives it none, and a `FormFragment` reference is skipped.
   `LocalDateTime` no longer drops its fractions when the seconds are zero, and
   `ValueTypeConverter` no longer mislabels a `Long` converted from a `Double`.
4. **`input-types`: descriptors, registry and the occurrence engine.** The 15 descriptors with
   `ValidationResult` as a union, `createInputTypeRegistry`, `OccurrenceManager` and
   `SetOccurrenceManager`, `validateForm`, `getEffectiveOccurrences`, the contexts, the hooks,
   `FieldRegistry`, `InputField`, `OccurrenceList`, `SortableList`, `SortableGridList`,
   `inputTypesPhrases`. `react`, `@enonic/ui` and the `@dnd-kit` pair become peers here. What the
   port settled: a validation node's `occurrenceError` is a `ValidationMessage`, not a key with a
   parameter spliced in; `FieldError` takes either a `message` or an unresolved `error`; a
   descriptor's config text is read through `configText`, so an object in a config entry renders
   empty rather than `[object Object]`. Types are Preact's — `react` resolves to `preact/compat`
   in every tsconfig through `paths`, as `@enonic/ui` is typed and a Preact consumer resolves it —
   while the emitted code imports `react/jsx-runtime`. `lucide-react` and `@enonic/ui` are mocked in
   the component tests, as they were: the workspace has no React for their `require('react')`.
   The tests came along with a codemod: `!` on indexed access under `noUncheckedIndexedAccess`,
   keys in place of `#key#` strings, `undefined` for `null`.
5. **`input-types`: the built-in components.** The 13 with their stories, resolving their labels
   through `usePhrases`; `registerBuiltInTypes`; the workspace Storybook lands with the first
   slice. Can land in two or three slices by family — text and number, date and time, choice.
   What the port settled: the catalogue grew the components' keys (`action.*`, the pickers'
   placeholders and triggers, the option search) — `useI18n` never had a fixed set, the
   package's `t` does; `DateTimeInput` and `InstantInput` read the typed text through
   `parseDisplayDateTime`, which admits minutes and nothing finer, where `ui-utils`'s
   `parseDateTime` stays general and accepts XP's stored seconds; their converters carry the
   component's name (`dateTimeDisplayToValue`, `instantDisplayToValue`) since both are exported
   from one entry. `TagInput` keeps `useSyncExternalStore` for the mobile flag rather than
   `useIsMobile`, so the hooks fire in the order its tests were written against. The Storybook
   sits at the root: `.storybook/` aliases `react` to `preact/compat` as the tests do, pre-bundles
   `@enonic/ui` with Preact so one instance serves every hook, and the root manifest carries what
   only the Storybook needs — Storybook itself, Tailwind, and `@enonic/ui`'s peers, `react`
   among them for Storybook's own manager. `vite` there is the vite-plus alias, and the Storybook
   builds on it.
6. **`input-types`: the form.** `FormRenderer`, `FormItemRenderer`, `FieldSetView`,
   `ItemSetView`, `OptionSetView` with the set hooks, confirmations and error hooks,
   `seedFormDefaults`, `normalizeFormValueTypes` — from Content Studio, with `HtmlAreaShell` left
   behind and `ItemLabel`, `InlineButton`, `useCloseOnScroll` brought along or replaced.
   What the port settled: the renderer switches on `kind`, and `seedFormDefaults` and
   `normalizeFormValueTypes` take a `registry` option as `validateForm` does; the one warning the
   form raises — a deselected option's data goes on save — reaches the application through a
   `notify` on `FormRenderer`, since the package has no message bus, and nothing is shown without
   it; the default-value rule `InputField` and the seeder shared by copy is one
   `computeDefaultValue` in `descriptor/`; the two occurrence views share a `SetOccurrenceHeader`
   where Content Studio had the header twice; `InlineButton` became `Button size="sm"` with the
   same classes; the scroll-to-occurrence looks for a `[data-form-panel]` ancestor, not Content
   Studio's `.form-panel`. The confirmation bars keep `focus-trap-react`, which `@enonic/ui`'s
   dialog already asks a consumer for, so it is a peer here too. The one DOM test
   (`LockedSingleRadioBody.test.tsx`, on `@testing-library/preact`) stays behind with the open
   question below; the tree-level tests came, on `Form.fromJson` in XP's dialect instead of
   Content Studio's factory.
7. **lib-admin-ui re-exports the package** (in that repository): `data/`, the schema classes and
   `form2/` become re-exports; `BaseInputType` and the legacy views stay.
   What the port settled (lib-admin-ui#4692, branch `issue-4692`): every moved file stays as a
   re-export at its old path, so nothing importing the library moves at once; `Form` there is a
   subclass whose `fromJson` reads both dialects, since Content Studio's REST still speaks
   `{Input: {…}}`, and `FormItemFactoryImpl` builds the toolkit's classes from it;
   `OccurrencesBuilder` stays as a builder over `Occurrences.minmax`; `BaseInputType` resolves a
   descriptor's keys through the library's bundle with the toolkit's English as fallback; the
   `ignoreChange` flag and the sets' help-text toggle, UI state the model used to carry, moved to
   the views that read them. Storybook and vitest left with the code they served. The legacy
   `DateHelper` and `RelativeTimeParser` stay: legacy callers want their static class API, and the
   value classes they produce are the toolkit's.
8. **Content Studio switches** (in that repository): the import pass, its input types registering
   into the package's registry, its `Translate` handed to `@enonic/ui`'s provider.
   What the port settled (app-contentstudio#11437, branch `issue-11437`): the v6 tree imports the
   package directly and the legacy `app/` keeps lib-admin-ui's paths; `FormRenderer` stays as the
   shell — HTML area context, locale, `I18nProvider` from `phrases.properties` through
   `fromLookup`, `notify` into the message bus; `getValuesAsString` became a helper; the AI
   bridge's form JSON is XP's dialect now, since the toolkit's `Form.toJson` writes it — the
   assistant reading it has to follow. Tests moved with the sets; the rest adjusted to
   `undefined` where `null` was.

## Open questions

- **Tests for the components.** `form2` tests components by mocking `@enonic/ui` and asserting on
  the rendered vnode tree, without a DOM. It works and it comes along; whether the toolkit wants
  a DOM environment for component tests at some point is a separate question.
