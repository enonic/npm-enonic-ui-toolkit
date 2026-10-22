/**
 * What a mount takes; each option is one the loader also reads from its own `src`. The loader's
 * `theme` is left out on purpose: passed, it pins the menu, while left out the menu follows the
 * stored theme and the OS on its own — the contract `readTheme` and `writeTheme` spell out.
 */
export type AdminMenuOptions = {
  /** Opens the panel on mount. */
  autoOpen?: boolean;
  /** Hides the menu button while the panel is open — for a page that is the menu, as XP's home. */
  hideButtonWhenOpen?: boolean;
};

/** The api the loader leaves on the window as `XpMenu`. */
export type AdminMenu = {
  /** Mounts the menu, replacing the one on the page; resolves with the `<xp-menu>` host. */
  mount(options?: AdminMenuOptions): Promise<HTMLElement>;
  unmount(): void;
};

type MenuWindow = Window & { XpMenu?: AdminMenu };

const loads = new WeakMap<Document, Promise<AdminMenu>>();

// ! A module fetch that failed stays failed in the document's module map, so a retry needs a url
// ! the map has not seen. The loader ignores the extra param: it reads only the options it knows.
const attempts = new WeakMap<Document, number>();

function loaderSrc(loaderUrl: string, doc: Document, attempt: number): string {
  const url = new URL(loaderUrl, doc.baseURI);
  if (attempt > 0) {
    url.searchParams.set('retry', String(attempt));
  }
  return url.href;
}

function presentMenu(doc: Document): AdminMenu | undefined {
  return (doc.defaultView as MenuWindow | null)?.XpMenu;
}

/**
 * Loads the XP menu's loader — the `menu-loader` extension of `com.enonic.xp.app.main`, `loaderUrl`
 * being `extensionUrl({ application: 'com.enonic.xp.app.main', extension: 'menu-loader' })` — once
 * per document, as a module script with auto-mount off, and answers its api. An api the page
 * already has is answered as it is; a load that fails unlatches, so a later call retries.
 */
export function loadAdminMenu(loaderUrl: string, doc: Document = document): Promise<AdminMenu> {
  const present = presentMenu(doc);
  if (present) {
    return Promise.resolve(present);
  }

  let load = loads.get(doc);
  if (load === undefined) {
    const attempt = attempts.get(doc) ?? 0;
    load = new Promise<AdminMenu>((resolve, reject) => {
      const script = doc.createElement('script');
      script.type = 'module';
      script.dataset['autoMount'] = 'false';
      script.addEventListener('load', () => {
        const menu = presentMenu(doc);
        if (menu) {
          resolve(menu);
        } else {
          reject(new Error(`The menu loader at ${loaderUrl} left no XpMenu on the window`));
        }
      });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(`The menu loader at ${loaderUrl} failed to load`));
      });
      script.src = loaderSrc(loaderUrl, doc, attempt);
      doc.head.appendChild(script);
    });
    loads.set(doc, load);
    load.catch(() => {
      loads.delete(doc);
      attempts.set(doc, attempt + 1);
    });
  }
  return load;
}

/** Loads the loader where the page has none, then mounts; resolves with the `<xp-menu>` host. */
export function mountAdminMenu(
  loaderUrl: string,
  options?: AdminMenuOptions,
  doc: Document = document,
): Promise<HTMLElement> {
  return loadAdminMenu(loaderUrl, doc).then((menu) => menu.mount(options));
}
