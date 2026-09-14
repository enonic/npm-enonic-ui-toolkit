import type { Translate } from '@enonic/ui-utils';
import { createContext } from 'react';

export type UiKitContextValue = {
  translate?: Translate;
};

// ! Defaulted rather than left empty: a kit component renders outside a provider — in a consumer
// ! that never wrote one — and must speak English there rather than throw.
export const UiKitContext = createContext<UiKitContextValue>({});
