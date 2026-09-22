import { createContext, type ReactElement, type ReactNode, useContext, useMemo } from 'react';

import { FieldRegistry } from '../field-registry';

const FieldRegistryContext = createContext<FieldRegistry | undefined>(undefined);

export type FieldRegistryProviderProps = {
  /** The application's own instance when code outside the tree needs a stable reference; a fresh one otherwise. */
  registry?: FieldRegistry;
  children?: ReactNode;
};

export const FieldRegistryProvider = ({
  registry,
  children,
}: FieldRegistryProviderProps): ReactElement => {
  const value = useMemo(() => registry ?? new FieldRegistry(), [registry]);
  return <FieldRegistryContext.Provider value={value}>{children}</FieldRegistryContext.Provider>;
};
FieldRegistryProvider.displayName = 'FieldRegistryProvider';

export const useFieldRegistry = (): FieldRegistry | undefined => useContext(FieldRegistryContext);
