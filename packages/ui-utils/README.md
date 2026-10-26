# @enonic/ui-utils

Everything useful without a view layer: the request transport, the i18n core, the values an XP
form edits with the helpers that parse and format them, principal keys, a task followed to its
end, the browser side of the admin events hub, and the theme the admin applications share.

**Nothing here imports a component or a framework, and nothing reads state it did not create.**
That is the package's whole value — it can be used from a store, a worker, a test, or code that has
no DOM at all, and a function's result depends on its arguments alone. Phrases come from the
consumer, which fetches them from its own server and passes them in. The exceptions read the
environment by nature: the theme reads its storage and the OS preference through the `window` it
is handed, the page's by default; `documentVisibility` reads the `document` it is handed;
`parseRelativeTime` reads the clock unless it is handed `now`, and `dateFromTime` answers a time of
today; the admin events hub imports its client from the url it is given.

```sh
pnpm add @enonic/ui-utils              # the errors, the i18n core and the values, no peers
pnpm add @enonic/ui-utils neverthrow   # plus the transport, from '@enonic/ui-utils/request'
```

The hub client is its own entry too, `@enonic/ui-utils/admin-events`, with no peer: it is the one
code here that loads a module from a runtime url — the client XP serves under the hub's api. So is
the XP menu, `@enonic/ui-utils/admin-menu`: the one code here that writes to `document.head`, where
it puts the loader XP serves as the `menu-loader` extension of `com.enonic.xp.app.main`. And so is
the task polling, `@enonic/ui-utils/task`, for the transport's reason: it answers with its
`ResultAsync`.

The root entry resolves nothing outside the package. The transport is its own entry,
`@enonic/ui-utils/request`, and the only code that needs `neverthrow`: every request answers with
its `ResultAsync`, so a consumer of the transport installs it and shares one copy of the class.
`neverthrow` is therefore an optional peer.

## What is here

