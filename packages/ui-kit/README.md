# @enonic/ui-kit

The composite components — what `@enonic/ui` would be if its parts carried behaviour: layouts,
split panels, toolbars, browse screens with their list and details columns, dialog and form shells.

A component belongs here when it holds state, coordinates several base components, or encodes a
screen pattern more than one application repeats. Props in, callbacks out: nothing here may reach
into a host application's configuration, stores, router or phrase keys.

Part of [the Enonic UI toolkit](../../README.md); see
[`docs/architecture.md`](../../docs/architecture.md) for what belongs where.
