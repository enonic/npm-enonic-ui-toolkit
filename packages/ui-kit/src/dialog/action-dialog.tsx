import {
  Button,
  type ButtonVariant,
  cn,
  Dialog,
  type DialogRootProps,
  usePrefixedId,
} from '@enonic/ui';
import { TriangleAlert } from 'lucide-react';
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useUiKitPhrases } from '../i18n/use-phrases';
import {
  type ActionDialogContextValue,
  type ActionDialogOpenChangeDetails,
  ActionDialogProvider,
  ActionDialogRootProvider,
  useActionDialog,
  useActionDialogRoot,
} from './action-dialog-context';

export type DialogIntent = 'default' | 'danger';

/** A question needs no more room than its own text; `medium` carries a control, `wide` a form. */
export type DialogSize = 'default' | 'medium' | 'wide';

const SIZES: Record<DialogSize, string> = {
  default: 'max-w-lg',
  medium: 'max-w-180 sm:min-w-152',
  wide: 'max-w-4xl',
};

const DANGER_BUTTON_CLASS_NAME =
  'bg-btn-error text-alt hover:bg-btn-error-hover active:bg-btn-error-active focus-visible:ring-error/50';

//
// * Root
//

export type ActionDialogRootProps = Omit<DialogRootProps, 'onOpenChange'> & {
  /** `details` tells a close an action took from one that would leave without it. */
  onOpenChange?: (open: boolean, details?: ActionDialogOpenChangeDetails) => void;
};

const ActionDialogRoot = ({ onOpenChange, ...props }: ActionDialogRootProps): ReactElement => {
  const actionCloseRef = useRef(false);
  const value = useMemo(() => ({ actionCloseRef }), []);

  return (
    <ActionDialogRootProvider value={value}>
      <Dialog.Root
        {...props}
        onOpenChange={(open) => {
          const byAction = actionCloseRef.current;
          actionCloseRef.current = false;
          onOpenChange?.(open, !open && byAction ? { reason: 'action' } : undefined);
        }}
      />
    </ActionDialogRootProvider>
  );
};
ActionDialogRoot.displayName = 'ActionDialog.Root';

//
// * Content
//

export type ActionDialogContentProps = {
  size?: DialogSize;
  /** Whether the action starts enabled; a content with a gate starts it disabled. */
  defaultConfirmEnabled?: boolean;
} & ComponentPropsWithoutRef<typeof Dialog.Content>;

const CONTENT_NAME = 'ActionDialog.Content';
const QUESTION_NAME = 'ActionDialog.Question';

const ActionDialogContent = forwardRef<HTMLDivElement, ActionDialogContentProps>(
  (
    {
      size = 'default',
      defaultConfirmEnabled = true,
      className,
      children,
      onEscapeKeyDown,
      onFocusCapture,
      ...props
    },
    ref,
  ): ReactElement => {
    const [confirmEnabled, setConfirmEnabled] = useState(defaultConfirmEnabled);
    const [asking, setAsking] = useState(false);
    const keepRef = useRef<(() => void) | undefined>(undefined);
    const lastFocusRef = useRef<HTMLElement | null>(null);
    const wasAskingRef = useRef(false);

    const context = useMemo<ActionDialogContextValue>(
      () => ({ confirmEnabled, setConfirmEnabled, asking, setAsking, keepRef, lastFocusRef }),
      [confirmEnabled, asking],
    );

    // Answered, the focus goes back to the control the question left. The last focus, not the active
    // element: a mask click has already blurred the field to the body.
    useLayoutEffect(() => {
      const target = lastFocusRef.current;
      const answered = wasAskingRef.current && !asking;
      wasAskingRef.current = asking;
      if (!answered || target === null) {
        return;
      }
      // ! A frame later: under Preact the body reads `asking` through context and lifts its `inert`
      // ! in a render after this one, and an inert field takes no focus.
      const frame = requestAnimationFrame(() => target.focus());
      return () => cancelAnimationFrame(frame);
    }, [asking]);

    return (
      <Dialog.Content
        ref={ref}
        data-component={CONTENT_NAME}
        className={cn('gap-5 p-5 md:p-7.5', SIZES[size], className)}
        onFocusCapture={(event) => {
          onFocusCapture?.(event);
          if (
            event.target instanceof HTMLElement &&
            event.target.closest(`[data-component="${QUESTION_NAME}"]`) === null
          ) {
            lastFocusRef.current = event.target;
          }
        }}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event);
          // While the footer asks its question, `Escape` is the way back, not the way out.
          if (asking && !event.defaultPrevented) {
            event.preventDefault();
            keepRef.current?.();
          }
        }}
        {...props}
      >
        <ActionDialogProvider value={context}>{children}</ActionDialogProvider>
      </Dialog.Content>
    );
  },
);
ActionDialogContent.displayName = CONTENT_NAME;

