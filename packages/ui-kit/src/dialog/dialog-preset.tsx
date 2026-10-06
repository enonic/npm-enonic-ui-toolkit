import type { ReactElement, ReactNode } from 'react';

import { ActionDialog, type DialogIntent, type DialogSize } from './action-dialog';

export type DialogPresetConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  question?: ReactNode;
  intent?: DialogIntent;
  size?: DialogSize;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Cancel, `Escape`, the mask and the close button alike. */
  onCancel?: () => void;
  /** Why the dialog is still open after a confirm that did not close it. */
  error?: string;
  /** Off for a caller that closes after its own work, or reports an `error` instead. */
  closeOnConfirm?: boolean;
  children?: ReactNode;
  'data-component'?: string;
};

const CONFIRM_NAME = 'DialogPreset.Confirm';

/** The plain question: a title, the question, and the two answers with equal weight. */
const DialogPresetConfirm = ({
  open,
  onOpenChange,
  title,
  description,
  question,
  intent = 'default',
  size = 'default',
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  error,
  closeOnConfirm = true,
  children,
  'data-component': componentName = CONFIRM_NAME,
}: DialogPresetConfirmProps): ReactElement => (
  <ActionDialog.Root
    open={open}
    onOpenChange={(next, details) => {
      if (!next && details === undefined) {
        onCancel?.();
      }
      onOpenChange(next);
    }}
  >
    <ActionDialog.Portal>
      <ActionDialog.Overlay />
      <ActionDialog.Content data-component={componentName} size={size}>
        <ActionDialog.DefaultHeader title={title} description={description} />
        {(question !== undefined || children !== undefined) && (
          <ActionDialog.Body>
            {question !== undefined && <div>{question}</div>}
            {children}
          </ActionDialog.Body>
        )}
        <ActionDialog.Footer
          intent={intent}
          cancelVariant="outline"
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          onConfirm={onConfirm}
          error={error}
          closeOnConfirm={closeOnConfirm}
        />
      </ActionDialog.Content>
    </ActionDialog.Portal>
  </ActionDialog.Root>
);
DialogPresetConfirm.displayName = CONFIRM_NAME;

export const DialogPreset = {
  Confirm: DialogPresetConfirm,
};
