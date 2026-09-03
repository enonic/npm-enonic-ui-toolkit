/**
 * The contract between a shell and a module it mounts into its page — an admin section, a panel
 * widget, a menu item shipped by another application and discovered at runtime.
 *
 * The shell creates an open shadow root, hands the module a container inside it and a `Host`, and
 * calls `mount`. The module owns everything inside the container; the shell owns the page around it:
 * the url, the theme, the toast stack, the event socket. Nothing is shared at build time but these
 * types, and nothing crosses the boundary at runtime but the `Host` object and the returned `Unmount`.
 *
 * The rules a type cannot express, which every host and every module keep:
 *
 * - A module never touches `window.history`, `location` or `document.head`, and never writes
 *   outside its container. Its styles attach inside its shadow root; fonts come from the host.
 * - Every user-visible string crossing the boundary is already localized. No i18n key travels.
 * - The host imports one module per application and calls `mount` once per extension that
 *   application ships (unless one opts out with `config.module`), so module-level state is shared
 *   across those mounts and anything derived from `host` belongs to the mount it was handed to.
 * - A module tells which of its extensions a mount is by the last segment of `host.baseUrl`, the
 *   extension key `<app>:<name>`. `mount` is told nothing else.
 * - The host never calls `mount` twice for one extension without its `Unmount` in between. After
 *   `Unmount` returns, the host revokes the `Host` it handed over: subscriptions are dropped and a
 *   stale reference's calls are no-ops.
 *
 * The first host is XP's Settings shell (app-settings), whose `settings.section` interface hands a
 * {@link SectionHost}. How that shell behaves behind these types — keep-alive, what a hidden mount
 * hears, revocation — is documented with it, in its `docs/extensions/`.
 */

/**
 * Anything mutable the host hands over.
 *
 * `get()` is the current value. `subscribe` reports changes only and **never calls back on
 * subscribe** — read `get()` first, then subscribe for what comes after. A nanostores atom
 * satisfies the shape through `listen`, not `subscribe`; the contract names no store library.
 */
export type Readable<T> = {
  get(): T;
  subscribe(cb: (value: T) => void): () => void;
};

/** A toast on the host's stack, raised by a module through {@link Host.notify}. */
export type Notification = {
  level: 'info' | 'success' | 'warning' | 'error';
  /** Already localized by the module: no i18n key crosses the boundary. */
  message: string;
  /** `false` keeps it up until dismissed; a number overrides the host's own lifetime. */
  autoClose?: number | false;
};

/**
 * What every host hands every mount, whatever the mount is: a section, a panel widget, a menu item.
 * Every member answers a question the module cannot answer on its own, because the host owns the
 * answer; anything absent the module either knows itself or asks its own server.
 */
export type Host = {
  /**
   * The mounted module's own extension prefix — its data plane lives under it. Its last segment is
   * the extension key `<app>:<name>`, which is how a module serving several mounts tells them apart.
   */
  baseUrl: string;
  /** Resolved page locale. A locale change reloads the page, so it never changes mid-mount. */
  locale: string;
  /** Resolved theme. The module applies it inside its shadow root; the class never crosses. */
  theme: Readable<'light' | 'dark'>;
  /**
   * Whether this mount is on screen. A host keeps a mount alive while another shows, and a hidden
   * mount may pause what only a viewer needs — measuring, polling — until this turns true.
   */
  visible: Readable<boolean>;
  /** A toast on the host's stack; returns dismiss. Toasts of a mount come down with its revocation. */
  notify(notification: Notification): () => void;
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
   * `path` subscription, except a normalization with `replace`. A no-op while the mount is hidden.
   */
  navigate(subPath: string, opts?: { replace?: boolean }): void;
};

/**
 * What an interface whose mounts own a url segment hands over — XP Settings' `settings.section`
 * is the first. A host whose mounts own no segment hands a {@link Host} extended with its own
 * capability instead.
 */
export type SectionHost = Host & Routed;

export type MountOptions<H extends Host = Host> = {
  /** Inside an open shadow root the host created. The module renders here and nowhere else. */
  container: HTMLElement;
  /** Valid until unmount, then revoked: a stale reference's calls become no-ops. */
  host: H;
};

/** Idempotent, and must not throw. The host wraps it anyway. */
export type Unmount = () => void;

/**
 * What a module's entry exports: `mount` returns its `Unmount` synchronously, so a module that
 * loads its own configuration paints a skeleton first and moves on when the data arrives.
 */
export type SectionModule<H extends Host = Host> = {
  // ! A property, not a method: method parameters are bivariant, and a section module would then
  // ! accept a host without the segment it needs. As a property the mismatch fails to compile.
  mount: (options: MountOptions<H>) => Unmount;
};
