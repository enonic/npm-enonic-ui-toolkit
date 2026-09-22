import { createContext, type ReactElement, type ReactNode, useContext } from 'react';

/**
 * Which errors the form shows: `none` before the user has done anything, `interactive` for the
 * fields the user touched, `all` after a save was attempted — the default without a provider.
 */
export type ValidationVisibility = 'none' | 'interactive' | 'all';

const ValidationVisibilityContext = createContext<ValidationVisibility>('all');

export type ValidationVisibilityProviderProps = {
  visibility: ValidationVisibility;
  children?: ReactNode;
};

export const ValidationVisibilityProvider = ({
  visibility,
  children,
}: ValidationVisibilityProviderProps): ReactElement => (
  <ValidationVisibilityContext.Provider value={visibility}>
    {children}
  </ValidationVisibilityContext.Provider>
);
ValidationVisibilityProvider.displayName = 'ValidationVisibilityProvider';

export const useValidationVisibility = (): ValidationVisibility =>
  useContext(ValidationVisibilityContext);
