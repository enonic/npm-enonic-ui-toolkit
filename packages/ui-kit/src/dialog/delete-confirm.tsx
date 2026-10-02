import { type ReactElement, type ReactNode, type RefObject, useEffect, useRef } from 'react';

import { useUiKitPhrases } from '../i18n/use-phrases';
import { ActionDialog, type DialogSize } from './action-dialog';
import { useActionDialog } from './action-dialog-context';
import { deleteExpectation, type DeleteTarget } from './delete-expectation';
import { Gate } from './gate';

export type DeleteConfirmProps = {
  title: string;
  /** The question, already worded for one target or many; the targets are listed under it. */
  question: ReactNode;
  targets: readonly DeleteTarget[];
  /**
   * What is typed back before the button enables: `deleteExpectation(targets)` by default, the
   * one name or the count. `null` asks for nothing, and the button is enabled from the start.
   */
  expected?: string | number | null;
  /** Defaults to the kit's "Delete". */
  confirmLabel?: string;
  size?: DialogSize;
  onConfirm: () => void;
  onCancel?: () => void;
  /** Off for a caller that moves on to a progress view instead of closing. */
  closeOnConfirm?: boolean;
  /** Off for a caller whose Cancel goes back to the view before — a list the delete was picked from. */
  closeOnCancel?: boolean;
  'data-component'?: string;
};

const DELETE_CONFIRM_NAME = 'DeleteConfirm';

/**
 * The delete view: the question, the targets, the gate, and a red button that enables once the
 * name or the count is typed back. A `Content` — the first view of a dialog opened from a
 * screen, or the view after a list.
 */
const DeleteConfirm = ({
  title,
  question,
  targets,
  expected = deleteExpectation(targets),
  confirmLabel,
  size = 'medium',
  onConfirm,
  onCancel,
  closeOnConfirm = true,
  closeOnCancel = true,
  'data-component': componentName = DELETE_CONFIRM_NAME,
}: DeleteConfirmProps): ReactElement => {
  const gateInputRef = useRef<HTMLInputElement>(null);

  return (
    <ActionDialog.Content
      data-component={componentName}
      size={size}
      defaultConfirmEnabled={expected === null}
      onOpenAutoFocus={(event) => {
        if (expected !== null) {
          event.preventDefault();
          gateInputRef.current?.focus();
        }
      }}
    >
      <DeleteConfirmParts
        title={title}
        question={question}
        targets={targets}
        expected={expected}
        confirmLabel={confirmLabel}
        gateInputRef={gateInputRef}
        onConfirm={onConfirm}
        onCancel={onCancel}
        closeOnConfirm={closeOnConfirm}
        closeOnCancel={closeOnCancel}
      />
    </ActionDialog.Content>
  );
};
DeleteConfirm.displayName = DELETE_CONFIRM_NAME;

type DeleteConfirmPartsProps = Required<
  Pick<DeleteConfirmProps, 'expected' | 'closeOnConfirm' | 'closeOnCancel'>
> &
  Pick<
    DeleteConfirmProps,
    'title' | 'question' | 'targets' | 'confirmLabel' | 'onConfirm' | 'onCancel'
  > & {
    gateInputRef: RefObject<HTMLInputElement>;
  };

// Inside `Content`, where the confirm state is: a match moves the focus onto the button, so Enter confirms.
const DeleteConfirmParts = ({
  title,
  question,
  targets,
  expected,
  confirmLabel,
  gateInputRef,
  onConfirm,
  onCancel,
  closeOnConfirm,
  closeOnCancel,
}: DeleteConfirmPartsProps): ReactElement => {
  const t = useUiKitPhrases();
  const { confirmEnabled, setConfirmEnabled } = useActionDialog();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // With no gate asked for, nothing else enables the button — including after a gate went away.
  useEffect(() => {
    if (expected === null) {
      setConfirmEnabled(true);
    }
  }, [expected, setConfirmEnabled]);

  useEffect(() => {
    if (expected !== null && confirmEnabled) {
      confirmRef.current?.focus();
    }
  }, [expected, confirmEnabled]);

  return (
    <>
      <ActionDialog.DefaultHeader title={title} />
      <ActionDialog.Body>
        <div className="flex flex-col gap-2.5">
          <div>{question}</div>
          {targets.length > 0 && (
            <ul className="flex flex-col gap-2.5 py-1.5">
              {targets.map(({ key, label }) => (
                <li key={key}>{label}</li>
              ))}
            </ul>
          )}
        </div>
        {expected !== null && (
          <Gate>
            <Gate.Hint value={expected} />
            <Gate.Input ref={gateInputRef} expected={expected} />
          </Gate>
        )}
      </ActionDialog.Body>
      <ActionDialog.Footer
        intent="danger"
        cancelVariant="outline"
        confirmLabel={confirmLabel ?? t('enonic.uiKit.dialog.delete')}
        confirmRef={confirmRef}
        onConfirm={onConfirm}
        onCancel={onCancel}
        closeOnConfirm={closeOnConfirm}
        closeOnCancel={closeOnCancel}
      />
    </>
  );
};
DeleteConfirmParts.displayName = 'DeleteConfirm.Parts';

export { DeleteConfirm };
