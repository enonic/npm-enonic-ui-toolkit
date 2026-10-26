# @enonic/ui-types

Types and nothing else: no runtime, no dependencies, no imports.

Two kinds of thing belong here — the base domain types more than one package or application shares
(content, principals, schema shapes), and the behavioural contracts between programs that are
released separately, where both sides have to agree on a shape they cannot import from each other.
A prop type read by one component is not one of those.

```sh
pnpm add -D @enonic/ui-types
```

## The mount contract

The contract between a shell and a module it mounts into its page: a screen or a panel shipped by
another application, discovered at runtime and rendered into a container the shell owns. The shell
creates an open shadow root, hands the module a container inside it and a `Host`, and calls
`mount`; the module owns everything inside the container, the shell owns the page around it.

| Type              | What it is                                                                             |
| ----------------- | -------------------------------------------------------------------------------------- |
| `Readable<T>`     | `get()` for the current value, `listen` for changes — it never calls back on subscribe |
| `ToastTone`       | `info`, `success`, `warning`, `error` — as `@enonic/ui`'s `Toast` names them           |
| `NotifyOptions`   | `autoHide`, `lifetimeMs`                                                               |
| `Host`            | what every mount gets: `baseUrl`, `extension`, `locale`, `theme`, `visible`, `notify`  |
| `Routed`          | what a mount with a url segment adds: `path`, `navigate` with `NavigateOptions`        |
| `RoutedHost`      | `Host & Routed` — what an interface whose mounts own a segment hands over              |
| `MountOptions<H>` | the argument of `mount`: `container` and `host`; `H` defaults to `Host`                |
| `Unmount`         | what `mount` returns, synchronously; idempotent and must not throw                     |
| `Mount<H>`        | the function a module's entry exports — annotate it with this                          |
| `Module<H>`       | what a module's entry exports as a whole                                               |

A host declares which type its interface hands over; XP Settings' `settings.section` hands a
`RoutedHost`. A host whose mounts own no segment hands a `Host` extended with its own capability,
and a module written against `RoutedHost` is unaffected. The rules the types cannot express are in
the TSDoc, where a provider reads them: a module never touches the page outside its container,
every string crossing the boundary is localized, one module instance may serve several mounts and
`Host.extension` says which one this is, and a revoked host answers every call with a no-op.

The declarations reference the DOM lib for `HTMLElement`; a consumer's tsconfig has to include it,
which a browser project's does.

## The form and property contracts

What XP's own JS libraries serialize a form and a property tree to — `lib-content` for a content
type, `lib-schema` for a content type, mixin or form fragment, and an application's server for a
form it reads from a descriptor, such as an id provider's configuration — and what
`@enonic/input-types` reads them back from. The same dialect `@enonic-types/core` declares as
`FormItem`, so a server typed against XP's types produces these without a cast; here every field
XP omits is optional, `inputType` is any string and a config value is `unknown`, because that is
what arrives.

| Type                  | What it is                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `FormJson`            | a form: its items in order                                                                                    |
| `FormItemJson`        | one item — `InputJson`, `ItemSetJson`, `OptionSetJson`, `LayoutJson` or `FormFragmentJson`, by `formItemType` |
| `FormItemType`        | the discriminant: `Input`, `ItemSet`, `OptionSet`, `Layout`, `FormFragment`                                   |
| `OccurrencesJson`     | `minimum` and `maximum`; a maximum of 0 is unbounded                                                          |
| `InputConfigJson`     | an input type's config as XP's libraries emit it — a scalar, a list or an object under each property          |
| `OptionSetOptionJson` | one option: `name`, `label`, `default`, its `items`                                                           |
| `PropertyTreeJson`    | a property tree: its arrays                                                                                   |
| `PropertyArrayJson`   | a named array of one `ValueTypeName`, its `values`                                                            |
| `PropertyValueJson`   | a scalar under `v` or a nested tree under `set`                                                               |
| `ValueTypeName`       | the value types XP knows, as `ValueTypes` names them                                                          |

The `{ Input: { … } }` dialect with one wrapper key per item is Content Studio's REST talking to
Content Studio's client, and is not here.

How the Settings shell behaves behind these types — keep-alive, what a hidden mount hears,
revocation — is documented with the shell, in app-settings' `docs/extensions/`.

## Principals and tasks

What XP itself declares for a principal and a task — `@enonic-types/core`'s `PrincipalKey`,
`User`, `Group` and `Role`, `@enonic-types/lib-task`'s `TaskInfo` — copied here so that a browser
program needs no server package, and pinned by a type test so that a value typed there is
assignable here. The fields a server omits for a summary are optional. Reading and building a key
and following a task are `@enonic/ui-utils`' part.

| Type                             | What it is                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `PrincipalType`                  | `user`, `group`, `role` — a principal key's own prefix                                 |
| `UserKey`, `GroupKey`, `RoleKey` | `user:<idProvider>:<id>`, `group:<idProvider>:<id>`, `role:<id>` — a key is its string |
| `PrincipalKey`                   | any of the three                                                                       |
| `User`, `Group`, `Role`          | the record behind a key: `type`, `key`, `displayName`, and what that kind carries      |
| `Principal`                      | `User \| Group \| Role`, narrowed by `type`                                            |
| `TaskState`                      | `WAITING`, `RUNNING`, `FINISHED`, `FAILED`                                             |
| `TaskProgress`                   | `current` of `total`, and `info` — what the task reports, its result once it is done   |
| `TaskInfo`                       | a task as XP's and Content Studio's task resources answer it                           |

## The theme

The theme preference XP's admin applications share through one stored entry. Reading, writing
and following that entry is `@enonic/ui-utils`' part.

| Type            | What it is                                                             |
| --------------- | ---------------------------------------------------------------------- |
| `Theme`         | `light`, `dark`, `system` — what a user picks; `system` follows the OS |
| `ResolvedTheme` | `light`, `dark` — what a page paints, and what `Host.theme` carries    |

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