| Export                                                                                                                                            | What it does                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppError`                                                                                                                                        | the base of every failure the package reports — `name` is a literal, `cause` rides the native `Error` option                                   |
| `RequestError`                                                                                                                                    | a response with an error status: `status`, and the body's `message` when the body is JSON and has one, else the status text                    |
| `RequestAbortedError`                                                                                                                             | a request its caller gave up on through `signal`                                                                                               |
| `requestJson<T>(url, options?)` \*                                                                                                                | fetch a JSON body as `ResultAsync<T, AppError>`; `options` carries `method`, a JSON-serialized `body`, `headers` and `signal`                  |
| `requestOptionalJson<T>(url, options?)` \*                                                                                                        | the same, with a 204 or an empty or `null` body resolving to `undefined`                                                                       |
| `localize(phrases, key, ...values)`                                                                                                               | the phrase behind `key` with `{0}`-style placeholders filled by position; a missing key is `#key#`                                             |
| `Translate`                                                                                                                                       | what an application hands `@enonic/ui`'s `I18nProvider`: the key and the package's English in, the application's text or that English out      |
| `passthrough`                                                                                                                                     | the `Translate` of an application that translates nothing                                                                                      |
| `fromPhrases(read)`                                                                                                                               | a `Translate` over a phrase map, read at call time                                                                                             |
| `fromLookup(has, get)`                                                                                                                            | a `Translate` over a has/get pair, as a `Messages`-style source offers                                                                         |
| `bindPhrases(translate, fragment)`                                                                                                                | the typed `t` of one fragment, for a store or anything else outside a render                                                                   |
| `mergePhrases(fragments)`                                                                                                                         | one catalogue from a package's fragments, keys kept as a type; a key declared twice throws                                                     |
| `comparePhrases(catalog, bundle)`                                                                                                                 | the catalogue keys a bundle lacks, and those whose placeholder set differs                                                                     |
| `LocalDate`, `LocalTime`, `LocalDateTime`                                                                                                         | XP's zone-less date, time and date-time: `fromString` and `fromDate` in, `toString` and `toDate` out, `equals` by value                        |
| `DateTime`                                                                                                                                        | XP's instant, `2015-04-17T06:00:30.250Z`; its fields are UTC                                                                                   |
| `GeoPoint`, `Reference`, `BinaryReference`, `Link`                                                                                                | the other values a property holds, each its string and an `equals`                                                                             |
| `parseTime`, `parseDateTime`                                                                                                                      | `06:00[:30[.250]]`, and `2015-04-17` joined with it — `undefined` for anything else, a rolled-over day included                                |
| `formatDate`, `formatTime`                                                                                                                        | the same strings from a `Date` or from hours, minutes and seconds                                                                              |
| `pad`, `dateFromTime`                                                                                                                             | the small helpers behind them                                                                                                                  |
| `parseRelativeTime(expression, now?)`                                                                                                             | the `Date` a form's default names: `now`, `+1d`, `-2h +30m`; `isRelativeTime` says whether a string is one                                     |
| `userKey`, `groupKey`, `roleKey`                                                                                                                  | a `PrincipalKey` from its parts                                                                                                                |
| `isPrincipalKey(value)`, `parsePrincipalKey(value)`                                                                                               | whether a string is a key, and the key or a throw                                                                                              |
| `principalType`, `principalId`, `idProviderOf`                                                                                                    | a key's parts back; a role has no id provider                                                                                                  |
| `principalPath(key)`                                                                                                                              | where the Users application shows it: `/roles/<id>`, `/<idProvider>/users/<id>`                                                                |
| `isSystemPrincipal(key)`                                                                                                                          | `su`, `anonymous`, the `system.` roles and the project roles                                                                                   |
| `SUPER_USER_KEY`, `ANONYMOUS_USER_KEY`, `*_ROLE`, `SYSTEM_ID_PROVIDER`                                                                            | the principals XP defines: `role:system.admin`, `role:system.everyone`, `role:cms.admin` and the rest                                          |
| `pollTask(tasksUrl, taskId, options?)` §                                                                                                          | `<tasksUrl>/<taskId>` read every `intervalMs` until `FINISHED`, the final `TaskInfo`, or `FAILED`, a `TaskFailedError`; `onProgress`, `signal` |
| `taskProgressPercent(task)` §                                                                                                                     | `current` of `total` as a whole percentage, 0 while the total is unknown                                                                       |
| `TaskFailedError` §                                                                                                                               | a task that ended in `FAILED`: `message` is what it reported, `task` its final info                                                            |
| `createAdminEvents(hubUrl)` †                                                                                                                     | the hub reached at the `admin:events` url: `connect()` loads the served client once, `subscribeTopic(topic, handlers)` until unsubscribed      |
| `createTopicReaction(options)` †                                                                                                                  | one topic's messages parsed and gathered into a batch, dropped while `visible` is false with a `refresh` on reveal, and a `refresh` on loss    |
| `documentVisibility()` †                                                                                                                          | the page's `visibilityState` as the `Readable<boolean>` a reaction takes, for an application no host hands one                                 |
| `loadAdminMenu(loaderUrl)` ‡                                                                                                                      | the XP menu's loader on the page once, auto-mount off, and its api — `mount(options)` answering the `<xp-menu>` host, and `unmount()`          |
| `mountAdminMenu(loaderUrl, options?)` ‡                                                                                                           | the loader where the page has none, then one mount; `autoOpen` and `hideButtonWhenOpen` — the menu follows the stored theme on its own         |
| `readTheme()`, `writeTheme(theme)`                                                                                                                | the theme the user picked, `system` where none is stored; writing stores it and tells the page                                                 |
| `subscribeTheme(listener)`                                                                                                                        | the picked theme changing — on this page, in another tab, removed — until unsubscribed                                                         |
| `readResolvedTheme()`, `subscribeResolvedTheme(listener)`                                                                                         | the theme to paint, `system` answered by the OS, and its changes whether the user switched or the OS did                                       |
| `THEME_STORAGE_KEY`, `THEME_CHANGE_EVENT`                                                                                                         | the `localStorage` entry and the window event the theme travels by                                                                             |
| \* From `@enonic/ui-utils/request`. † From `@enonic/ui-utils/admin-events`. ‡ From `@enonic/ui-utils/admin-menu`. § From `@enonic/ui-utils/task`. |

## The theme

XP's admin applications — Settings, Content Studio, the menu — are released separately and share
one theme: the `enonic:theme` entry in `localStorage`, `light`, `dark` or `system`. These
functions are that contract, so that no application spells it out by hand.

- **The entry is the truth.** An event is only a cue to read it again: what a listener hears is
  what `readTheme` answers, and a missing or invalid entry is `system`.
- **Every page hears a switch.** `storage` fires only in the other tabs, so `writeTheme` also
  dispatches `THEME_CHANGE_EVENT` on the window, which every bundle on the page listens to.
- **Listeners hear changes.** Never on subscribe, and not for a write that leaves the answer as it
  was; each `subscribe*` returns its unsubscribe, and the caller decides how long it listens.
- **Blocked storage reads as `system`, and a write warns.**

Content Studio's pre-paint script reads `enonic:theme` inline, before any bundle loads, and is the
one copy of the key outside this package.

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
