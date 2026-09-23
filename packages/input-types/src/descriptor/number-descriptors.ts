import { type Value, type ValueType, ValueTypes } from '../data';
import type { InputConfigEntries, NumberConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import { invalidValue, type ValidationResult } from './validation-result';

function readNumberConfig(raw: InputConfigEntries): NumberConfig {
  return { min: readBound(raw.min?.[0]?.value), max: readBound(raw.max?.[0]?.value) };
}

function readBound(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
}

function validateRange(num: number, config: NumberConfig): ValidationResult[] {
  if (config.min != null && num < config.min) {
    return [{ key: 'enonic.inputTypes.validation.breaksMin', values: [config.min] }];
  }
  if (config.max != null && num > config.max) {
    return [{ key: 'enonic.inputTypes.validation.breaksMax', values: [config.max] }];
  }
  return [];
}

function numberDescriptor(
  name: 'Long' | 'Double',
  type: typeof ValueTypes.LONG | typeof ValueTypes.DOUBLE,
  isOfKind: (num: number) => boolean,
): InputTypeDescriptor<NumberConfig> {
  return {
    name,

    getValueType(): ValueType {
      return type;
    },

    readConfig: readNumberConfig,

    createDefaultValue(raw: unknown): Value {
      const num = typeof raw === 'string' ? (raw.trim() === '' ? undefined : Number(raw)) : raw;
      return typeof num === 'number' && isOfKind(num)
        ? type.fromJsonValue(num)
        : type.newNullValue();
    },

    /** A null value with a raw string is what the user typed and could not be parsed: a format or a range error. */
    validate(value: Value, config: NumberConfig, rawValue?: string): ValidationResult[] {
      if (value.isNull()) {
        if (rawValue == null || rawValue === '') {
          return [];
        }
        const parsed = Number(rawValue);
        return isOfKind(parsed) ? validateRange(parsed, config) : [invalidValue];
      }
      const num = value.getObject();
      return typeof num === 'number' && isOfKind(num) ? validateRange(num, config) : [invalidValue];
    },

    valueBreaksRequired(value: Value): boolean {
      return value.isNull() || !value.getType().equals(type);
    },
  };
}

export const LongDescriptor = numberDescriptor('Long', ValueTypes.LONG, (num) =>
  Number.isInteger(num),
);

export const DoubleDescriptor = numberDescriptor('Double', ValueTypes.DOUBLE, (num) =>
  Number.isFinite(num),
);
