import { cn, Input, useBlinkAttention } from '@enonic/ui';
import { type ChangeEvent, type ReactElement, useEffect, useRef } from 'react';

import { useLocale } from '../context/locale';
import { type Value, ValueTypes } from '../data';
import type { TextLineConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName, handleMobileCompletionKeyDown } from '../utils/accessibility';
import { displayValue } from '../utils/display-value';
import { getLangAttributes } from '../utils/lang-attributes';
import { getFirstError } from '../utils/validation';
import { Counter } from './counter';

const TEXT_LINE_INPUT_NAME = 'TextLineInput';

export type TextLineInputProps = InputTypeComponentProps<TextLineConfig>;

function valueToString(value: Value): string {
  return value.getString() ?? '';
}

export const TextLineInput = ({
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
  inputRef: externalInputRef,
}: TextLineInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The field scrolls the occurrence into view itself; the blink only highlights.
  const isBlinking = useBlinkAttention(inputRef, highlight, { scrollIntoView: false });
  const langAttrs = getLangAttributes(useLocale());
  const maxLength = config.maxLength > 0 ? config.maxLength : undefined;
  const effectiveReadOnly = readOnly || processing;

  useEffect(() => {
    if (externalInputRef == null) return undefined;
    externalInputRef(inputRef.current);
    return () => externalInputRef(null);
  }, [externalInputRef]);

  const display = displayValue(value, rawValue, valueToString);

  const counterAddon = config.showCounter ? (
    <div
      className={cn(
        'flex items-center self-stretch pr-3 pl-2',
        effectiveReadOnly ? 'bg-surface-primary' : 'bg-surface-neutral',
      )}
    >
      <Counter length={display.length} maxLength={maxLength} />
    </div>
  ) : undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const inputValue = event.currentTarget.value;
    onChange(ValueTypes.STRING.newValue(inputValue), inputValue);
  };

  return (
    <Input
      ref={inputRef}
      data-mobile-focus-target
      {...langAttrs}
      aria-label={getInputAccessibleName(input, index)}
      value={display}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
      enterKeyHint={onMobileComplete ? 'next' : undefined}
      onKeyDown={
        onMobileComplete
          ? (event) => handleMobileCompletionKeyDown(event, onMobileComplete)
          : undefined
      }
      disabled={!enabled}
      readOnly={readOnly}
      processing={processing}
      tabIndex={processing ? -1 : undefined}
      highlight={isBlinking}
      error={getFirstError(errors, t)}
      endAddon={counterAddon}
    />
  );
};
TextLineInput.displayName = TEXT_LINE_INPUT_NAME;
