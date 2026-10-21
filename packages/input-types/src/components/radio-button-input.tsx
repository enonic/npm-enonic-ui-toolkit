import { RadioGroup } from '@enonic/ui';
import type { ReactElement } from 'react';

import { ValueTypes } from '../data';
import type { RadioButtonConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getFirstError } from '../utils/validation';
import { InputLabel } from './input-label';

const RADIO_BUTTON_INPUT_NAME = 'RadioButtonInput';

export type RadioButtonInputProps = InputTypeComponentProps<RadioButtonConfig>;

export const RadioButtonInput = ({
  value,
  onChange,
  onBlur,
  onFocus,
  config,
  input,
  enabled,
  index,
  errors,
  readOnly = false,
  processing = false,
  inputRef,
}: RadioButtonInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  const stringValue = value.isNull() ? '' : (value.getString() ?? '');
  const primaryValue = stringValue || config.options[0]?.value;

  const editable = !readOnly && !processing;

  const handleValueChange = (newValue: string): void => {
    if (!editable) return;
    onChange(ValueTypes.STRING.newValue(newValue));
  };

  return (
    <div data-component={RADIO_BUTTON_INPUT_NAME}>
      <InputLabel input={input} />
      <RadioGroup
        name={`${input.getName()}-${index}`}
        value={stringValue}
        onValueChange={handleValueChange}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-readonly={!editable || undefined}
        error={errors.length > 0}
        errorMessage={getFirstError(errors, t)}
      >
        {config.options.map((option) => (
          <RadioGroup.Item
            key={option.value}
            ref={option.value === primaryValue ? inputRef : undefined}
            data-mobile-focus-target={option.value === primaryValue || undefined}
            value={option.value}
            disabled={!enabled}
          >
            <RadioGroup.Indicator />
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup>
    </div>
  );
};
RadioButtonInput.displayName = RADIO_BUTTON_INPUT_NAME;
