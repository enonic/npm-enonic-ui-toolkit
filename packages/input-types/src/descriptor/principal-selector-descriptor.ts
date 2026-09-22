import type { InputConfigJson, PrincipalType } from '@enonic/ui-types';

import { type Value, type ValueType, ValueTypes } from '../data';
import { configText } from './config-text';
import type { PrincipalSelectorConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import type { ValidationResult } from './validation-result';

const PRINCIPAL_TYPES: readonly string[] = ['user', 'group', 'role'];

/**
 * The descriptor of a principal selector; the component is an application's, since only the
 * application knows where its principals come from.
 */
export const PrincipalSelectorDescriptor: InputTypeDescriptor<PrincipalSelectorConfig> = {
  name: 'PrincipalSelector',

  getValueType(): ValueType {
    return ValueTypes.REFERENCE;
  },

  readConfig(raw: InputConfigJson): PrincipalSelectorConfig {
    const principalTypes = (raw.principalType ?? [])
      .map((entry) => configText(entry.value).toLowerCase())
      .filter((type): type is PrincipalType => PRINCIPAL_TYPES.includes(type));
    const skipPrincipals = (raw.skipPrincipals ?? [])
      .map((entry) => configText(entry.value))
      .filter((key) => key !== '');
    return { principalTypes, skipPrincipals };
  },

  createDefaultValue(): Value {
    return ValueTypes.REFERENCE.newNullValue();
  },

  validate(): ValidationResult[] {
    return [];
  },

  valueBreaksRequired(value: Value): boolean {
    return value.isNull() || !value.getType().equals(ValueTypes.REFERENCE);
  },
};
