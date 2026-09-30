import type { Readable } from '@enonic/ui-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TopicHandlers } from './hub-client';
import { createTopicReaction } from './topic-reaction';

const WINDOW_MS = 300;

/** A `Readable<boolean>` with a setter: what a nanostores atom is, without the dependency. */
function readable(initial: boolean): Readable<boolean> & { set: (next: boolean) => void } {
  let value = initial;
  const listeners = new Set<(next: boolean) => void>();
  return {
    get: () => value,
    listen: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      value = next;
      listeners.forEach((listener) => listener(next));
    },
  };
}

function setup(shown = true) {
  const visible = readable(shown);
  const apply = vi.fn();
  const refresh = vi.fn();
  const unsubscribe = vi.fn();
  const subscribeTopic = vi.fn<(topic: string, handlers: TopicHandlers) => () => void>(
    () => unsubscribe,
  );

  const reaction = createTopicReaction<string>({
    events: { subscribeTopic },
    topic: 'topic',
    parse: (data) => (typeof data === 'string' ? data : undefined),
    visible,
    apply,
    refresh,
  });
  reaction.start();

  const hub = (): TopicHandlers => {
    const handlers = subscribeTopic.mock.calls[0]?.[1];
    if (handlers === undefined) {
      throw new Error('nothing subscribed');
    }
    return handlers;
  };

  return { visible, apply, refresh, unsubscribe, subscribeTopic, reaction, hub };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createTopicReaction', () => {
  it('subscribes the topic through the connection it was given', () => {
    const { subscribeTopic } = setup();

    expect(subscribeTopic).toHaveBeenCalledExactlyOnceWith('topic', expect.anything());
  });

  it('gathers a burst into one batch, in arrival order', () => {
    const { apply, hub } = setup();

    hub().onMessage('a');
    hub().onMessage(42);
    hub().onMessage('b');

    expect(apply).not.toHaveBeenCalled();

    vi.advanceTimersByTime(WINDOW_MS);

    expect(apply).toHaveBeenCalledExactlyOnceWith(['a', 'b']);
  });

  it('refreshes on a loss instead of guessing what was missed', () => {
    const { refresh, apply, hub } = setup();

    hub().onLoss?.(null);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
  });

  it('lets a loss take the open window with it: the refresh covers it', () => {
    const { apply, refresh, hub } = setup();

    hub().onMessage('a');
    hub().onLoss?.(2);
    vi.advanceTimersByTime(WINDOW_MS);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
  });

  it('drops what arrives while hidden and refreshes once on reveal', () => {
    const { visible, apply, refresh, hub } = setup(false);

    hub().onMessage('a');
    hub().onMessage('b');
    hub().onLoss?.(3);
    vi.advanceTimersByTime(WINDOW_MS);

    expect(apply).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    visible.set(true);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh a reveal nothing happened during', () => {
    const { visible, refresh } = setup(false);

    visible.set(true);

    expect(refresh).not.toHaveBeenCalled();
  });

  it('lets a hide take the open window with it and re-reads on reveal instead', () => {
    const { visible, apply, refresh, hub } = setup();

    hub().onMessage('a');
    visible.set(false);
    vi.advanceTimersByTime(WINDOW_MS);

    expect(apply).not.toHaveBeenCalled();

    visible.set(true);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops cleanly: the subscription goes and a pending window never applies', () => {
    const { apply, unsubscribe, reaction, hub } = setup();

    hub().onMessage('a');
    reaction.stop();
    vi.advanceTimersByTime(WINDOW_MS);

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
  });

  it('subscribes once however often it is started', () => {
    const { reaction, subscribeTopic } = setup();

    reaction.start();

    expect(subscribeTopic).toHaveBeenCalledTimes(1);
  });
});
