/**
 * The contract between a shell and a module it mounts into its page — a screen or a panel shipped
 * by another application, discovered at runtime and rendered into a container the shell owns.
 *
 * The shell creates an open shadow root, hands the module a container inside it and a `Host`, and
 * calls `mount`. The module owns everything inside the container; the shell owns the page around it.
 * Nothing is shared at build time but these types, and nothing crosses the boundary at runtime but
 * the `Host` object and the returned `Unmount`.
 *
 * The rules a type cannot express, which every host and every module keep:
 *
 * - A module never touches `window.history`, `location` or `document.head`, and never writes
 *   outside its container. Its styles attach inside its shadow root; fonts come from the host.
 * - Every user-visible string crossing the boundary is already localized. No i18n key travels.
 * - One module instance may serve several mounts, so module-level state is shared across them and
 *   anything derived from `host` belongs to the mount it was handed to. `Host.extension` says
 *   which mount this is.
 * - The host never calls `mount` twice for one extension without its `Unmount` in between. After
 *   `Unmount` returns, the host revokes the `Host` it handed over: `listen` returns an unsubscribe
 *   that does nothing, `navigate` and `notify` do nothing, `get()` keeps answering the last value.
 *
 * How a particular shell behaves behind these types is documented with that shell.
 */

/**
 * Anything mutable the host hands over.
 *
 * `get()` is the current value. `listen` reports changes only and **never calls back on
 * subscribe** — read `get()` first, then listen for what comes after. A nanostores atom satisfies
 * the shape with the right behaviour through its own `listen`; the contract names no store library.
 */
export type Readable<T> = {
  get(): T;
  listen(listener: (value: T) => void): () => void;
};

/** The tone of a toast, as `@enonic/ui`'s `Toast` names them. */
export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export type NotifyOptions = {
  /** Whether the toast comes down on its own. Defaults to the host's policy for the tone. */
  autoHide?: boolean;
  /**
   * How long an auto-hiding toast stays, in milliseconds. Defaults to the host's lifetime, and a
   * value that is not positive is the host's lifetime too.
   */
  lifetimeMs?: number;
};

/**
 * What every host hands every mount. Every member answers a question the module cannot answer on
 * its own, because the host owns the answer; anything absent the module either knows itself or
 * asks its own server.
 */
export type Host = {
  /** The mounted module's own extension prefix — its data plane lives under it. */
  baseUrl: string;
  /**
   * The extension this mount is, as the descriptor key `<app>:<name>`. A module serving several
   * extensions tells its mounts apart by it.
   */
  extension: string;
  /** Resolved page locale. A locale change reloads the page, so it never changes mid-mount. */
  locale: string;
  /** Resolved theme. The module applies it inside its shadow root; the class never crosses. */
  theme: Readable<'light' | 'dark'>;
  /**
   * Whether this mount is on screen. A host keeps a mount alive while another shows, and a hidden
   * mount may pause what only a viewer needs — measuring, polling — until this turns true.
   */
  visible: Readable<boolean>;
  /**
   * A toast on the host's stack, `message` already localized; returns dismiss. Toasts of a mount
   * come down with its revocation.
   */
  notify(tone: ToastTone, message: string, options?: NotifyOptions): () => void;
};

export type NavigateOptions = {
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean;
};

/**
 * What a host adds for a mount that owns a segment of its url. The sub-path is the module's opaque
 * string, search params included: the host routes it, stores it, restores it, and never parses it.
 */
export type Routed = {
  /**
   * The module's sub-path as the url has it now, `''` at the segment root. Back, forward and a
   * deep link all arrive here; a hidden mount's `path` is frozen until it shows again.
   */
  path: Readable<string>;
  /**
   * Programmatic navigation within the module's own segment, from user intent — never from a
   * `path` listener, except a normalization with `replace`. A no-op while the mount is hidden.
   */
  navigate(subPath: string, options?: NavigateOptions): void;
};

/** What an interface whose mounts own a url segment hands over. */
export type RoutedHost = Host & Routed;

export type MountOptions<H extends Host = Host> = {
  /** Inside an open shadow root the host created. The module renders here and nowhere else. */
  container: HTMLElement;
  /** Valid until unmount, then revoked: a stale reference's calls become no-ops. */
  host: H;
};

/**
 * Idempotent, and must not throw. Synchronous by design, and permanently so: the host calls it and
 * revokes the `Host` in the same tick, so there is no window for asynchronous teardown to land in.
 */
export type Unmount = () => void;

/**
 * The function a module's entry exports. It returns its `Unmount` synchronously, so a module that
 * loads its own configuration paints a skeleton first and moves on when the data arrives. A module
 * annotates its export with it — `export const mount: Mount<RoutedHost> = …` — which is what makes
 * the host type a compile-time check rather than a comment.
 */
export type Mount<H extends Host = Host> = (options: MountOptions<H>) => Unmount;

/**
 * What a module's entry exports. `mount` is a property, not a method: method parameters are
 * bivariant, and a module written for a `RoutedHost` would otherwise be assignable to a host that
 * hands over no url segment. As a property the mismatch fails to compile.
 */
export type Module<H extends Host = Host> = {
  mount: Mount<H>;
};
