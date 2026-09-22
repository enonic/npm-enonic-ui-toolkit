import { cn, FilledOctagonAlert, IconButton } from '@enonic/ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { resolveValidationMessage, type ValidationMessage } from '../descriptor/validation-result';
import { useInputTypesPhrases } from '../i18n/use-phrases';

export type FieldErrorProps = {
  /** A text that already is one; nothing renders when both this and `error` are absent. */
  message?: string;
  /** A validator's result, resolved through the package's phrases. */
  error?: ValidationMessage;
  /** Renders a dismiss control for an error the user may acknowledge without editing the field. */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
};

export const FieldError = ({
  message,
  error,
  onDismiss,
  dismissLabel,
  className,
}: FieldErrorProps): ReactNode => {
  const t = useInputTypesPhrases();
  const text = message ?? (error === undefined ? undefined : resolveValidationMessage(error, t));
  if (text == null) return null;
  return (
    <div
      data-component="FieldError"
      className={cn('flex items-center gap-2 leading-5 text-error', className)}
    >
      <FilledOctagonAlert size={16} className="shrink-0" />
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
  );
};
FieldError.displayName = 'FieldError';
