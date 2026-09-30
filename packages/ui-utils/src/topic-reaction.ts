import type { Readable } from '@enonic/ui-types';

import type { AdminEvents } from './hub-client';

export type TopicReactionOptions<M> = {
  /** The connection the topic is subscribed through. */
  events: Pick<AdminEvents, 'subscribeTopic'>;
  topic: string;
  /** The wire boundary: a message this returns `undefined` for is dropped. */
  parse: (data: unknown) => M | undefined;
  /** While hidden, messages are dropped and one `refresh` runs on reveal. A mount's `host.visible` fits. */
  visible: Readable<boolean>;
  apply: (messages: readonly M[]) => void;
  /** Re-reads the screen whole: after a loss, and on the reveal that ends a hidden spell. */
  refresh: () => void;
};

export type TopicReaction = {
  start: () => void;
  stop: () => void;
};

// ! Core emits one event per node, so an import is a burst of one-change messages; the window makes it one
// ! batch, which is what lets `apply` tell an edit from an import.
const WINDOW_MS = 300;

/** A section's subscription to one hub topic: parsing, the gathering window, loss and the hidden spell. */
export function createTopicReaction<M>({
  events,
  topic,
  parse,
  visible,
  apply,
  refresh,
}: TopicReactionOptions<M>): TopicReaction {
  let gathered: M[] = [];
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let stale = false;
  let unsubscribe: (() => void) | undefined;
  let unwatch: (() => void) | undefined;

  function flush(): void {
    scheduled = undefined;
    const batch = gathered;
    gathered = [];

    if (batch.length > 0) {
      apply(batch);
    }
  }

  // The refresh re-reads everything the window holds, so applying the window after it would only
  // repeat what the refresh already showed.
  function onLoss(): void {
    reset();
    if (visible.get()) {
      refresh();
    } else {
      stale = true;
    }
  }

  function onMessage(data: unknown): void {
    if (!visible.get()) {
      stale = true;
      return;
    }

    const message = parse(data);
    if (message === undefined) {
      return;
    }

    gathered.push(message);
    scheduled ??= setTimeout(flush, WINDOW_MS);
  }

  function reset(): void {
    if (scheduled !== undefined) {
      clearTimeout(scheduled);
      scheduled = undefined;
    }
    gathered = [];
    stale = false;
  }

  return {
    start(): void {
      if (unsubscribe !== undefined) {
        return;
      }

      unsubscribe = events.subscribeTopic(topic, { onMessage, onLoss });

      // ! `Readable.listen` reports changes only, never the current value on subscribe: a callback
      // ! on subscribe would refresh a screen that has just loaded.
      unwatch = visible.listen((shown) => {
        if (!shown) {
          // The refresh on reveal covers what the window holds; applying it later would race that refresh.
          const unapplied = gathered.length > 0;
          reset();
          stale = unapplied;
          return;
        }

        if (stale) {
          stale = false;
          refresh();
        }
      });
    },

    stop(): void {
      unsubscribe?.();
      unsubscribe = undefined;
      unwatch?.();
      unwatch = undefined;
      reset();
    },
  };
}
