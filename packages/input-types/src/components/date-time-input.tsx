import { Button, DatePicker, Input, TimePicker } from '@enonic/ui';
import { formatDate, LocalDateTime, pad } from '@enonic/ui-utils';
import { type ChangeEvent, type ReactElement, useCallback, useMemo, useRef, useState } from 'react';

import { Value, ValueTypes } from '../data';
import { truncateToMinutes } from '../descriptor/date-descriptors';
import type { DateTimeConfig } from '../descriptor/input-type-config';
import { useIsMobile } from '../hooks/use-is-mobile';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName, handleMobileCompletionKeyDown } from '../utils/accessibility';
import { displayValue, parseDisplayDateTime } from '../utils/display-value';
import { getFirstError } from '../utils/validation';

const DATE_TIME_INPUT_NAME = 'DateTimeInput';

export type DateTimeInputProps = InputTypeComponentProps<DateTimeConfig>;

function storageToDisplay(stored: string): string {
  return stored.replace('T', ' ');
}

export function dateTimeValueToDisplay(value: Value): string {
  const str = value.getString();
  return str ? storageToDisplay(truncateToMinutes(str)) : '';
}

/** Rejects an impossible date where `new Date` would roll 2025-06-31 into July. */
export function dateTimeDisplayToValue(display: string): Value {
  const parsed = parseDisplayDateTime(display);
  if (parsed == null) return ValueTypes.LOCAL_DATE_TIME.newNullValue();
  return new Value(LocalDateTime.fromDate(parsed), ValueTypes.LOCAL_DATE_TIME);
}

function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(date: Date, time: string | null): string {
  return `${formatDate(date)} ${time ?? formatClock(date)}`;
}

export const DateTimeInput = ({
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
}: DateTimeInputProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const t = useInputTypesPhrases();
  const isMobile = useIsMobile();
  const setInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      inputRef.current = element;
      externalInputRef?.(element);
    },
    [externalInputRef],
  );

  const display = displayValue(value, rawValue, dateTimeValueToDisplay);

  const selected = useMemo(() => {
    const parsed = parseDisplayDateTime(display);
    if (parsed == null) return { date: null, time: null };
    return {
      date: new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
      time: formatClock(parsed),
    };
  }, [display]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const inputValue = event.currentTarget.value;
    if (inputValue === '') {
      onChange(ValueTypes.LOCAL_DATE_TIME.newNullValue());
    } else {
      onChange(dateTimeDisplayToValue(inputValue), inputValue);
    }
  };

  const handleNativeInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const inputValue = event.currentTarget.value;
    if (inputValue === '') {
      onChange(ValueTypes.LOCAL_DATE_TIME.newNullValue());
    } else {
      const displayValueStr = storageToDisplay(inputValue);
      onChange(dateTimeDisplayToValue(displayValueStr), displayValueStr);
    }
  };

  const handleConfirm = (): void => {
    if (draftDate == null) return;
    const displayValueStr = formatDisplay(draftDate, draftTime);
    onChange(dateTimeDisplayToValue(displayValueStr), displayValueStr);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleSetDefault = (): void => {
    if (config.default == null) return;
    setDraftDate(config.default);
    setDraftTime(formatClock(config.default));
  };

  if (isMobile) {
    const nativeValue =
      selected.date != null && selected.time != null
        ? `${formatDate(selected.date)}T${selected.time}`
        : '';

    return (
      <div data-component={DATE_TIME_INPUT_NAME}>
        <Input
          ref={setInputRef}
          data-mobile-focus-target
          aria-label={getInputAccessibleName(input, index)}
          type="datetime-local"
          step={60}
          value={nativeValue}
          onChange={handleNativeInputChange}
          onBlur={onBlur}
          enterKeyHint={onMobileComplete ? 'next' : undefined}
          onKeyDown={
            onMobileComplete
              ? (event) => handleMobileCompletionKeyDown(event, onMobileComplete)
              : undefined
          }
          disabled={!enabled}
          error={getFirstError(errors, t)}
        />
      </div>
    );
  }

  return (
    <DatePicker.Root
      data-component={DATE_TIME_INPUT_NAME}
      value={open ? draftDate : selected.date}
      onValueChange={setDraftDate}
      closeOnSelect={false}
      native={false}
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setDraftDate(selected.date);
          setDraftTime(selected.time ?? formatClock(new Date()));
        }
        setOpen(isOpen);
      }}
      focusOnCloseRef={inputRef}
    >
      <div ref={inputWrapperRef}>
        <Input
          ref={setInputRef}
          data-mobile-focus-target
          aria-label={getInputAccessibleName(input, index)}
          type="text"
          placeholder={t('enonic.inputTypes.field.dateTimePlaceholder')}
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
              <DatePicker.Trigger
                disabled={!enabled}
                aria-label={t('enonic.inputTypes.field.dateTimeTrigger')}
              />
            </div>
          }
        />
      </div>
      <DatePicker.Portal>
        <DatePicker.Content anchorRef={inputWrapperRef} align="end">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <DatePicker.Header />
              <div className="flex flex-col gap-2">
                <DatePicker.Weekdays />
                <DatePicker.Grid />
              </div>
            </div>
            <div className="border-bdr-soft border-t pt-3">
              <TimePicker value={draftTime} onValueChange={setDraftTime}>
                <div className="flex items-center gap-2">
                  <TimePicker.HourSelect className="w-20" />
                  <span className="font-bold text-lg text-main">:</span>
                  <TimePicker.MinuteSelect className="w-20" />
                </div>
              </TimePicker>
              <div className="mt-3 flex items-center gap-3">
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
                  disabled={draftDate == null}
                >
                  {t('enonic.inputTypes.action.ok')}
                </Button>
              </div>
            </div>
          </div>
        </DatePicker.Content>
      </DatePicker.Portal>
    </DatePicker.Root>
  );
};
DateTimeInput.displayName = DATE_TIME_INPUT_NAME;
