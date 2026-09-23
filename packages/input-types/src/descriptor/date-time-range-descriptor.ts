import { LocalDateTime } from '@enonic/ui-utils';

import { type Value, type ValueType, ValueTypes } from '../data';
import { configText } from './config-text';
import type { DateTimeRangeConfig, InputConfigEntries } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import type { ValidationMessage, ValidationResult } from './validation-result';

const RANGE_TYPES: readonly string[] = ['DateTime', 'LocalDateTime'];

type RangeErrorKey = 'noStart' | 'endInPast' | 'endBeforeStart' | 'startEqualsEnd';

/**
 * A `from` and a `to` in one nested set. A schema may name the two dates and word the errors
 * itself; where it does not, the package's phrases speak, with the schema's labels in them
 * when it gave any.
 */
export const DateTimeRangeDescriptor: InputTypeDescriptor<DateTimeRangeConfig> = {
  name: 'DateTimeRange',

  getValueType(): ValueType {
    return ValueTypes.DATA;
  },

  readConfig(raw: InputConfigEntries): DateTimeRangeConfig {
    const read = (name: string): string => configText(raw[name]?.[0]?.value);
    const readTime = (name: string): { hours: number; minutes: number } | undefined => {
      const time = read(name);
      if (time === '') {
        return undefined;
      }
      const [hours = '0', minutes = '0'] = time.split(':');
      return {
        hours: Number.parseInt(hours, 10) || 0,
        minutes: Number.parseInt(minutes, 10) || 0,
      };
    };
    const custom = (name: string): string | undefined => {
      const text = read(name);
      return text === '' ? undefined : text;
    };
    const fromLabel = custom('fromLabel');
    const toLabel = custom('toLabel');
    const error = (name: string, key: RangeErrorKey): ValidationMessage => {
      const text = custom(name);
      if (text !== undefined) return { message: text };
      if (fromLabel === undefined && toLabel === undefined) {
        return { key: `enonic.inputTypes.dateTimeRange.${key}Default` };
      }
      return {
        key: `enonic.inputTypes.dateTimeRange.${key}`,
        values: [fromLabel ?? 'Date from', toLabel ?? 'Date to'],
      };
    };
    return {
      useTimezone: read('timezone') === 'true',
      fromLabel,
      toLabel,
      errorNoStart: error('errorNoStart', 'noStart'),
      errorEndInPast: error('errorEndInPast', 'endInPast'),
      errorEndBeforeStart: error('errorEndBeforeStart', 'endBeforeStart'),
      errorStartEqualsEnd: error('errorStartEqualsEnd', 'startEqualsEnd'),
      defaultFromTime: readTime('defaultFromTime'),
      defaultToTime: readTime('defaultToTime'),
      fromPlaceholder: read('fromPlaceholder'),
      toPlaceholder: read('toPlaceholder'),
      optionalFrom: read('optionalFrom') !== '',
    };
  },

  createDefaultValue(): Value {
    return ValueTypes.DATA.newNullValue();
  },

  validate(value: Value, config: DateTimeRangeConfig): ValidationResult[] {
    if (value.isNull()) {
      return [];
    }
    if (!value.getType().equals(ValueTypes.DATA)) {
      return [{ key: 'enonic.inputTypes.validation.notADateTimeRange' }];
    }
    const set = value.getPropertySet();
    if (set === undefined) {
      return [];
    }
    const from = set.getProperty('from', 0)?.getLocalDateTime();
    const to = set.getProperty('to', 0)?.getLocalDateTime();
    if (to !== undefined && from === undefined && !config.optionalFrom) {
      return [config.errorNoStart];
    }
    if (to === undefined) {
      return [];
    }
    const toDate = to.toDate();
    const now = new Date();
    if (toDate < now) {
      return [config.errorEndInPast];
    }
    const effectiveFrom = from ?? LocalDateTime.fromDate(now);
    if (toDate < effectiveFrom.toDate()) {
      return [config.errorEndBeforeStart];
    }
    if (to.equals(effectiveFrom)) {
      return [config.errorStartEqualsEnd];
    }
    return [];
  },

  valueBreaksRequired(value: Value): boolean {
    const set = value.getPropertySet();
    if (set === undefined) {
      return true;
    }
    const from = set.getProperty('from', 0);
    const to = set.getProperty('to', 0);
    if (from !== undefined && !RANGE_TYPES.includes(from.getType().getName())) {
      return true;
    }
    if (to !== undefined && !RANGE_TYPES.includes(to.getType().getName())) {
      return true;
    }
    return false;
  },
};
