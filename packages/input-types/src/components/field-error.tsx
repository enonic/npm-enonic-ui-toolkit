import { cn, FilledOctagonAlert, IconButton } from '@enonic/ui';
import { X } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ReactNode, useEffect, useRef } from 'react';

import { resolveValidationMessage, type ValidationMessage } from '../descriptor/validation-result';
import { useInputTypesPhrases } from '../i18n/use-phrases';

export type FieldErrorProps = {
  /** Already resolved text; nothing visible renders when both this and `error` are absent. */
  message?: string;
  /** A validator's result, resolved through the package's phrases. */
  error?: ValidationMessage;
  /** Announces by default. Disable when the control or a parent owns error announcements. */
  announce?: boolean;
  /** Renders a dismiss control for an error the user may acknowledge without editing the field. */
  onDismiss?: () => void;
  dismissLabel?: string;
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>;

const IDLE_ANNOUNCEMENT = '\u00a0';

export const FieldError = ({
  message,
  error,
  announce = true,
  onDismiss,
  dismissLabel,
  className,
  ...props
}: FieldErrorProps): ReactNode => {
  const t = useInputTypesPhrases();
  const text = message ?? (error === undefined ? undefined : resolveValidationMessage(error, t));
  const regionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    // VoiceOver can suppress repeated errors if the idle region is empty.
    region.textContent = IDLE_ANNOUNCEMENT;
    if (!text || !announce) return;

    const timer = setTimeout(() => {
      region.textContent = text;
    }, 500);
    return () => clearTimeout(timer);
  }, [announce, text]);

  return (
    <>
      {text != null && (
        <div
          data-component="FieldError"
          {...props}
          className={cn('flex items-center gap-2 leading-5 text-error', className)}
        >
          <FilledOctagonAlert size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1">{text}</span>
          {onDismiss != null && (
            <IconButton
              icon={X}
              iconSize="sm"
              variant="text"
              className="size-5 shrink-0"
              aria-label={dismissLabel ?? t('enonic.inputTypes.field.dismissError')}
              onClick={onDismiss}
            />
          )}
        </div>
      )}
      {announce && (
        <span
          ref={regionRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      )}
    </>
  );
};
FieldError.displayName = 'FieldError';
