import type { Value } from '../data';
import type { Input } from '../schema';
import type { InputTypeConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';

/**
 * An input's configured default as a value: what the schema's `default` entry parses to, when
 * it parses and validates against the config; the type's null value otherwise.
 */
export function computeDefaultValue<C extends InputTypeConfig>(
  input: Input,
  descriptor: InputTypeDescriptor<C>,
  config: C,
): Value {
  const raw = input.getInputTypeConfig()?.default?.[0]?.value;
  if (raw == null) return descriptor.getValueType().newNullValue();
  const value = descriptor.createDefaultValue(raw);
  if (value.isNull()) return descriptor.getValueType().newNullValue();
  if (descriptor.validate(value, config).length > 0)
    return descriptor.getValueType().newNullValue();
  return value;
}
