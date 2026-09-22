import type { InputConfigJson } from '@enonic/ui-types';
import {
  DateTime,
  dateFromTime,
  isRelativeTime,
  LocalDate,
  LocalDateTime,
  LocalTime,
  parseRelativeTime,
  parseTime,
} from '@enonic/ui-utils';

import { Value, type ValueType, ValueTypes } from '../data';
import type { DateConfig, DateTimeConfig, InstantConfig, TimeConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import { invalidValue, type ValidationResult } from './validation-result';

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
export const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
export const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z$/;
const OFFSET_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?[+-]\d{2}:\d{2}$/;

const isRelative = (raw: string): boolean => raw.trim() !== '' && isRelativeTime(raw);

function validDate(date: Date | undefined): Date | undefined {
  return date !== undefined && !Number.isNaN(date.getTime()) ? date : undefined;
}

/** A default from the schema: an absolute value in the type's own form, or `now` with offsets. */
function readDefault(
  raw: InputConfigJson,
  parse: (str: string) => Date | undefined,
): Date | undefined {
  const value = raw.default?.[0]?.value;
  return typeof value === 'string' && value.length > 0 ? validDate(parse(value)) : undefined;
}

/** Midnight, local time, of the date in `raw`; a relative expression keeps the day only. */
function parseDateDefault(raw: string): Date | undefined {
  if (DATE_PATTERN.test(raw)) {
    return validDate(new Date(`${raw}T00:00:00`));
  }
  if (isRelative(raw)) {
    return LocalDate.fromDate(parseRelativeTime(raw)).toDate();
  }
  return undefined;
}

/** Today at the time in `raw`; a relative expression keeps hours and minutes only. */
function parseTimeDefault(raw: string): Date | undefined {
  if (TIME_PATTERN.test(raw)) {
    const time = parseTime(raw);
    return time === undefined ? undefined : dateFromTime(time.hours, time.minutes);
  }
  if (isRelative(raw)) {
    const date = parseRelativeTime(raw);
    return dateFromTime(date.getHours(), date.getMinutes());
  }
  return undefined;
}

function parseDateTimeDefault(raw: string): Date | undefined {
  if (DATE_TIME_PATTERN.test(raw)) {
    return validDate(new Date(raw));
  }
  return isRelative(raw) ? parseRelativeTime(raw) : undefined;
}

/** The DateTime picker is minute-granular: `2025-06-15T14:30:45.123` becomes `2025-06-15T14:30`. */
export function truncateToMinutes(dateTime: string): string {
  return dateTime.slice(0, 16);
}

/** The Instant picker is minute-granular, so a default keeps no seconds or fractions. */
function truncateInstantToMinutes(date: Date): Date {
  const truncated = new Date(date.getTime());
  truncated.setUTCSeconds(0, 0);
  return truncated;
}

/** A `Z` or an offset carries its zone; a naive date-time is read as local time, as `Date` does. */
function parseInstantDefault(raw: string): Date | undefined {
  if (INSTANT_PATTERN.test(raw) || OFFSET_PATTERN.test(raw) || DATE_TIME_PATTERN.test(raw)) {
    return validDate(new Date(raw));
  }
  return isRelative(raw) ? parseRelativeTime(raw) : undefined;
}

function validateString(value: Value, pattern: RegExp, rawValue?: string): ValidationResult[] {
  if (value.isNull()) {
    return rawValue != null && rawValue !== '' ? [invalidValue] : [];
  }
  const str = value.getString();
  return str !== undefined && !pattern.test(str) ? [invalidValue] : [];
}

export const DateDescriptor: InputTypeDescriptor<DateConfig> = {
  name: 'Date',

  getValueType(): ValueType {
    return ValueTypes.LOCAL_DATE;
  },

  readConfig(raw: InputConfigJson): DateConfig {
    return { default: readDefault(raw, parseDateDefault) };
  },

  createDefaultValue(raw: unknown): Value {
    if (typeof raw !== 'string') {
      return ValueTypes.LOCAL_DATE.newNullValue();
    }
    if (DATE_PATTERN.test(raw)) {
      return ValueTypes.LOCAL_DATE.newValue(raw);
    }
    const date = parseDateDefault(raw);
    return date === undefined
      ? ValueTypes.LOCAL_DATE.newNullValue()
      : new Value(LocalDate.fromDate(date), ValueTypes.LOCAL_DATE);
  },

  validate(value: Value, _config: DateConfig, rawValue?: string): ValidationResult[] {
    return validateString(value, DATE_PATTERN, rawValue);
  },

  valueBreaksRequired(value: Value): boolean {
    return value.isNull() || !value.getType().equals(ValueTypes.LOCAL_DATE);
  },
};

export const TimeDescriptor: InputTypeDescriptor<TimeConfig> = {
  name: 'Time',

  getValueType(): ValueType {
    return ValueTypes.LOCAL_TIME;
  },

  readConfig(raw: InputConfigJson): TimeConfig {
    return { default: readDefault(raw, parseTimeDefault) };
  },

  createDefaultValue(raw: unknown): Value {
    if (typeof raw !== 'string') {
      return ValueTypes.LOCAL_TIME.newNullValue();
    }
    if (TIME_PATTERN.test(raw)) {
      return ValueTypes.LOCAL_TIME.newValue(raw);
    }
    const date = parseTimeDefault(raw);
    return date === undefined
      ? ValueTypes.LOCAL_TIME.newNullValue()
      : new Value(LocalTime.of(date.getHours(), date.getMinutes()), ValueTypes.LOCAL_TIME);
  },

  validate(value: Value, _config: TimeConfig, rawValue?: string): ValidationResult[] {
    return validateString(value, TIME_PATTERN, rawValue);
  },

  valueBreaksRequired(value: Value): boolean {
    return value.isNull() || !value.getType().equals(ValueTypes.LOCAL_TIME);
  },
};

export const DateTimeDescriptor: InputTypeDescriptor<DateTimeConfig> = {
  name: 'DateTime',

  getValueType(): ValueType {
    return ValueTypes.LOCAL_DATE_TIME;
  },

  readConfig(raw: InputConfigJson): DateTimeConfig {
    return { default: readDefault(raw, parseDateTimeDefault) };
  },

  createDefaultValue(raw: unknown): Value {
    if (typeof raw !== 'string') {
      return ValueTypes.LOCAL_DATE_TIME.newNullValue();
    }
    if (DATE_TIME_PATTERN.test(raw)) {
      return ValueTypes.LOCAL_DATE_TIME.newValue(truncateToMinutes(raw));
    }
    const date = parseDateTimeDefault(raw);
    return date === undefined
      ? ValueTypes.LOCAL_DATE_TIME.newNullValue()
      : ValueTypes.LOCAL_DATE_TIME.newValue(
          truncateToMinutes(LocalDateTime.fromDate(date).toString()),
        );
  },

  validate(value: Value, _config: DateTimeConfig, rawValue?: string): ValidationResult[] {
    return validateString(value, DATE_TIME_PATTERN, rawValue);
  },

  valueBreaksRequired(value: Value): boolean {
    return value.isNull() || !value.getType().equals(ValueTypes.LOCAL_DATE_TIME);
  },
};

export const InstantDescriptor: InputTypeDescriptor<InstantConfig> = {
  name: 'Instant',

  getValueType(): ValueType {
    return ValueTypes.DATE_TIME;
  },

  readConfig(raw: InputConfigJson): InstantConfig {
    return { default: readDefault(raw, parseInstantDefault) };
  },

  createDefaultValue(raw: unknown): Value {
    if (typeof raw !== 'string') {
      return ValueTypes.DATE_TIME.newNullValue();
    }
    const date = parseInstantDefault(raw);
    return date === undefined
      ? ValueTypes.DATE_TIME.newNullValue()
      : new Value(DateTime.fromDate(truncateInstantToMinutes(date)), ValueTypes.DATE_TIME);
  },

  validate(value: Value, _config: InstantConfig, rawValue?: string): ValidationResult[] {
    return validateString(value, INSTANT_PATTERN, rawValue);
  },

  valueBreaksRequired(value: Value): boolean {
    return value.isNull() || !value.getType().equals(ValueTypes.DATE_TIME);
  },
};
