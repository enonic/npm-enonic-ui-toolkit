import { type Value, type ValueType, ValueTypes } from '../data';
import { configText } from './config-text';
import type {
  ComboBoxConfig,
  InputConfigEntries,
  OptionConfig,
  RadioButtonConfig,
} from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import type { ValidationResult } from './validation-result';

/**
 * An option entry as XP emits it — `{ value: 'a', label: 'A' }`, the label a text or
 * `{ text, i18n }` — or as Content Studio's REST wraps it, `{ '@value': 'a', value: 'A' }`.
 */
export function readOptions(raw: InputConfigEntries): OptionConfig[] {
  return (raw.options ?? []).map((entry) => {
    const stored = '@value' in entry ? entry['@value'] : entry.value;
    const label = entry.label ?? ('@value' in entry ? entry.value : undefined);
    const labelText =
      typeof label === 'object' && label !== null && 'text' in label
        ? (label as { text?: unknown }).text
        : label;
    return { label: configText(labelText ?? stored), value: configText(stored) };
  });
}

function optionDescriptor(
  name: 'ComboBox' | 'RadioButton',
): InputTypeDescriptor<ComboBoxConfig | RadioButtonConfig> {
  return {
    name,

    getValueType(): ValueType {
      return ValueTypes.STRING;
    },

    readConfig(raw: InputConfigEntries): ComboBoxConfig {
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
