import { Checkbox } from '@enonic/ui';
import type { ReactElement } from 'react';

import { ValueTypes } from '../data';
import type { Alignment, CheckboxConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getFirstError } from '../utils/validation';

const CHECKBOX_INPUT_NAME = 'CheckboxInput';

const ALIGNMENT_CLASSES: Record<Alignment, string | undefined> = {
  LEFT: undefined,
  RIGHT: 'flex-row-reverse justify-end',
  TOP: 'flex-col items-start',
  BOTTOM: 'flex-col-reverse items-start',
};

export type CheckboxInputProps = InputTypeComponentProps<CheckboxConfig>;

export const CheckboxInput = ({
  value,
  onChange,
  config,
  input,
  enabled,
  errors,
  inputRef,
}: CheckboxInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  const isChecked = value.isNull() ? false : (value.getBoolean() ?? false);
  // An unchecked required checkbox is an absent value, so the occurrence check fails it.
  const isRequired = input.getOccurrences().getMinimum() > 0;

  const handleCheckedChange = (checked: boolean | 'indeterminate'): void => {
    if (checked === true) {
      onChange(ValueTypes.BOOLEAN.fromJsonValue(true));
    } else {
      onChange(
        isRequired ? ValueTypes.BOOLEAN.newNullValue() : ValueTypes.BOOLEAN.fromJsonValue(false),
      );
    }
  };

  return (
    <div data-component={CHECKBOX_INPUT_NAME}>
      <Checkbox
        ref={inputRef}
        data-mobile-focus-target
        checked={isChecked}
        label={input.getLabel()}
        className={ALIGNMENT_CLASSES[config.alignment]}
        disabled={!enabled}
        error={errors.length > 0}
        errorMessage={getFirstError(errors, t)}
        onCheckedChange={handleCheckedChange}
      />
    </div>
  );
};
CheckboxInput.displayName = CHECKBOX_INPUT_NAME;
