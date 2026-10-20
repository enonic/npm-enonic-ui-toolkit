import type { ResolvedTheme, Theme } from '@enonic/ui-types';

/**
 * The `localStorage` entry holding the user's theme, shared by every admin application on the
 * origin. Content Studio's pre-paint script reads it by hand, ahead of any bundle: a rename goes
 * there too.
 */
export const THEME_STORAGE_KEY = 'enonic:theme';

/**
 * The window event `writeTheme` dispatches, `detail` the theme written. `storage` fires only in
 * the other tabs; this is how the page that wrote hears it, every bundle on it alike.
 */
export const THEME_CHANGE_EVENT = 'enonic:theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** A stored value as a `Theme`: anything else, a missing entry included, is `system`. */
export function parseTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(theme: Theme, system: ResolvedTheme): ResolvedTheme {
  return theme === 'system' ? system : theme;
}

export function readSystemTheme(win: Window = window): ResolvedTheme {
  return win.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Reports the OS switching between light and dark; returns the unsubscribe. */
export function subscribeSystemTheme(
  listener: (theme: ResolvedTheme) => void,
  win: Window = window,
): () => void {
  const media = win.matchMedia(DARK_QUERY);
  const onChange = (): void => listener(media.matches ? 'dark' : 'light');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** The theme the user picked, `system` where there is none or storage cannot be read. */
export function readTheme(win: Window = window): Theme {
  try {
    return parseTheme(win.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

/** Stores the theme and tells the page; where storage refuses the write, warns and still tells it. */
export function writeTheme(theme: Theme, win: Window = window): void {
  try {
    win.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (cause: unknown) {
    console.warn(`The theme could not be stored under '${THEME_STORAGE_KEY}':`, cause);
  }
  win.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

/**
 * Reports the stored theme changing — written by this page or another tab, removed, cleared — and
 * never on subscribe; returns the unsubscribe. An event is only a cue to read storage again, so
 * what the listener hears is what `readTheme` answers.
 */
export function subscribeTheme(listener: (theme: Theme) => void, win: Window = window): () => void {
  const reread = changesOf(() => readTheme(win), listener);

  const onStorage = (event: StorageEvent): void => {
    // `key` is null for a `clear()`, which takes the entry with it.
    const ours = event.key === THEME_STORAGE_KEY || event.key === null;
    if (ours && event.storageArea === win.localStorage) {
      reread();
    }
  };

  const onChange = (): void => reread();

  win.addEventListener('storage', onStorage);
  win.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    win.removeEventListener('storage', onStorage);
    win.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

/** The theme to paint: the user's, with `system` answered by the OS. */
export function readResolvedTheme(win: Window = window): ResolvedTheme {
  return resolveTheme(readTheme(win), readSystemTheme(win));
}

/**
 * Reports the theme to paint changing, whether the user switched or the OS did, and never on
 * subscribe; returns the unsubscribe. A switch that paints the same — `light` to `system` on a
 * light OS — is not a change.
 */
export function subscribeResolvedTheme(
  listener: (theme: ResolvedTheme) => void,
  win: Window = window,
): () => void {
  const reread = changesOf(() => readResolvedTheme(win), listener);
  const unsubscribeTheme = subscribeTheme(reread, win);
  const unsubscribeSystem = subscribeSystemTheme(reread, win);
  return () => {
    unsubscribeTheme();
    unsubscribeSystem();
  };
}

// A cue to read again that calls the listener only when the answer differs from the last one.
function changesOf<T>(read: () => T, listener: (value: T) => void): () => void {
  let last = read();
  return () => {
    const next = read();
    if (next !== last) {
      last = next;
      listener(next);
    }
  };
}
