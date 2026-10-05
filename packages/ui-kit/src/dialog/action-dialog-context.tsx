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
  /** The element inside the content that last had the focus, for the way back from the question. */
  lastFocusRef: MutableRefObject<HTMLElement | null>;
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

/** Why `onOpenChange` closes: `action` when an `Action` or the footer's Confirm took the outcome. */
export type ActionDialogOpenChangeDetails = { reason: 'action' };

export type ActionDialogRootContextValue = {
  /** Set by an action that closes, read by the close it causes. */
  actionCloseRef: MutableRefObject<boolean>;
};

const ActionDialogRootContext = createContext<ActionDialogRootContextValue | undefined>(undefined);

export const ActionDialogRootProvider = ActionDialogRootContext.Provider;

export const useActionDialogRoot = (): ActionDialogRootContextValue | undefined =>
  useContext(ActionDialogRootContext);
