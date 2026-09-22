import { Button, cn } from '@enonic/ui';
import { type ReactElement, useCallback } from 'react';

import { FieldError } from '../components/field-error';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { Occurrences } from '../schema';

const SET_HEADER_NAME = 'SetHeader';

export type SetHeaderProps = {
  label: string;
  occurrences: Occurrences;
  isAllExpanded: boolean;
  showToggle: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  description?: string;
  occurrenceError?: string;
};

export const SetHeader = ({
  label,
  description,
  isAllExpanded,
  showToggle,
  onExpandAll,
  onCollapseAll,
  occurrences,
  occurrenceError,
}: SetHeaderProps): ReactElement => {
  const t = useInputTypesPhrases();
  const isRequired = occurrences.getMinimum() > 0;
  const toggleLabel = isAllExpanded
    ? t('enonic.inputTypes.set.collapseAll')
    : t('enonic.inputTypes.set.expandAll');

  const handleToggle = useCallback(() => {
    if (isAllExpanded) {
      onCollapseAll();
    } else {
      onExpandAll();
    }
  }, [isAllExpanded, onCollapseAll, onExpandAll]);

  return (
    <div className="flex flex-col gap-1" data-component={SET_HEADER_NAME}>
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-semibold">{label}</span>
          {isRequired && <span className="text-sm text-destructive">*</span>}
        </div>
        {showToggle && (
          <Button
            size="sm"
            className={cn('-my-1 h-8 px-1.5 focus-visible:ring-offset-0')}
            onClick={handleToggle}
          >
            {toggleLabel}
          </Button>
        )}
      </div>
      {description && <span className="text-sm text-subtle">{description}</span>}
      {occurrenceError && <FieldError message={occurrenceError} />}
    </div>
  );
};
SetHeader.displayName = SET_HEADER_NAME;
