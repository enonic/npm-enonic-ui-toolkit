import { useEffect, useState } from 'react';

import type { ActionDialogOpenChangeDetails } from './action-dialog-context';

export type CloseGuardOptions = {
  /** Whether closing would lose something. */
  dirty: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type CloseGuard = {
  /** Whether the question is being asked. */
  asking: boolean;
  /**
   * For `ActionDialog.Root`: lets an open through, and a close an action took; asks before any
   * other close that would lose something.
   */
  onOpenChange: (open: boolean, details?: ActionDialogOpenChangeDetails) => void;
  /** Asks, or closes when there is nothing to lose — a Cancel button. */
  requestClose: () => void;
  /** The way back: the question goes, and the footer returns the focus to the control it left. */
  keep: () => void;
  /** Closes, losing what there was. */
  discard: () => void;
};

/**
 * The dirty-close question of a dialog: `Escape`, the mask, the close button and Cancel all come
 * through `onOpenChange(false)`, and a dialog with unsaved edits asks before it closes. A close
 * from the footer's Confirm or an `Action` is the outcome itself and goes through unasked — its
 * click runs before the render that would clear `dirty`. The footer renders the question; this
 * decides when it is asked.
 */
export function useCloseGuard({ dirty, open, onOpenChange }: CloseGuardOptions): CloseGuard {
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!open) {
      setAsking(false);
    }
  }, [open]);

  const requestClose = (): void => {
    if (dirty) {
      setAsking(true);
    } else {
      onOpenChange(false);
    }
  };
  const keep = (): void => setAsking(false);
  const discard = (): void => {
    setAsking(false);
    onOpenChange(false);
  };

  return {
    asking,
    requestClose,
    keep,
    discard,
    onOpenChange: (next, details) => {
      if (next) {
        onOpenChange(true);
      } else if (details?.reason === 'action') {
        discard();
      } else if (asking) {
        keep();
      } else {
        requestClose();
      }
    },
  };
}
