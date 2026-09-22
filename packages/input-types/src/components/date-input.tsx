import { Button, DatePicker, Input } from '@enonic/ui';
import { formatDate } from '@enonic/ui-utils';
import { type ChangeEvent, type ReactElement, useCallback, useRef, useState } from 'react';

import { type Value, ValueTypes } from '../data';
import { DATE_PATTERN } from '../descriptor/date-descriptors';
import type { DateConfig } from '../descriptor/input-type-config';
import { useIsMobile } from '../hooks/use-is-mobile';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName, handleMobileCompletionKeyDown } from '../utils/accessibility';
import { displayValue } from '../utils/display-value';
import { getFirstError } from '../utils/validation';

const DATE_INPUT_NAME = 'DateInput';

export type DateInputProps = InputTypeComponentProps<DateConfig>;

function valueToString(value: Value): string {
  return value.getString() ?? '';
}

export const DateInput = ({
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
}: DateInputProps): ReactElement => {
  const [open, setOpen] = useState(false);
  // `null`, not `undefined`: the picker's own idea of no selection.
  const [draftDate, setDraftDate] = useState<Date | null>(null);
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

  const display = displayValue(value, rawValue, valueToString);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const inputValue = event.currentTarget.value;
    if (inputValue === '') {
      onChange(ValueTypes.LOCAL_DATE.newNullValue());
    } else {
      onChange(ValueTypes.LOCAL_DATE.newValue(inputValue), inputValue);
    }
  };

  const handleConfirm = (): void => {
    if (draftDate == null) return;
    const formatted = formatDate(draftDate);
    onChange(ValueTypes.LOCAL_DATE.newValue(formatted), formatted);
    setOpen(false);
  };

  const handleSetDefault = (): void => {
    if (config.default == null) return;
    setDraftDate(config.default);
  };

  const selectedDate = DATE_PATTERN.test(display) ? new Date(`${display}T00:00:00`) : null;
  const calendarValue = open ? draftDate : selectedDate;

  if (isMobile) {
    return (
      <div data-component={DATE_INPUT_NAME}>
        <Input
          ref={setInputRef}
          data-mobile-focus-target
          aria-label={getInputAccessibleName(input, index)}
          type="date"
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
        />
      </div>
    );
  }

  return (
    <DatePicker.Root
      data-component={DATE_INPUT_NAME}
      value={calendarValue}
      onValueChange={setDraftDate}
      closeOnSelect={false}
      native={false}
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) setDraftDate(selectedDate);
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
          placeholder={t('enonic.inputTypes.field.datePlaceholder')}
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
                aria-label={t('enonic.inputTypes.field.dateTrigger')}
              />
            </div>
          }
        />
      </div>
      <DatePicker.Portal>
        <DatePicker.Content anchorRef={inputWrapperRef} align="end">
          <DatePicker.Header />
          <DatePicker.Weekdays />
          <DatePicker.Grid />
          <div className="border-bdr-soft border-t pt-3">
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
                disabled={draftDate == null}
              >
                {t('enonic.inputTypes.action.ok')}
              </Button>
            </div>
          </div>
        </DatePicker.Content>
      </DatePicker.Portal>
    </DatePicker.Root>
  );
};
DateInput.displayName = DATE_INPUT_NAME;
