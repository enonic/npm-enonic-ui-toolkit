import { createContext, type ReactElement, type ReactNode, useContext, useMemo } from 'react';

export type FormRenderContextValue = {
  enabled: boolean;
  /** The application whose schema renders, for its own input types. */
  applicationKey?: string;
  /**
   * Where a warning the form wants shown goes — that a deselected option's data is dropped on
   * save, for one. Nothing is shown without it.
   */
  notify?: (message: string) => void;
};

const FormRenderContext = createContext<FormRenderContextValue | undefined>(undefined);

export type FormRenderProviderProps = FormRenderContextValue & {
  children?: ReactNode;
};

export const FormRenderProvider = ({
  enabled,
  applicationKey,
  notify,
  children,
}: FormRenderProviderProps): ReactElement => {
  const value = useMemo(
    () => ({ enabled, applicationKey, notify }),
    [enabled, applicationKey, notify],
  );
  return <FormRenderContext.Provider value={value}>{children}</FormRenderContext.Provider>;
};
FormRenderProvider.displayName = 'FormRenderProvider';

/** The form's settings when inside a `FormRenderProvider`; `undefined` when a hook is used outside one. */
export const useOptionalFormRender = (): FormRenderContextValue | undefined =>
  useContext(FormRenderContext);

export const useFormRender = (): FormRenderContextValue => {
  const context = useContext(FormRenderContext);
  if (context === undefined) {
    throw new Error('useFormRender must be used within a FormRenderProvider');
  }
  return context;
};
