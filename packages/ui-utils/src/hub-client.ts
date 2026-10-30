/**
 * The admin events hub, browser side. The platform serves the client itself —
 * `<admin:events>/client.js`, a shared worker keyed by the script url, so every consumer on the
 * page shares one socket — and this is what an application adds on top: load that module once,
 * keep the handlers per topic, and hold a subscription taken before the client arrived. Per-topic
 * authorization is the server's (`setTopic` `allow`), never re-decided here.
 */

export type TopicHandlers = {
  /** A message on the topic; refetching is the usual answer. The payload is the publisher's. */
  onMessage: (data: unknown) => void;
  /** Messages were missed: `count` when the gap is countable, `null` when it is not. */
  onLoss?: (count: number | null) => void;
};

export type AdminEvents = {
  /** Loads the served client and connects once; a failed load unlatches, so a later call retries. */
  connect(): void;
  /**
   * Delivers the topic's messages until unsubscribed. The hub subscription itself goes with the
   * last handler where the served client can drop one, and stays for the page's life where it
   * cannot.
   */
  subscribeTopic(topic: string, handlers: TopicHandlers): () => void;
  /**
   * `true` when the socket opens, `false` when it drops, `true` when it is back, until
   * unsubscribed — so the first report may well be `true`. A hub never reached is silent. Through
   * the shared worker, a page opened while the socket is down hears `false` on connect; over a
   * socket of the page's own it hears nothing until the socket opens. Nothing is replayed, so
   * subscribe before `connect()`.
   */
  subscribeConnection(listener: (connected: boolean) => void): () => void;
  /**
   * The session ended — logout, idle timeout, or a reconnect refused after a restart — until
   * unsubscribed. The served client stops reconnecting; a reload after signing in is the way back.
   */
  subscribeSessionEnd(listener: () => void): () => void;
};

/** Loads the module at a runtime url; `import()` by default, a double in tests. */
export type ImportModule = (url: string) => Promise<unknown>;

// What `client.js` exports, as far as this module uses it.
type HubEvent = { topic: string; data: unknown };
type HubLoss = { topic: string; count: number | null };
type HubClient = {
  connect(handlers: {
    onEvent: (event: HubEvent) => void;
    onLoss: (loss: HubLoss) => void;
    onConnectionChange?: (connected: boolean) => void;
    onSessionEnd?: () => void;
  }): HubConnection;
};
// ? `unsubscribe` is what the socket underneath has and the served facade does not expose yet;
// ? optional, so the client uses it the release it appears.
type HubConnection = { subscribe(topic: string): void; unsubscribe?(topic: string): void };

/**
 * The hub reached at `hubUrl`, the url of the `admin:events` api. One per mount is the natural
 * unit; the shared worker underneath makes it one socket regardless.
 */
export function createAdminEvents(
  hubUrl: string,
  // ? @vite-ignore: the specifier is a runtime url served by the platform.
  importModule: ImportModule = (url) => import(/* @vite-ignore */ url),
): AdminEvents {
  // One registration per call, however many calls share a handlers object: each teardown
  // removes only what its own call added.
  type Registration = { handlers: TopicHandlers };
  const registry = new Map<string, Set<Registration>>();
  const connectionListeners = new Set<(connected: boolean) => void>();
  const sessionEndListeners = new Set<() => void>();
  let connection: HubConnection | undefined;
  let connecting = false;

  const dispatch = (topic: string, deliver: (handlers: TopicHandlers) => void): void =>
    deliverTo(registry.get(topic), ({ handlers }) => deliver(handlers), `handler of '${topic}'`);

  return {
    connect: () => {
      if (connecting) {
        return;
      }
      connecting = true;

      importModule(`${hubUrl}/client.js`)
        .then((loaded) => {
          connection = (loaded as HubClient).connect({
            onEvent: ({ topic, data }) => dispatch(topic, (h) => h.onMessage(data)),
            onLoss: ({ topic, count }) => dispatch(topic, (h) => h.onLoss?.(count)),
            onConnectionChange: (connected) =>
              deliverTo(connectionListeners, (l) => l(connected), 'connection listener'),
            onSessionEnd: () => deliverTo(sessionEndListeners, (l) => l(), 'session end listener'),
          });

          registry.forEach((_, topic) => {
            try {
              connection?.subscribe(topic);
            } catch (cause: unknown) {
              console.error(`Failed to subscribe to the admin events topic '${topic}':`, cause);
            }
          });
        })
        .catch((cause: unknown) => {
          // ! Unlatch, or one transient failure would kill live updates for the page's life: the
          // ! next connect() — a section re-entered, a later start — retries the import.
          // A throw after the connection was made stays latched: a retry would open a second one.
          if (connection === undefined) {
            connecting = false;
          }
          console.error('Failed to load the admin events client:', cause);
        });
    },
    subscribeTopic: (topic, handlers) => {
      const registration: Registration = { handlers };
      let set = registry.get(topic);
      if (set == null) {
        set = new Set();
        registry.set(topic, set);
      }
      set.add(registration);

      // Idempotent on the hub client, so a second subscriber costs nothing.
      connection?.subscribe(topic);

      return () => {
        set.delete(registration);
        // ! Identity-checked: a stale unsubscribe must not evict a later subscriber's set.
        if (set.size === 0 && registry.get(topic) === set) {
          registry.delete(topic);
          connection?.unsubscribe?.(topic);
        }
      };
    },
    subscribeConnection: (listener) => {
      connectionListeners.add(listener);
      return () => {
        connectionListeners.delete(listener);
      };
    },
    subscribeSessionEnd: (listener) => {
      sessionEndListeners.add(listener);
      return () => {
        sessionEndListeners.delete(listener);
      };
    },
  };
}

//
// * Internal
//

/**
 * Calls every listener, logging the one that throws instead of letting it stop the rest: a loss, a
 * connection change or a session end is reported once. Shared by the topic handlers, keyed by
 * topic, and the connection and session end listeners, which have no topic. `what` labels the log.
 */
function deliverTo<T>(
  listeners: Iterable<T> | undefined,
  deliver: (listener: T) => void,
  what: string,
): void {
  for (const listener of listeners ?? []) {
    try {
      deliver(listener);
    } catch (cause: unknown) {
      console.error(`An admin events ${what} failed:`, cause);
    }
  }
}
