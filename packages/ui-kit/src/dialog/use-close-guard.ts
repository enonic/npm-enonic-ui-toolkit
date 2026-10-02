import { useEffect, useRef, useState } from 'react';

export type CloseGuardOptions = {
  /** Whether closing would lose something. */
  dirty: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type CloseGuard = {
  /** Whether the question is being asked. */
  asking: boolean;
  /** For the dialog's `Root`: lets an open through, asks before a close that would lose something. */
  onOpenChange: (open: boolean) => void;
  /** Asks, or closes when there is nothing to lose — a Cancel button. */
  requestClose: () => void;
  /** The way back: the question goes, and the focus with it, to the control it left. */
  keep: () => void;
  /** Closes, losing what there was. */
  discard: () => void;
};

/**
 * The dirty-close question of a dialog: `Escape`, the mask, the close button and Cancel all come
 * through `onOpenChange(false)`, and a dialog with unsaved edits asks before it closes. The
 * footer renders the question; this decides when it is asked.
 */
export function useCloseGuard({ dirty, open, onOpenChange }: CloseGuardOptions): CloseGuard {
  const [asking, setAsking] = useState(false);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      setAsking(false);
    }
  }, [open]);

  // Answered, the focus goes back after the render that shows the control again.
  useEffect(() => {
    if (!asking) {
      returnTo.current?.focus();
      returnTo.current = null;
    }
  }, [asking]);

  const requestClose = (): void => {
    if (!dirty) {
      onOpenChange(false);
      return;
    }
    // ! Read here, in the event, before the render that hides the control: by the time an effect
    // ! runs the browser has already moved the focus to the body.
    const active = document.activeElement;
    returnTo.current = active instanceof HTMLElement ? active : null;
    setAsking(true);
  };
  const keep = (): void => setAsking(false);
  const discard = (): void => {
    returnTo.current = null;
    setAsking(false);
    onOpenChange(false);
  };

  return {
    asking,
    requestClose,
    keep,
    discard,
    onOpenChange: (next) => {
      if (next) {
        onOpenChange(true);
      } else if (asking) {
        keep();
      } else {
        requestClose();
      }
    },
  };
}
