import type { PrincipalType } from '@enonic/ui-types';

import type { ValidationMessage } from './validation-result';

/**
 * One entry of an input type's config as a descriptor reads it: the text under `value`, an
 * attribute under its own name — `{ value: 'A', '@value': 'a' }` for an option, `{ value: 42 }`
 * for a `maxLength`. What `normalizeInputConfig` makes of XP's raw values and what Content
 * Studio's REST sends as is.
 */
export type InputConfigEntry = {
  readonly value?: unknown;
  readonly [attribute: string]: unknown;
};

/** An input type's config with every property a list of entries, since any of them may repeat. */
export type InputConfigEntries = {
  readonly [property: string]: readonly InputConfigEntry[];
};

export type TextLineConfig = {
  regexp: RegExp | undefined;
  maxLength: number;
  showCounter: boolean;
};

export type TextAreaConfig = {
  maxLength: number;
  showCounter: boolean;
};

export type NumberConfig = {
  min: number | undefined;
  max: number | undefined;
};

export type Alignment = 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';

export type CheckboxConfig = {
  alignment: Alignment;
};

export type OptionConfig = {
  label: string;
  value: string;
};

/** Kept from lib-admin-ui's `form2`, where the two option types were named apart. */
export type ComboBoxOptionConfig = OptionConfig;
export type RadioButtonOptionConfig = OptionConfig;

export type ComboBoxConfig = {
  options: OptionConfig[];
};

export type RadioButtonConfig = {
  options: OptionConfig[];
};

export type PrincipalSelectorConfig = {
  principalTypes: PrincipalType[];
  /** Principal keys, `user:system:admin`, left out of the choice. */
  skipPrincipals: string[];
};

export type GeoPointConfig = Record<string, never>;

export type DateConfig = { default?: Date | undefined };
export type DateTimeConfig = { default?: Date | undefined };
export type InstantConfig = { default?: Date | undefined };
export type TimeConfig = { default?: Date | undefined };

export type DateTimeRangeConfig = {
  useTimezone: boolean;
  /** The schema's own labels; the component falls back to the `dateTimeRange.from`/`to` phrases. */
  fromLabel: string | undefined;
  toLabel: string | undefined;
  /** The schema's own text as a message, else one of the package's phrases. */
  errorNoStart: ValidationMessage;
  errorEndInPast: ValidationMessage;
  errorEndBeforeStart: ValidationMessage;
  errorStartEqualsEnd: ValidationMessage;
  defaultFromTime: { hours: number; minutes: number } | undefined;
  defaultToTime: { hours: number; minutes: number } | undefined;
  fromPlaceholder: string;
  toPlaceholder: string;
  optionalFrom: boolean;
};

/** What every config type extends — open, so an application's input type brings its own. */
export type InputTypeConfig = Record<string, unknown>;
