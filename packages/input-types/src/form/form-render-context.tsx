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
  /**
   * Whether a form-wide `all` visibility also reaches the occurrences added during the session.
   * Off by default: an application that saves an invalid form lets a new occurrence stay quiet
   * until it is edited. One that refuses to save turns it on, so the refusal shows its reasons.
   */
  revealFreshOccurrences?: boolean;
};

const FormRenderContext = createContext<FormRenderContextValue | undefined>(undefined);

export type FormRenderProviderProps = FormRenderContextValue & {
  children?: ReactNode;
};

export const FormRenderProvider = ({
  enabled,
  applicationKey,
  notify,
  revealFreshOccurrences,
  children,
}: FormRenderProviderProps): ReactElement => {
  const value = useMemo(
    () => ({ enabled, applicationKey, notify, revealFreshOccurrences }),
    [enabled, applicationKey, notify, revealFreshOccurrences],
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
