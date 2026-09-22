import type { InputConfigJson } from '@enonic/ui-types';

import type { Value, ValueType } from '../data';
import type { TextLineConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import { TextLineDescriptor } from './text-line-descriptor';
import type { ValidationResult } from './validation-result';

/** A tag is a text line by another name; the component is what differs. */
export const TagDescriptor: InputTypeDescriptor<TextLineConfig> = {
  name: 'Tag',

  getValueType(): ValueType {
    return TextLineDescriptor.getValueType();
  },

  readConfig(raw: InputConfigJson): TextLineConfig {
    return TextLineDescriptor.readConfig(raw);
  },

  createDefaultValue(raw: unknown): Value {
    return TextLineDescriptor.createDefaultValue(raw);
  },

  validate(value: Value, config: TextLineConfig, rawValue?: string): ValidationResult[] {
    return TextLineDescriptor.validate(value, config, rawValue);
  },

  valueBreaksRequired(value: Value): boolean {
    return TextLineDescriptor.valueBreaksRequired(value);
  },
};
