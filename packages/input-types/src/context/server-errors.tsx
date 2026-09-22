import { createContext, type ReactElement, type ReactNode, useContext, useMemo } from 'react';

export type ServerErrorEntry = {
  /** The data path, without the leading dot: `address[1].zip`. */
  path: string;
  message: string;
};

export type ServerErrorsValue = {
  entries: readonly ServerErrorEntry[];
  /** Drops the errors of one occurrence, once the user edits it. */
  clear: (occurrencePath: string) => void;
  /** Drops the errors of a whole field, once its occurrences change. */
  clearField: (fieldPath: string) => void;
};

const ServerErrorsContext = createContext<ServerErrorsValue | undefined>(undefined);

export type ServerErrorsProviderProps = ServerErrorsValue & { children?: ReactNode };

export const ServerErrorsProvider = ({
  entries,
  clear,
  clearField,
  children,
}: ServerErrorsProviderProps): ReactElement => {
  const value = useMemo<ServerErrorsValue>(
    () => ({ entries, clear, clearField }),
    [entries, clear, clearField],
  );
  return <ServerErrorsContext.Provider value={value}>{children}</ServerErrorsContext.Provider>;
};
ServerErrorsProvider.displayName = 'ServerErrorsProvider';

export const useServerErrors = (): ServerErrorsValue | undefined => useContext(ServerErrorsContext);
