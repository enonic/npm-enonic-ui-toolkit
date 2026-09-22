import type { InputConfigJson } from '@enonic/ui-types';

import { type Value, type ValueType, ValueTypes } from '../data';
import type { TextAreaConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import { readMaxLength, readShowCounter } from './text-line-descriptor';
import type { ValidationResult } from './validation-result';

export const TextAreaDescriptor: InputTypeDescriptor<TextAreaConfig> = {
  name: 'TextArea',

  getValueType(): ValueType {
    return ValueTypes.STRING;
  },

  readConfig(raw: InputConfigJson): TextAreaConfig {
    return { maxLength: readMaxLength(raw), showCounter: readShowCounter(raw) };
  },

  createDefaultValue(raw: unknown): Value {
    return typeof raw === 'string'
      ? ValueTypes.STRING.newValue(raw)
      : ValueTypes.STRING.newNullValue();
  },

  validate(value: Value, config: TextAreaConfig, rawValue?: string): ValidationResult[] {
    const str = value.isNull() ? rawValue : (value.getString() ?? '');
    if (str == null || config.maxLength <= 0 || str.length <= config.maxLength) {
      return [];
    }
    return [{ key: 'enonic.inputTypes.validation.breaksMaxLength', values: [config.maxLength] }];
  },

  valueBreaksRequired(value: Value): boolean {
    return (
      value.isNull() ||
      !value.getType().equals(ValueTypes.STRING) ||
      (value.getString() ?? '').trim() === ''
    );
  },
};
