# @enonic/ui-utils

Everything useful without a view layer: strings, URLs, dates and formatting, the request transport,
the i18n core.

**Nothing here imports Preact or a component.** That is the package's whole value — it can be used
from a store, a worker, a test, or code that has no DOM at all. The i18n core is mechanism only:
phrases come from the consumer, which fetches them from its own server and feeds them in.

Part of [the Enonic UI toolkit](../../README.md); see
[`docs/architecture.md`](../../docs/architecture.md) for what belongs where.