//
// * Body
//

export type ActionDialogBodyProps = ComponentPropsWithoutRef<typeof Dialog.Body>;

const BODY_NAME = 'ActionDialog.Body';

const ActionDialogBody = forwardRef<HTMLDivElement, ActionDialogBodyProps>(
  ({ className, ...props }, ref): ReactElement => {
    const { asking } = useActionDialog();

    return (
      <Dialog.Body
        ref={ref}
        data-component={BODY_NAME}
        className={cn(
          '-mx-2 flex flex-col gap-7 px-2 py-1 transition-opacity',
          asking && 'opacity-50',
          className,
        )}
        {...props}
        // ! `inert`, not a disabled overlay: the form stays in sight but takes no click, no focus.
        inert={asking || props.inert}
      />
    );
  },
);
ActionDialogBody.displayName = BODY_NAME;

//
// * Action — a button that takes the dialog's outcome
//

export type ActionDialogActionProps = {
  label: string;
  /** `danger` paints the button red, for an action there is no undoing. */
  intent?: DialogIntent;
  /** Enabled while the content allows the action — a gate matched, a form valid — unless disabled outright. */
  disabled?: boolean;
  /** Close the dialog on click; off for a caller that moves on to a progress view instead. */
  closeOnClick?: boolean;
  variant?: ButtonVariant;
} & Omit<ComponentPropsWithoutRef<typeof Button>, 'label' | 'variant' | 'disabled'>;

const ACTION_NAME = 'ActionDialog.Action';

/** An action of the footer: enabled by the content, red for a destructive one. */
const ActionDialogAction = forwardRef<HTMLButtonElement, ActionDialogActionProps>(
  (
    {
      label,
      intent = 'default',
      disabled = false,
      closeOnClick = true,
      variant = 'solid',
      className,
      onClick,
      ...props
    },
    ref,
  ): ReactElement => {
    const { confirmEnabled } = useActionDialog();
    const root = useActionDialogRoot();
    const button = (
      <Button
        ref={ref}
        data-component={ACTION_NAME}
        variant={variant}
        size="lg"
        label={label}
        disabled={disabled || !confirmEnabled}
        className={cn(intent === 'danger' && DANGER_BUTTON_CLASS_NAME, className)}
        onClick={(event) => {
          onClick?.(event);
          // ! Runs before `Dialog.Close` closes: the close guard reads this to let the action through.
          if (closeOnClick && root !== undefined && !event.defaultPrevented) {
            root.actionCloseRef.current = true;
          }
        }}
        {...props}
      />
    );

    return closeOnClick ? <Dialog.Close asChild>{button}</Dialog.Close> : button;
  },
);
ActionDialogAction.displayName = ACTION_NAME;

//
// * Footer
//

/** A question the footer asks in place of its controls. */
export type FooterQuestion = {
  text: ReactNode;
  intent?: DialogIntent;
  /** Defaults to the kit's "Confirm". */
  confirmLabel?: string;
  /** The way back; defaults to the kit's "Keep editing". */
  keepLabel?: string;
  onConfirm: () => void;
  onKeep: () => void;
};

export type ActionDialogFooterProps = {
  /** Given `onConfirm`, the footer renders Cancel and Confirm; without it, its children are the controls. */
  onConfirm?: () => void;
  onCancel?: () => void;
  /** Defaults to the kit's "Confirm". */
  confirmLabel?: string;
  /** Defaults to the kit's "Cancel". */
  cancelLabel?: string;
  /** `danger` paints the confirm button red, for an action there is no undoing. */
  intent?: DialogIntent;
  /** Why the dialog is still open, shown beside its controls — a rejected save is the case. */
  error?: string;
  /** For a caller that moves the focus onto the confirm button once it means something. */
  confirmRef?: Ref<HTMLButtonElement>;
  /** `outline` gives the two answers of a question equal weight; a form's Cancel stays quiet. */
  cancelVariant?: ButtonVariant;
  /** Close the dialog on Cancel; off for a caller that closes it itself. */
  closeOnCancel?: boolean;
  /** Close the dialog on Confirm; off for a caller that moves on to a progress view instead. */
  closeOnConfirm?: boolean;
  /**
   * While set, the footer asks this instead of showing its controls: the body goes inert, `Escape`
   * is `onKeep`, and the focus goes to the way back. `useCloseGuard` is the usual source.
   */
  question?: FooterQuestion;
} & ComponentPropsWithoutRef<typeof Dialog.Footer>;

