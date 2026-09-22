import type { InputConfigJson } from '@enonic/ui-types';

import { type Value, type ValueType, ValueTypes } from '../data';
import { configText } from './config-text';
import type { ComboBoxConfig, OptionConfig, RadioButtonConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import type { ValidationResult } from './validation-result';

/** An option entry: the text under `value`, the stored value under the `@value` attribute. */
export function readOptions(raw: InputConfigJson): OptionConfig[] {
  return (raw.options ?? []).map((entry) => ({
    label: configText(entry.value),
    value: configText(entry['@value']),
  }));
}

function optionDescriptor(
  name: 'ComboBox' | 'RadioButton',
): InputTypeDescriptor<ComboBoxConfig | RadioButtonConfig> {
  return {
    name,

    getValueType(): ValueType {
      return ValueTypes.STRING;
    },

    readConfig(raw: InputConfigJson): ComboBoxConfig {
      return { options: readOptions(raw) };
    },

    createDefaultValue(raw: unknown): Value {
      return typeof raw === 'string'
        ? ValueTypes.STRING.newValue(raw)
        : ValueTypes.STRING.newNullValue();
    },

    validate(value: Value, config: ComboBoxConfig): ValidationResult[] {
      if (value.isNull()) {
        return [];
      }
      const str = value.getString();
      return config.options.some((option) => option.value === str)
        ? []
        : [{ key: 'enonic.inputTypes.validation.notAnOption' }];
    },

    valueBreaksRequired(value: Value): boolean {
      return value.isNull() || !value.getType().equals(ValueTypes.STRING);
    },
  };
}

export const ComboBoxDescriptor: InputTypeDescriptor<ComboBoxConfig> = optionDescriptor('ComboBox');

export const RadioButtonDescriptor: InputTypeDescriptor<RadioButtonConfig> =
  optionDescriptor('RadioButton');
