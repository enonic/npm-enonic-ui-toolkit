import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  parseTheme,
  readResolvedTheme,
  readSystemTheme,
  readTheme,
  resolveTheme,
  subscribeResolvedTheme,
  subscribeSystemTheme,
  subscribeTheme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  writeTheme,
} from './theme';

type FakeOptions = {
  stored?: Record<string, string>;
  dark?: boolean;
  /** Every access to `localStorage` throws, as with site data blocked. */
  blocked?: boolean;
  /** `setItem` throws and `getItem` still answers, as with a full quota. */
  full?: boolean;
};

function fakeWindow({
  stored = {},
  dark = false,
  blocked = false,
  full = false,
}: FakeOptions = {}) {
  const target = new EventTarget();
  const media = Object.assign(new EventTarget(), { matches: dark });
  const localStorage = {
    getItem: (key: string) => stored[key] ?? null,
    setItem: (key: string, value: string) => {
      if (full) {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
      stored[key] = value;
    },
  };
  const sessionStorage = { getItem: () => null };

  Object.defineProperty(target, 'localStorage', {
    get: () => {
      if (blocked) {
        throw new DOMException('Access denied', 'SecurityError');
      }
      return localStorage;
    },
  });
  Object.assign(target, { matchMedia: () => media });
  const win = target as unknown as Window;

  // Node has no `StorageEvent`; the fields a listener reads are set on a plain one.
  const storageEvent = (key: string | null, area: object = localStorage): void => {
    const event = Object.assign(new Event('storage'), { key, storageArea: area });
    target.dispatchEvent(event);
  };

  return {
    win,
    stored,
    /** Another tab writes, or removes with `null`. */
    fromAnotherTab: (value: string | null, key = THEME_STORAGE_KEY): void => {
      if (value === null) {
        delete stored[key];
      } else {
        stored[key] = value;
      }
      storageEvent(key);
    },
    /** Another tab runs `localStorage.clear()`. */
    clearedInAnotherTab: (): void => {
      for (const key of Object.keys(stored)) {
        delete stored[key];
      }
      storageEvent(null);
    },
    sessionStorageEvent: (): void => storageEvent(THEME_STORAGE_KEY, sessionStorage),
    setOs: (next: boolean): void => {
      media.matches = next;
      media.dispatchEvent(new Event('change'));
    },
  };
}

// A second bundle on the page carries its own copy of the module.
async function anotherBundle(): Promise<typeof import('./theme')> {
  vi.resetModules();
  return import('./theme');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseTheme', () => {
  it('keeps a theme and reads anything else as system', () => {
    expect(['light', 'dark', 'system'].map(parseTheme)).toEqual(['light', 'dark', 'system']);
    expect([null, undefined, '', 'blue', 'Dark', 1].map(parseTheme)).toEqual(
      Array(6).fill('system'),
    );
  });
});

