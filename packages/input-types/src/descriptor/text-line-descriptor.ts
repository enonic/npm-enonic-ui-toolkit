import { type Value, type ValueType, ValueTypes } from '../data';
import type { InputConfigEntries, TextLineConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import type { ValidationResult } from './validation-result';

export function readMaxLength(raw: InputConfigEntries): number {
  const maxLength = Number(raw.maxLength?.[0]?.value);
  return maxLength > 0 ? maxLength : -1;
}

export function readShowCounter(raw: InputConfigEntries): boolean {
  const value = raw.showCounter?.[0]?.value;
  return value === true || value === 'true';
}

export const TextLineDescriptor: InputTypeDescriptor<TextLineConfig> = {
  name: 'TextLine',

  getValueType(): ValueType {
    return ValueTypes.STRING;
  },

  readConfig(raw: InputConfigEntries): TextLineConfig {
    const regexpStr = raw.regexp?.[0]?.value;
    let regexp: RegExp | undefined;
    if (typeof regexpStr === 'string' && regexpStr.trim() !== '') {
      try {
        regexp = new RegExp(regexpStr);
      } catch {
        console.warn(`TextLine: invalid regexp in config: "${regexpStr}"`);
      }
    }
    return { regexp, maxLength: readMaxLength(raw), showCounter: readShowCounter(raw) };
  },

  createDefaultValue(raw: unknown): Value {
    return typeof raw === 'string'
      ? ValueTypes.STRING.newValue(raw)
      : ValueTypes.STRING.newNullValue();
  },

  validate(value: Value, config: TextLineConfig, rawValue?: string): ValidationResult[] {
    const results: ValidationResult[] = [];
    const str = value.isNull() ? rawValue : (value.getString() ?? '');
    if (str == null) {
      return results;
    }
    if (config.maxLength > 0 && str.length > config.maxLength) {
      results.push({
        key: 'enonic.inputTypes.validation.breaksMaxLength',
        values: [config.maxLength],
      });
    }
    if (config.regexp && str !== '' && !config.regexp.test(str)) {
      results.push({ key: 'enonic.inputTypes.validation.invalid' });
    }
    return results;
  },

  valueBreaksRequired(value: Value): boolean {
    return (
      value.isNull() ||
      !value.getType().equals(ValueTypes.STRING) ||
      (value.getString() ?? '').trim() === ''
    );
  },
};
