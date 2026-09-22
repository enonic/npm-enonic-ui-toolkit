import { Button, DatePicker, Input, TimePicker } from '@enonic/ui';
import { DateTime, formatDate, pad } from '@enonic/ui-utils';
import { type ChangeEvent, type ReactElement, useCallback, useMemo, useRef, useState } from 'react';

import { Value, ValueTypes } from '../data';
import type { InstantConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName, handleMobileCompletionKeyDown } from '../utils/accessibility';
import { displayValue, parseDisplayDateTime } from '../utils/display-value';
import { getFirstError } from '../utils/validation';

const INSTANT_INPUT_NAME = 'InstantInput';

export type InstantInputProps = InputTypeComponentProps<InstantConfig>;

/** A stored UTC instant as local wall-clock time to the minute. */
export function instantStorageToDisplay(stored: string): string {
  const date = new Date(stored);
  if (Number.isNaN(date.getTime())) return stored.replace('T', ' ').replace(/Z$/, '');
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function instantValueToDisplay(value: Value): string {
  const str = value.getString();
  return str ? instantStorageToDisplay(str) : '';
}

/**
 * Rejects an impossible date where `new Date` would roll it over; `DateTime.fromDate` then
 * reads the UTC parts off the local date, which is the conversion.
 */
export function instantDisplayToValue(display: string): Value {
  const parsed = parseDisplayDateTime(display);
  if (parsed == null) return ValueTypes.DATE_TIME.newNullValue();
  return new Value(DateTime.fromDate(parsed), ValueTypes.DATE_TIME);
}

function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(date: Date, time: string | null): string {
  return `${formatDate(date)} ${time ?? formatClock(date)}`;
}

/** `UTC+02:00` for the date and time being picked; the offset can change mid-day on a DST switch. */
export function formatTimezoneLabel(date: Date | null, time: string | null): string {
  let ref = date ?? new Date();
  if (date != null && time != null) {
    const [h, m] = time.split(':').map(Number);
    ref = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h ?? 0, m ?? 0);
  }
  const offset = ref.getTimezoneOffset();
  const sign = offset <= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  return `UTC${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
}

export const InstantInput = ({
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
}: InstantInputProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | null>(null);
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

  const timezoneLabel = useMemo(
    () => formatTimezoneLabel(draftDate, draftTime),
    [draftDate, draftTime],
  );

  const display = displayValue(value, rawValue, instantValueToDisplay);

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
      onChange(ValueTypes.DATE_TIME.newNullValue());
    } else {
      onChange(instantDisplayToValue(inputValue), inputValue);
    }
  };

  const handleConfirm = (): void => {
    if (draftDate == null) return;
    const displayValueStr = formatDisplay(draftDate, draftTime);
    onChange(instantDisplayToValue(displayValueStr), displayValueStr);
    setOpen(false);
    if (onMobileComplete != null && inputRef.current != null) {
      onMobileComplete(inputRef.current);
    } else {
      inputRef.current?.focus();
    }
  };

  const handleSetDefault = (): void => {
    if (config.default == null) return;
    setDraftDate(config.default);
    setDraftTime(formatClock(config.default));
  };

  return (
    <DatePicker.Root
      data-component={INSTANT_INPUT_NAME}
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
                  <span className="text-sm underline">{timezoneLabel}</span>
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
InstantInput.displayName = INSTANT_INPUT_NAME;
