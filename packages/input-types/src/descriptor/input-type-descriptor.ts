import type { Value, ValueType } from '../data';
import type { InputConfigEntries, InputTypeConfig } from './input-type-config';
import type { ValidationResult } from './validation-result';

/**
 * The pure half of an input type: its value type, how its schema config reads, its default value,
 * and how a value validates. One per registration name; nothing here touches the DOM.
 */
export type InputTypeDescriptor<C extends InputTypeConfig = InputTypeConfig> = {
  /** The registration name, `TextLine`. */
  readonly name: string;

  getValueType(): ValueType;

  /** The typed config from the schema's raw entries. */
  readConfig(raw: InputConfigEntries): C;

  /** A typed default from the schema's raw `default` entry. */
  createDefaultValue(raw: unknown): Value;

  /** The errors of one value; empty when valid. `rawValue` is what the user typed when it did not parse. */
  validate(value: Value, config: C, rawValue?: string): ValidationResult[];

  /** Whether the value counts as missing for a required field. */
  valueBreaksRequired(value: Value): boolean;
};
