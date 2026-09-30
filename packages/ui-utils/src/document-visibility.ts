import type { Readable } from '@enonic/ui-types';

/**
 * Whether the page is shown, as a `Readable<boolean>` for a topic reaction of an application
 * with no host to hand it one: `document.visibilityState`, reported on `visibilitychange`.
 */
export function documentVisibility(doc: Document = document): Readable<boolean> {
  return {
    get: () => doc.visibilityState === 'visible',
    listen: (listener) => {
      const onChange = (): void => listener(doc.visibilityState === 'visible');
      doc.addEventListener('visibilitychange', onChange);
      return () => doc.removeEventListener('visibilitychange', onChange);
    },
  };
}
