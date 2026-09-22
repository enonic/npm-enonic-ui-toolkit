import { Input } from '@enonic/ui';
import { GeoPoint } from '@enonic/ui-utils';
import type { ChangeEvent, ReactElement } from 'react';

import { type Value, ValueTypes } from '../data';
import type { GeoPointConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { InputTypeComponentProps } from '../types';
import { getInputAccessibleName, handleMobileCompletionKeyDown } from '../utils/accessibility';
import { displayValue } from '../utils/display-value';
import { getFirstError } from '../utils/validation';

const GEO_POINT_INPUT_NAME = 'GeoPointInput';

export type GeoPointInputProps = InputTypeComponentProps<GeoPointConfig>;

function valueToString(value: Value): string {
  return value.getGeoPoint()?.toString() ?? '';
}

export const GeoPointInput = ({
  value,
  rawValue,
  onChange,
  onBlur,
  onMobileComplete,
  input,
  enabled,
  index,
  errors,
  inputRef,
}: GeoPointInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  const display = displayValue(value, rawValue, valueToString);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const inputValue = event.currentTarget.value;
    if (inputValue === '') {
      onChange(ValueTypes.GEO_POINT.newNullValue());
    } else if (GeoPoint.isValidString(inputValue)) {
      onChange(ValueTypes.GEO_POINT.newValue(inputValue), inputValue);
    } else {
      onChange(ValueTypes.GEO_POINT.newNullValue(), inputValue);
    }
  };

  return (
    <Input
      ref={inputRef}
      data-component={GEO_POINT_INPUT_NAME}
      data-mobile-focus-target
      aria-label={getInputAccessibleName(input, index)}
      type="text"
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
    />
  );
};
GeoPointInput.displayName = GEO_POINT_INPUT_NAME;
