import {
  createContext,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';

export type ActionDialogContextValue = {
  /** Whether the action may be taken: anything inside the content may decide, a gate does. */
  confirmEnabled: boolean;
  setConfirmEnabled: (next: boolean) => void;
  /** Whether the footer is asking its question, during which the body is inert. */
  asking: boolean;
  setAsking: (next: boolean) => void;
  /** The way back from the question, for `Escape`. */
  keepRef: MutableRefObject<(() => void) | undefined>;
};

const ActionDialogContext = createContext<ActionDialogContextValue | undefined>(undefined);

export type ActionDialogProviderProps = {
  value: ActionDialogContextValue;
  children?: ReactNode;
};

export const ActionDialogProvider = ({
  value,
  children,
}: ActionDialogProviderProps): ReactElement => (
  <ActionDialogContext.Provider value={value}>{children}</ActionDialogContext.Provider>
);
ActionDialogProvider.displayName = 'ActionDialogProvider';

export const useActionDialog = (): ActionDialogContextValue => {
  const context = useContext(ActionDialogContext);
  if (context === undefined) {
    throw new Error('useActionDialog must be used within ActionDialog.Content');
  }
  return context;
};
