import { createContext, type ReactElement, type ReactNode, useContext } from 'react';

import type { RawValueMap } from '../descriptor/validate-form';

const RawValueContext = createContext<RawValueMap | undefined>(undefined);

export type RawValueProviderProps = {
  /** Shared with the form's validation, so what the user typed and could not be parsed is validated too. */
  map: RawValueMap;
  children?: ReactNode;
};

export const RawValueProvider = ({ map, children }: RawValueProviderProps): ReactElement => (
  <RawValueContext.Provider value={map}>{children}</RawValueContext.Provider>
);
RawValueProvider.displayName = 'RawValueProvider';

export const useRawValueMap = (): RawValueMap | undefined => useContext(RawValueContext);