const FOOTER_NAME = 'ActionDialog.Footer';

/**
 * The footer: Cancel and Confirm, or the controls it is given. While it asks a question, every
 * control hides — hidden, not unmounted, so the one the focus returns to is still there.
 */
const ActionDialogFooter = forwardRef<HTMLElement, ActionDialogFooterProps>(
  (
    {
      onConfirm,
      onCancel,
      confirmLabel,
      cancelLabel,
      intent = 'default',
      error,
      confirmRef,
      cancelVariant = 'text',
      closeOnCancel = true,
      closeOnConfirm = true,
      question,
      className,
      children,
      ...props
    },
    ref,
  ): ReactElement => {
    const t = useUiKitPhrases();
    const { setAsking, keepRef } = useActionDialog();
    const asking = question !== undefined;
    const keepButtonRef = useRef<HTMLButtonElement>(null);
    const questionId = usePrefixedId();

    keepRef.current = question?.onKeep;

    useLayoutEffect(() => {
      setAsking(asking);
      return () => setAsking(false);
    }, [asking, setAsking]);

    useEffect(() => {
      if (asking) {
        keepButtonRef.current?.focus();
      }
    }, [asking]);

    const cancel = (
      <Button
        variant={cancelVariant}
        size="lg"
        label={cancelLabel ?? t('enonic.uiKit.dialog.cancel')}
        onClick={onCancel}
      />
    );

    return (
      <Dialog.Footer
        ref={ref}
        data-component={FOOTER_NAME}
        className={cn('items-center', className)}
        {...props}
      >
        {question !== undefined && (
          <div
            data-component={QUESTION_NAME}
            className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-2.5"
          >
            {/* Announced as it appears, and read with either answer the focus lands on. */}
            <div id={questionId} role="alert" className="mr-auto flex items-center gap-2 text-sm">
              <TriangleAlert
                className={cn(
                  'size-4 shrink-0',
                  question.intent === 'danger' ? 'text-error' : 'text-subtle',
                )}
              />
              {question.text}
            </div>
            <div className="flex shrink-0 gap-2.5">
              <Button
                ref={keepButtonRef}
                aria-describedby={questionId}
                variant="outline"
                size="lg"
                label={question.keepLabel ?? t('enonic.uiKit.dialog.keep')}
                onClick={question.onKeep}
              />
              <Button
                aria-describedby={questionId}
                variant="solid"
                size="lg"
                label={question.confirmLabel ?? t('enonic.uiKit.dialog.confirm')}
                className={cn(question.intent === 'danger' && DANGER_BUTTON_CLASS_NAME)}
                onClick={question.onConfirm}
              />
            </div>
          </div>
        )}
        <div className={cn('flex flex-1 items-center justify-end gap-2.5', asking && 'hidden')}>
          {error !== undefined && (
            <p className="text-error mr-auto text-sm" role="alert">
              {error}
            </p>
          )}
          {children}
          {onConfirm !== undefined &&
            (closeOnCancel ? <Dialog.Close asChild>{cancel}</Dialog.Close> : cancel)}
          {onConfirm !== undefined && (
            <ActionDialogAction
              ref={confirmRef}
              label={confirmLabel ?? t('enonic.uiKit.dialog.confirm')}
              intent={intent}
              closeOnClick={closeOnConfirm}
              onClick={onConfirm}
            />
          )}
        </div>
      </Dialog.Footer>
    );
  },
);
ActionDialogFooter.displayName = FOOTER_NAME;

//
// * Compound
//

/**
 * `Dialog` from `@enonic/ui` plus an outcome: a `Content` that holds whether the action may be
 * taken, a `Body` that goes inert while the footer asks a question, a `Footer` that takes the
 * action or asks the question, and `Action` for a further button the content enables. Stacks
 * nothing: a question goes to the footer, content with room of its own is another `Content` under
 * the same `Root`.
 */
export const ActionDialog = {
  ...Dialog,
  Root: ActionDialogRoot,
  Content: ActionDialogContent,
  Body: ActionDialogBody,
  Footer: ActionDialogFooter,
  Action: ActionDialogAction,
};
