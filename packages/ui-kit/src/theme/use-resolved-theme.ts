import type { ResolvedTheme } from '@enonic/ui-types';
import { readResolvedTheme, subscribeResolvedTheme } from '@enonic/ui-utils';
import { useSyncExternalStore } from 'react';

/**
 * The theme to paint, re-rendering when the user switches — on this page or in another tab — or
 * the OS does while the theme is `system`. Read from storage, so there is no store to keep.
 */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeResolvedTheme, readResolvedTheme);
}
