import type { InputConfigJson } from '@enonic/ui-types';

import { type Value, type ValueType, ValueTypes } from '../data';
import type { GeoPointConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import { invalidValue, type ValidationResult } from './validation-result';

export const GeoPointDescriptor: InputTypeDescriptor<GeoPointConfig> = {
  name: 'GeoPoint',

  getValueType(): ValueType {
    return ValueTypes.GEO_POINT;
  },

  readConfig(_raw: InputConfigJson): GeoPointConfig {
    return {};
  },

  createDefaultValue(raw: unknown): Value {
    return typeof raw === 'string'
      ? ValueTypes.GEO_POINT.newValue(raw)
      : ValueTypes.GEO_POINT.newNullValue();
  },

  /** A null value with a raw string — `90,` — is input the parser rejected, not an empty field. */
  validate(value: Value, _config: GeoPointConfig, rawValue?: string): ValidationResult[] {
    if (value.isNull()) {
      return rawValue != null && rawValue !== '' ? [invalidValue] : [];
    }
    return ValueTypes.GEO_POINT.isValid(value.getObject()) ? [] : [invalidValue];
  },

  valueBreaksRequired(value: Value): boolean {
    return value.isNull() || !value.getType().equals(ValueTypes.GEO_POINT);
  },
};
