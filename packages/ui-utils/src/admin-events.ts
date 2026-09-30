/**
 * `@enonic/ui-utils/admin-events` — the browser side of XP's admin events hub: the connection an
 * application makes to the served client, and a section's reaction to one topic on it. Its own
 * entry because it loads a module from a runtime url, which the root entry never does.
 */

export { documentVisibility } from './document-visibility';
export { createAdminEvents } from './hub-client';
export type { AdminEvents, ImportModule, TopicHandlers } from './hub-client';
export { createTopicReaction } from './topic-reaction';
export type { TopicReaction, TopicReactionOptions } from './topic-reaction';
