import { Button, Input, TimePicker } from '@enonic/ui';
import { formatTime, pad } from '@enonic/ui-utils';
import { type ChangeEvent, type ReactElement, useCallback, useRef, useState } from 'react';

import { type Value, ValueTypes } from '../data';
import { TIME_PATTERN } from '../descriptor/date-descriptors';
import type { TimeConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName, handleMobileCompletionKeyDown } from '../utils/accessibility';
import { displayValue } from '../utils/display-value';
import { getFirstError } from '../utils/validation';

const TIME_INPUT_NAME = 'TimeInput';

export type TimeInputProps = InputTypeComponentProps<TimeConfig>;

function valueToString(value: Value): string {
  return value.getString() ?? '';
}

function formatTimeFromDate(date: Date): string {
  return formatTime(date.getHours(), date.getMinutes());
}

/** `HH:MM` for the picker, or `null` — its own idea of no value — when the text is not a time. */
export function parseTimeToPickerValue(raw: string): string | null {
  if (!raw) return null;
  const parts = raw.split(':');
  const hour = Number.parseInt(parts[0] ?? '', 10);
  const minute = Number.parseInt(parts[1] ?? '', 10);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

export const TimeInput = ({
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
  inputRef: externalInputRef,
}: TimeInputProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const t = useInputTypesPhrases();
  const setInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      inputRef.current = element;
      externalInputRef?.(element);
    },
    [externalInputRef],
  );

  const display = displayValue(value, rawValue, valueToString);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const inputValue = event.currentTarget.value;
    if (inputValue === '') {
      onChange(ValueTypes.LOCAL_TIME.newNullValue());
    } else {
      onChange(ValueTypes.LOCAL_TIME.newValue(inputValue), inputValue);
    }
  };

  const handleConfirm = (): void => {
    if (draftTime == null) return;
    onChange(ValueTypes.LOCAL_TIME.newValue(draftTime), draftTime);
    setOpen(false);
    if (onMobileComplete != null && inputRef.current != null) {
      onMobileComplete(inputRef.current);
    } else {
      inputRef.current?.focus();
    }
  };

  const handleSetDefault = (): void => {
    if (config.default == null) return;
    setDraftTime(formatTimeFromDate(config.default));
  };

  const pickerValue = TIME_PATTERN.test(display) ? parseTimeToPickerValue(display) : null;

  return (
    <TimePicker
      value={open ? draftTime : pickerValue}
      onValueChange={setDraftTime}
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) setDraftTime(pickerValue);
        setOpen(isOpen);
      }}
    >
      <div data-component={TIME_INPUT_NAME} ref={inputWrapperRef}>
        <Input
          ref={setInputRef}
          data-mobile-focus-target
          aria-label={getInputAccessibleName(input, index)}
          type="text"
          placeholder={t('enonic.inputTypes.field.timePlaceholder')}
          value={display}
          onChange={handleInputChange}
          onBlur={onBlur}
          enterKeyHint={onMobileComplete ? 'next' : undefined}
          onKeyDown={
            onMobileComplete
              ? (event) => handleMobileCompletionKeyDown(event, onMobileComplete)
              : undefined
          }
          disabled={!enabled}
          error={getFirstError(errors, t)}
          endAddon={
            <div className="flex h-full w-11 items-center justify-center bg-transparent">
              <TimePicker.Trigger
                className="size-8 bg-transparent"
                disabled={!enabled}
                aria-label={t('enonic.inputTypes.field.timeTrigger')}
              />
            </div>
          }
        />
      </div>
      <TimePicker.Content className="z-1 flex-col" anchorRef={inputWrapperRef} align="end">
        <div className="flex items-center gap-2">
          <TimePicker.HourSelect className="w-20" />
          <span className="font-bold text-lg text-main">:</span>
          <TimePicker.MinuteSelect className="w-20" />
        </div>
        <div className="w-full border-bdr-soft border-t pt-3">
          <div className="flex items-center gap-3">
            {config.default != null && (
              <Button variant="solid" size="sm" onClick={handleSetDefault}>
                {t('enonic.inputTypes.action.setDefault')}
              </Button>
            )}
            <Button
              className="ml-auto"
              variant="solid"
              size="sm"
              onClick={handleConfirm}
              disabled={draftTime == null}
            >
              {t('enonic.inputTypes.action.ok')}
            </Button>
          </div>
        </div>
      </TimePicker.Content>
    </TimePicker>
  );
};
TimeInput.displayName = TIME_INPUT_NAME;
