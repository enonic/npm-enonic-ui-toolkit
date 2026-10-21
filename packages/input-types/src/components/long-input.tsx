import { Input, useBlinkAttention } from '@enonic/ui';
import { type ChangeEvent, type ReactElement, useRef } from 'react';

import { type Value, ValueTypes } from '../data';
import type { NumberConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName, handleMobileCompletionKeyDown } from '../utils/accessibility';
import { displayValue } from '../utils/display-value';
import { getFirstError } from '../utils/validation';

const LONG_INPUT_NAME = 'LongInput';

export type LongInputProps = InputTypeComponentProps<NumberConfig>;

function valueToString(value: Value): string {
  return String(value.getLong() ?? '');
}

export const LongInput = ({
  value,
  rawValue,
  onChange,
  onBlur,
  onFocus,
  onMobileComplete,
  config,
  input,
  enabled,
  index,
  errors,
  readOnly = false,
  processing = false,
  highlight,
  inputRef,
}: LongInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  const highlightRef = useRef<HTMLDivElement>(null);
  const isBlinking = useBlinkAttention(highlightRef, highlight, { scrollIntoView: false });
  const display = displayValue(value, rawValue, valueToString);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const inputValue = event.currentTarget.value;
    if (inputValue === '') {
      onChange(ValueTypes.LONG.newNullValue());
    } else {
      onChange(ValueTypes.LONG.newValue(inputValue), inputValue);
    }
  };

  return (
    <Input
      ref={inputRef}
      data-component={LONG_INPUT_NAME}
      data-mobile-focus-target
      aria-label={getInputAccessibleName(input, index)}
      type="number"
      step={1}
      value={display}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
      readOnly={readOnly}
      processing={processing}
      tabIndex={processing ? -1 : undefined}
      highlight={isBlinking}
      highlightRef={highlightRef}
      enterKeyHint={onMobileComplete ? 'next' : undefined}
      onKeyDown={
        onMobileComplete
          ? (event) => handleMobileCompletionKeyDown(event, onMobileComplete)
          : undefined
      }
      disabled={!enabled}
      error={getFirstError(errors, t)}
      min={config.min}
      max={config.max}
    />
  );
};
LongInput.displayName = LONG_INPUT_NAME;
