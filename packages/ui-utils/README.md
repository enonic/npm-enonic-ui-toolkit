# @enonic/ui-utils

Everything useful without a view layer: the request transport and the i18n core.

**Nothing here imports a component or a framework, and nothing reads state it did not create.**
That is the package's whole value — it can be used from a store, a worker, a test, or code that has
no DOM at all, and a function's result depends on its arguments alone. Phrases come from the
consumer, which fetches them from its own server and passes them in.

```sh
pnpm add @enonic/ui-utils              # the errors and the i18n core, no peers
pnpm add @enonic/ui-utils neverthrow   # plus the transport, from '@enonic/ui-utils/request'
```

The root entry resolves nothing outside the package. The transport is its own entry,
`@enonic/ui-utils/request`, and the only code that needs `neverthrow`: every request answers with
its `ResultAsync`, so a consumer of the transport installs it and shares one copy of the class.
`neverthrow` is therefore an optional peer.

## What is here

| Export                                     | What it does                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `AppError`                                 | the base of every failure the package reports — `name` is a literal, `cause` rides the native `Error` option                              |
| `RequestError`                             | a response with an error status: `status`, and the body's `message` when the body is JSON and has one, else the status text               |
| `RequestAbortedError`                      | a request its caller gave up on through `signal`                                                                                          |
| `requestJson<T>(url, options?)` \*         | fetch a JSON body as `ResultAsync<T, AppError>`; `options` carries `method`, a JSON-serialized `body`, `headers` and `signal`             |
| `requestOptionalJson<T>(url, options?)` \* | the same, with a 204 or an empty or `null` body resolving to `undefined`                                                                  |
| `localize(phrases, key, ...values)`        | the phrase behind `key` with `{0}`-style placeholders filled by position; a missing key is `#key#`                                        |
| `Translate`                                | what an application hands `@enonic/ui`'s `I18nProvider`: the key and the package's English in, the application's text or that English out |
| `passthrough`                              | the `Translate` of an application that translates nothing                                                                                 |
| `fromPhrases(read)`                        | a `Translate` over a phrase map, read at call time                                                                                        |
| `fromLookup(has, get)`                     | a `Translate` over a has/get pair, as a `Messages`-style source offers                                                                    |
| `bindPhrases(translate, fragment)`         | the typed `t` of one fragment, for a store or anything else outside a render                                                              |
| `mergePhrases(fragments)`                  | one catalogue from a package's fragments, keys kept as a type; a key declared twice throws                                                |
| `comparePhrases(catalog, bundle)`          | the catalogue keys a bundle lacks, and those whose placeholder set differs                                                                |
| \* From `@enonic/ui-utils/request`.        |

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
