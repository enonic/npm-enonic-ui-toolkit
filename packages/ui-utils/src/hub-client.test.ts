import { describe, expect, it, vi } from 'vitest';

import { createAdminEvents, type TopicHandlers } from './hub-client';

type ConnectHandlers = {
  onEvent: (event: { topic: string; data: unknown }) => void;
  onLoss: (loss: { topic: string; count: number | null }) => void;
};

function harness() {
  const subscribed: string[] = [];
  const loaded: string[] = [];
  let handlers: ConnectHandlers | undefined;
  let resolveImport: (() => void) | undefined;

  const client = {
    connect: (h: ConnectHandlers) => {
      handlers = h;
      return { subscribe: (topic: string) => subscribed.push(topic) };
    },
  };

  const events = createAdminEvents(
    '/hub',
    (url) =>
      new Promise((resolve) => {
        loaded.push(url);
        resolveImport = () => resolve(client);
      }),
  );

  return {
    events,
    subscribed,
    loaded,
    emit: (topic: string, data: unknown) => handlers?.onEvent({ topic, data }),
    lose: (topic: string, count: number | null) => handlers?.onLoss({ topic, count }),
    arrive: async () => {
      resolveImport?.();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

describe('createAdminEvents', () => {
  it('loads the client served under the hub url', async () => {
    const { events, loaded, arrive } = harness();
    events.connect();
    await arrive();

    expect(loaded).toEqual(['/hub/client.js']);
  });

  it('delivers a message only to the handlers of its topic', async () => {
    const { events, emit, arrive } = harness();
    const mine = vi.fn();
    const other = vi.fn();
    events.subscribeTopic('app:mine', { onMessage: mine });
    events.subscribeTopic('app:other', { onMessage: other });
    events.connect();
    await arrive();

    emit('app:mine', { n: 1 });

    expect(mine).toHaveBeenCalledWith({ n: 1 });
    expect(other).not.toHaveBeenCalled();
  });

  it('subscribes topics taken before the client arrived', async () => {
    const { events, subscribed, arrive } = harness();
    events.subscribeTopic('app:early', { onMessage: () => {} });
    events.connect();
    await arrive();

    expect(subscribed).toEqual(['app:early']);
  });

  it('subscribes a topic taken after the client arrived', async () => {
    const { events, subscribed, arrive } = harness();
    events.connect();
    await arrive();

    events.subscribeTopic('app:late', { onMessage: () => {} });

    expect(subscribed).toEqual(['app:late']);
  });

  it('reports loss to the topic that suffered it', async () => {
    const { events, lose, arrive } = harness();
    const onLoss = vi.fn();
    events.subscribeTopic('app:mine', { onMessage: () => {}, onLoss });
    events.connect();
    await arrive();

    lose('app:mine', 3);
    lose('app:mine', null);

    expect(onLoss).toHaveBeenNthCalledWith(1, 3);
    expect(onLoss).toHaveBeenNthCalledWith(2, null);
  });

  it('delivers a message past a subscriber that throws on it', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { events, emit, arrive } = harness();
    const next = vi.fn();
    events.subscribeTopic('app:mine', {
      onMessage: () => {
        throw new Error('broken section');
      },
    });
    events.subscribeTopic('app:mine', { onMessage: next });
    events.connect();
    await arrive();

    expect(() => emit('app:mine', { n: 1 })).not.toThrow();
    expect(next).toHaveBeenCalledWith({ n: 1 });
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('reports a loss past a subscriber that throws on it', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { events, lose, arrive } = harness();
    const next = vi.fn();
    events.subscribeTopic('app:mine', {
      onMessage: () => {},
      onLoss: () => {
        throw new Error('broken refresh');
      },
    });
    events.subscribeTopic('app:mine', { onMessage: () => {}, onLoss: next });
    events.connect();
    await arrive();

    expect(() => lose('app:mine', null)).not.toThrow();
    expect(next).toHaveBeenCalledWith(null);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('stops delivering once unsubscribed', async () => {
    const { events, emit, arrive } = harness();
    const onMessage = vi.fn();
    const unsubscribe = events.subscribeTopic('app:mine', { onMessage });
    events.connect();
    await arrive();

    unsubscribe();
    emit('app:mine', {});

    expect(onMessage).not.toHaveBeenCalled();
  });

  it('gives each subscription of one handlers object its own teardown', async () => {
    const { events, emit, arrive } = harness();
    const onMessage = vi.fn();
    const handlers: TopicHandlers = { onMessage };
    const first = events.subscribeTopic('app:mine', handlers);
    events.subscribeTopic('app:mine', handlers);
    events.connect();
    await arrive();

    emit('app:mine', { n: 1 });
    expect(onMessage).toHaveBeenCalledTimes(2);

    first();
    emit('app:mine', { n: 2 });
    expect(onMessage).toHaveBeenCalledTimes(3);
  });

  it('keeps a later subscriber when a stale unsubscribe is called twice', async () => {
    const { events, emit, arrive } = harness();
    const early = vi.fn();
    const late = vi.fn();
    const unsubscribeEarly = events.subscribeTopic('app:mine', { onMessage: early });
    events.connect();
    await arrive();

    unsubscribeEarly();
    events.subscribeTopic('app:mine', { onMessage: late });
    unsubscribeEarly();
    emit('app:mine', { n: 1 });

    expect(late).toHaveBeenCalledWith({ n: 1 });
  });

  it('drops the hub subscription with the last handler where the client can', async () => {
    const dropped: string[] = [];
    const events = createAdminEvents('/hub', () =>
      Promise.resolve({
        connect: () => ({ subscribe: () => {}, unsubscribe: (t: string) => dropped.push(t) }),
      }),
    );
    const first = events.subscribeTopic('app:mine', { onMessage: () => {} });
    const second = events.subscribeTopic('app:mine', { onMessage: () => {} });
    events.connect();
    await Promise.resolve();
    await Promise.resolve();

    first();
    expect(dropped).toEqual([]);
    second();
    expect(dropped).toEqual(['app:mine']);
  });

  it('connects once, whatever asks again', async () => {
    let imports = 0;
    const events = createAdminEvents('/hub', () => {
      imports += 1;
      return Promise.resolve({ connect: () => ({ subscribe: () => {} }) });
    });

    events.connect();
    events.connect();
    await Promise.resolve();

    expect(imports).toBe(1);
  });

  it('logs and stays quiet when the client cannot be loaded', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const events = createAdminEvents('/hub', () => Promise.reject(new Error('offline')));
    const onMessage = vi.fn();
    events.subscribeTopic('app:mine', { onMessage } satisfies TopicHandlers);

    events.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect(error).toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('retries the load on the next connect after a failure', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const subscribed: string[] = [];
    let attempts = 0;
    const events = createAdminEvents('/hub', () => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ connect: () => ({ subscribe: (t: string) => subscribed.push(t) }) });
    });
    events.subscribeTopic('app:mine', { onMessage: () => {} });

    events.connect();
    await Promise.resolve();
    await Promise.resolve();
    events.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect(attempts).toBe(2);
    expect(subscribed).toEqual(['app:mine']);
    error.mockRestore();
  });

  it('logs a client whose connect throws, and retries it on the next connect', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const subscribed: string[] = [];
    let attempts = 0;
    const events = createAdminEvents('/hub', () =>
      Promise.resolve({
        connect: () => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error('no worker');
          }
          return { subscribe: (t: string) => subscribed.push(t) };
        },
      }),
    );
    events.subscribeTopic('app:mine', { onMessage: () => {} });

    events.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect(error).toHaveBeenCalledTimes(1);
    expect(subscribed).toEqual([]);

    events.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect(attempts).toBe(2);
    expect(subscribed).toEqual(['app:mine']);
    error.mockRestore();
  });

  it('keeps the one connection when a replayed subscribe throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let connections = 0;
    const events = createAdminEvents('/hub', () =>
      Promise.resolve({
        connect: () => {
          connections += 1;
          return {
            subscribe: () => {
              throw new Error('port closed');
            },
          };
        },
      }),
    );
    events.subscribeTopic('app:mine', { onMessage: () => {} });

    events.connect();
    await Promise.resolve();
    await Promise.resolve();
    events.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect(error).toHaveBeenCalledTimes(1);
    expect(connections).toBe(1);
    error.mockRestore();
  });
});
