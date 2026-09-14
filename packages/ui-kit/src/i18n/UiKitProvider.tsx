import type { Translate } from '@enonic/ui-utils';
import { useMemo, type ReactNode } from 'react';

import { UiKitContext } from './context';

export type UiKitProviderProps = {
  /** Absent leaves every kit component speaking English. */
  translate?: Translate;
  children?: ReactNode;
};

/** One per React root: what the kit renders in the application's words rather than its own. */
export function UiKitProvider({ translate, children }: UiKitProviderProps) {
  const value = useMemo(() => ({ translate }), [translate]);

  return <UiKitContext.Provider value={value}>{children}</UiKitContext.Provider>;
}
