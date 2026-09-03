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

The contract between a shell and a module it mounts into its page: an admin section, a panel widget,
a menu item shipped by another application and discovered at runtime. The shell creates an open
shadow root, hands the module a container inside it and a `Host`, and calls `mount`; the module owns
everything inside the container, the shell owns the page around it.

| Type               | What it is                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `Readable<T>`      | `get()` for the current value, `subscribe` for changes — it never calls back on subscribe |
| `Notification`     | a toast the module raises: level, localized message, optional `autoClose`                 |
| `Host`             | what every mount gets: `baseUrl`, `locale`, `theme`, `visible`, `notify`                  |
| `Routed`           | what a mount with a url segment adds: `path`, `navigate`                                  |
| `SectionHost`      | `Host & Routed` — what an interface whose mounts own a segment hands over                 |
| `MountOptions<H>`  | `{ container, host }`, the argument of `mount`; `H` defaults to `Host`                    |
| `Unmount`          | what `mount` returns, synchronously; idempotent and must not throw                        |
| `SectionModule<H>` | what a module's entry exports: `{ mount(options: MountOptions<H>): Unmount }`             |

A host declares which type its interface hands over; XP Settings' `settings.section` hands a
`SectionHost`. A host whose mounts own no segment hands a `Host` extended with its own capability,
and a module written against `SectionHost` is unaffected. The rules the types cannot express are in
the TSDoc of `src/mount.ts`: a module never touches the page outside its container, every string
crossing the boundary is localized, one module instance serves every extension its application
ships, and a mount knows which extension it is by the last segment of `baseUrl`.

How the Settings shell behaves behind these types — keep-alive, what a hidden mount hears,
revocation — is documented with the shell, in app-settings' `docs/extensions/`.

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
