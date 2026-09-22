import { cn, TextArea, useBlinkAttention } from '@enonic/ui';
import { type ChangeEvent, type ReactElement, useEffect, useRef } from 'react';

import { useLocale } from '../context/locale';
import { type Value, ValueTypes } from '../data';
import type { TextAreaConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName } from '../utils/accessibility';
import { displayValue } from '../utils/display-value';
import { getLangAttributes } from '../utils/lang-attributes';
import { getFirstError } from '../utils/validation';
import { Counter } from './counter';

const TEXT_AREA_INPUT_NAME = 'TextAreaInput';

export type TextAreaInputProps = InputTypeComponentProps<TextAreaConfig>;

function valueToString(value: Value): string {
  return value.getString() ?? '';
}

export const TextAreaInput = ({
  value,
  rawValue,
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
  highlight,
  inputRef: externalInputRef,
}: TextAreaInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const isBlinking = useBlinkAttention(textAreaRef, highlight, { scrollIntoView: false });
  const langAttrs = getLangAttributes(useLocale());

  useEffect(() => {
    if (externalInputRef == null) return undefined;
    externalInputRef(textAreaRef.current);
    return () => externalInputRef(null);
  }, [externalInputRef]);

  const stringValue = displayValue(value, rawValue, valueToString);
  const maxLength = config.maxLength > 0 ? config.maxLength : undefined;
  const effectiveReadOnly = readOnly || processing;

  const counterAddon = config.showCounter ? (
    <div
      className={cn(
        'absolute right-0 bottom-0 items-center',
        effectiveReadOnly ? 'bg-transparent' : 'bg-surface-primary/50',
        'text-sm tabular-nums',
        'rounded-tl-sm rounded-br-sm px-1.5 py-0.5',
      )}
    >
      <Counter length={stringValue.length} maxLength={maxLength} bottom />
    </div>
  ) : undefined;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const inputValue = event.currentTarget.value;
    onChange(ValueTypes.STRING.newValue(inputValue), inputValue);
  };

  return (
    <TextArea
      ref={textAreaRef}
      data-mobile-focus-target
      {...langAttrs}
      aria-label={getInputAccessibleName(input, index)}
      autoSize
      value={stringValue}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
      disabled={!enabled}
      readOnly={readOnly}
      processing={processing}
      tabIndex={processing ? -1 : undefined}
      highlight={isBlinking}
      error={getFirstError(errors, t)}
      endAddon={counterAddon}
      className="min-w-0"
    />
  );
};
TextAreaInput.displayName = TEXT_AREA_INPUT_NAME;
