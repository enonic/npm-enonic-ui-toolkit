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

How the Settings shell behaves behind these types — keep-alive, what a hidden mount hears,
revocation — is documented with the shell, in app-settings' `docs/extensions/`.

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