describe('resolveTheme', () => {
  it('answers system with the OS and keeps a choice', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});

describe('readTheme', () => {
  it('reads the stored theme', () => {
    expect(readTheme(fakeWindow({ stored: { [THEME_STORAGE_KEY]: 'dark' } }).win)).toBe('dark');
  });

  it('reads an invalid or missing entry as system', () => {
    expect(readTheme(fakeWindow({ stored: { [THEME_STORAGE_KEY]: 'blue' } }).win)).toBe('system');
    expect(readTheme(fakeWindow().win)).toBe('system');
  });

  it('reads system where storage is blocked', () => {
    expect(readTheme(fakeWindow({ blocked: true }).win)).toBe('system');
  });
});

describe('writeTheme', () => {
  it('stores the theme and announces it on the page', () => {
    const { win, stored } = fakeWindow();
    const announced = vi.fn();
    win.addEventListener(THEME_CHANGE_EVENT, (event) =>
      announced(event instanceof CustomEvent ? event.detail : undefined),
    );

    writeTheme('dark', win);

    expect(stored[THEME_STORAGE_KEY]).toBe('dark');
    expect(announced).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('holds the theme for the page where storage is blocked, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { win } = fakeWindow({ blocked: true });
    const listener = vi.fn();
    subscribeTheme(listener, win);

    expect(() => writeTheme('dark', win)).not.toThrow();

    expect(readTheme(win)).toBe('dark');
    expect(listener).toHaveBeenCalledExactlyOnceWith('dark');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('does not throw where storage is full, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { win } = fakeWindow({ full: true });

    expect(() => writeTheme('dark', win)).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('reaches another bundle on the page, storage blocked or not', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const other = await anotherBundle();

    for (const blocked of [false, true]) {
      const { win } = fakeWindow({ blocked });
      const listener = vi.fn();
      other.subscribeTheme(listener, win);

      writeTheme('dark', win);

      expect(listener).toHaveBeenCalledExactlyOnceWith('dark');
      expect(other.readTheme(win)).toBe('dark');
    }
  });
});

describe('subscribeTheme', () => {
  it('reports a write on the page and not the subscription itself', () => {
    const { win } = fakeWindow();
    const listener = vi.fn();
    subscribeTheme(listener, win);

    expect(listener).not.toHaveBeenCalled();

    writeTheme('dark', win);
    writeTheme('system', win);

    expect(listener.mock.calls).toEqual([['dark'], ['system']]);
  });

  it('reports a write from another tab', () => {
    const { win, fromAnotherTab } = fakeWindow();
    const listener = vi.fn();
    subscribeTheme(listener, win);

    fromAnotherTab('light');

    expect(listener).toHaveBeenCalledExactlyOnceWith('light');
  });

  it('ignores another key and sessionStorage', () => {
    const { win, fromAnotherTab, sessionStorageEvent } = fakeWindow();
    const listener = vi.fn();
    subscribeTheme(listener, win);

    fromAnotherTab('dark', 'enonic:cs:app');
    sessionStorageEvent();

    expect(listener).not.toHaveBeenCalled();
  });

  it('falls back to system when another tab removes the entry or clears storage', () => {
    for (const remove of ['removeItem', 'clear'] as const) {
      const { win, fromAnotherTab, clearedInAnotherTab } = fakeWindow({
        stored: { [THEME_STORAGE_KEY]: 'dark' },
      });
      const listener = vi.fn();
      subscribeTheme(listener, win);

      if (remove === 'clear') {
        clearedInAnotherTab();
      } else {
        fromAnotherTab(null);
      }

      expect(listener).toHaveBeenCalledExactlyOnceWith('system');
    }
  });

  it('stays quiet for a write of the theme already stored', () => {
    const { win, fromAnotherTab } = fakeWindow({ stored: { [THEME_STORAGE_KEY]: 'dark' } });
    const listener = vi.fn();
    subscribeTheme(listener, win);

    writeTheme('dark', win);
    fromAnotherTab('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops reporting once unsubscribed', () => {
    const { win, fromAnotherTab } = fakeWindow();
    const listener = vi.fn();
    subscribeTheme(listener, win)();

    writeTheme('dark', win);
    fromAnotherTab('light');

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('the system theme', () => {
  it('reads the OS and reports its changes', () => {
    const { win, setOs } = fakeWindow({ dark: true });
    const listener = vi.fn();

    expect(readSystemTheme(win)).toBe('dark');

    const unsubscribe = subscribeSystemTheme(listener, win);
    setOs(false);
    unsubscribe();
    setOs(true);

    expect(listener.mock.calls).toEqual([['light']]);
  });
});

describe('readResolvedTheme', () => {
  it('answers system with the OS and keeps a choice', () => {
    expect(readResolvedTheme(fakeWindow({ dark: true }).win)).toBe('dark');
    expect(
      readResolvedTheme(fakeWindow({ dark: true, stored: { [THEME_STORAGE_KEY]: 'light' } }).win),
    ).toBe('light');
  });
});

describe('subscribeResolvedTheme', () => {
  it('follows the OS while the theme is system', () => {
    const { win, setOs } = fakeWindow();
    const listener = vi.fn();
    subscribeResolvedTheme(listener, win);

    setOs(true);
    setOs(false);

    expect(listener.mock.calls).toEqual([['dark'], ['light']]);
  });

  it('ignores the OS once a theme is picked', () => {
    const { win, setOs } = fakeWindow({ stored: { [THEME_STORAGE_KEY]: 'light' } });
    const listener = vi.fn();
    subscribeResolvedTheme(listener, win);

    setOs(true);

    expect(listener).not.toHaveBeenCalled();
  });

  it('reports a switch only where the painted theme changes', () => {
    const { win, fromAnotherTab } = fakeWindow({ stored: { [THEME_STORAGE_KEY]: 'light' } });
    const listener = vi.fn();
    subscribeResolvedTheme(listener, win);

    writeTheme('system', win);
    writeTheme('dark', win);
    fromAnotherTab('system');

    expect(listener.mock.calls).toEqual([['dark'], ['light']]);
  });

  it('stops reporting once unsubscribed', () => {
    const { win, setOs } = fakeWindow();
    const listener = vi.fn();
    subscribeResolvedTheme(listener, win)();

    writeTheme('dark', win);
    setOs(true);

    expect(listener).not.toHaveBeenCalled();
  });
});
