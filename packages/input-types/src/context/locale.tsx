import { createContext, type ReactElement, type ReactNode, useContext } from 'react';

const LocaleContext = createContext<string | undefined>(undefined);

export type LocaleProviderProps = {
  /** The language of the content being edited, for `lang` and `dir` on the inputs; not the UI's. */
  locale: string | undefined;
  children?: ReactNode;
};

export const LocaleProvider = ({ locale, children }: LocaleProviderProps): ReactElement => (
  <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
);
LocaleProvider.displayName = 'LocaleProvider';

export const useLocale = (): string | undefined => useContext(LocaleContext);
