import type { InputConfigJson } from '@enonic/ui-types';

import { type Value, type ValueType, ValueTypes } from '../data';
import type { Alignment, CheckboxConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import type { ValidationResult } from './validation-result';

const ALIGNMENTS: readonly string[] = ['LEFT', 'RIGHT', 'TOP', 'BOTTOM'];

export const CheckboxDescriptor: InputTypeDescriptor<CheckboxConfig> = {
  name: 'Checkbox',

  getValueType(): ValueType {
    return ValueTypes.BOOLEAN;
  },

  readConfig(raw: InputConfigJson): CheckboxConfig {
    const value = raw.alignment?.[0]?.value;
    const normalized = typeof value === 'string' ? value.toUpperCase() : '';
    return { alignment: ALIGNMENTS.includes(normalized) ? (normalized as Alignment) : 'LEFT' };
  },

  /** The schema's default is the word `checked`, not a boolean. */
  createDefaultValue(raw: unknown): Value {
    return ValueTypes.BOOLEAN.newBoolean(raw === 'checked');
  },

  validate(): ValidationResult[] {
    return [];
  },

  /** A required checkbox is one that is ticked. */
  valueBreaksRequired(value: Value): boolean {
    return (
      value.isNull() || !value.getType().equals(ValueTypes.BOOLEAN) || value.getBoolean() !== true
    );
  },
};
