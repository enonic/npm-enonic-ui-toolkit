# @enonic/ui-utils

Everything useful without a view layer: the request transport and phrase lookup.

**Nothing here imports a component or a framework, and nothing reads state it did not create.**
That is the package's whole value — it can be used from a store, a worker, a test, or code that has
no DOM at all, and a function's result depends on its arguments alone. Phrases come from the
consumer, which fetches them from its own server and passes them in.

```sh
pnpm add @enonic/ui-utils neverthrow
```

`neverthrow` is an optional peer: every request answers with its `ResultAsync`, so a consumer of
the transport installs it and shares one copy of the class. A consumer of `localize` alone does not
need it, and must not have it pulled in.

## What is here

| Export                                  | What it does                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `AppError`                              | the base of every failure the package reports — `name` is a literal, `cause` rides the native `Error` option                  |
| `RequestError`                          | a response with an error status: `status`, and the body's `message` when the body is JSON and has one, else the status text   |
| `RequestAbortedError`                   | a request its caller gave up on through `signal`                                                                              |
| `requestJson<T>(url, options?)`         | fetch a JSON body as `ResultAsync<T, AppError>`; `options` carries `method`, a JSON-serialized `body`, `headers` and `signal` |
| `requestOptionalJson<T>(url, options?)` | the same, with a 204 or an empty or `null` body resolving to `undefined`                                                      |
| `localize(phrases, key, ...values)`     | the phrase behind `key` with `{0}`-style placeholders filled by position; a missing key is `#key#`                            |

Part of the [Enonic UI Toolkit](https://github.com/enonic/npm-enonic-ui-toolkit).
