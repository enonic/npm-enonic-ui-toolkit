import { Input } from '@enonic/ui';
import { type ChangeEvent, type ReactElement, useEffect, useRef, useState } from 'react';

import { type Value, ValueTypes } from '../data';
import type { NumberConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName, handleMobileCompletionKeyDown } from '../utils/accessibility';
import { displayValue } from '../utils/display-value';
import { getFirstError } from '../utils/validation';

const DOUBLE_INPUT_NAME = 'DoubleInput';

export type DoubleInputProps = InputTypeComponentProps<NumberConfig>;

/** The step the browser's spinner should use for a number typed with this many decimals. */
export function getStep(value: string): number {
  const dotIndex = value.indexOf('.');
  const decimalIndex = dotIndex !== -1 ? dotIndex : value.indexOf(',');
  if (decimalIndex === -1) return 1;
  return 10 ** -(value.length - decimalIndex - 1);
}

function valueToString(value: Value): string {
  return String(value.getDouble() ?? '');
}

export const DoubleInput = ({
  value,
  rawValue,
  onChange,
  onBlur,
  onMobileComplete,
  config,
  input,
  enabled,
  index,
  errors,
  inputRef,
}: DoubleInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  const display = displayValue(value, rawValue, valueToString);
  // The step follows the decimals the user typed, but holds through the spinner's own
  // increments, so 0.001 + 0.001 stays at three decimals instead of collapsing to 0.002 → 1.
  const minStep = useRef(getStep(display));
  const prevDisplay = useRef(display);
  const [step, setStep] = useState(minStep.current);

  useEffect(() => {
    const newStep = getStep(display);
    const prevNum = Number.parseFloat(prevDisplay.current);
    const newNum = Number.parseFloat(display);
    const isStepping =
      !Number.isNaN(prevNum) &&
      !Number.isNaN(newNum) &&
      Math.abs(Math.abs(newNum - prevNum) - minStep.current) < minStep.current * 1e-4;

    minStep.current = isStepping ? Math.min(minStep.current, newStep) : newStep;
    prevDisplay.current = display;
    setStep(minStep.current);
  }, [display]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const inputValue = event.currentTarget.value;
    if (inputValue === '') {
      onChange(ValueTypes.DOUBLE.newNullValue());
    } else {
      onChange(ValueTypes.DOUBLE.newValue(inputValue), inputValue);
    }
  };

  return (
    <Input
      ref={inputRef}
      data-component={DOUBLE_INPUT_NAME}
      data-mobile-focus-target
      aria-label={getInputAccessibleName(input, index)}
      type="number"
      step={step}
      value={display}
      onChange={handleChange}
      onBlur={onBlur}
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
DoubleInput.displayName = DOUBLE_INPUT_NAME;
