import { createContext, type ReactElement, type ReactNode, useContext } from 'react';

import { inputTypeRegistry, type InputTypeRegistry } from '../registry';

const InputTypeRegistryContext = createContext<InputTypeRegistry>(inputTypeRegistry);

export type InputTypeRegistryProviderProps = {
  registry: InputTypeRegistry;
  children?: ReactNode;
};

/** Hands the form another registry than the shared one; a test, or an application with two. */
export const InputTypeRegistryProvider = ({
  registry,
  children,
}: InputTypeRegistryProviderProps): ReactElement => (
  <InputTypeRegistryContext.Provider value={registry}>{children}</InputTypeRegistryContext.Provider>
);
InputTypeRegistryProvider.displayName = 'InputTypeRegistryProvider';

export const useInputTypeRegistry = (): InputTypeRegistry => useContext(InputTypeRegistryContext);
