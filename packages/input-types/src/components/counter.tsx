import { cn, Tooltip } from '@enonic/ui';
import type { ReactElement } from 'react';

import { useInputTypesPhrases } from '../i18n/use-phrases';

export type CounterProps = {
  length: number;
  maxLength?: number;
  bottom?: boolean;
};

/** `12/40` beside a text input, red once over, with the remainder in a tooltip. */
export const Counter = ({ length, maxLength, bottom }: CounterProps): ReactElement => {
  const t = useInputTypesPhrases();
  const remaining = (maxLength ?? 0) - length;
  const isOverLimit = remaining < 0;
  const tooltip = maxLength
    ? isOverLimit
      ? t('enonic.inputTypes.field.charsOverLimit', -remaining)
      : t('enonic.inputTypes.field.charsRemaining', remaining)
    : undefined;
  return (
    <Tooltip value={tooltip} side={bottom ? 'bottom' : 'top'} delay={300}>
      <span data-component="Counter" className="cursor-default text-sm text-subtle">
        {maxLength ? (
          <span>
            <span className={cn(isOverLimit && 'text-error')}>{length}</span>/{maxLength}
          </span>
        ) : (
          <span>{length}</span>
        )}
      </span>
    </Tooltip>
  );
};
Counter.displayName = 'Counter';
