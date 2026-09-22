import type { PrincipalType } from '@enonic/ui-types';

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
  fromLabel: string;
  toLabel: string;
  errorNoStart: string;
  errorEndInPast: string;
  errorEndBeforeStart: string;
  errorStartEqualsEnd: string;
  defaultFromTime: { hours: number; minutes: number } | undefined;
  defaultToTime: { hours: number; minutes: number } | undefined;
  fromPlaceholder: string;
  toPlaceholder: string;
  optionalFrom: boolean;
};

/** What every config type extends — open, so an application's input type brings its own. */
export type InputTypeConfig = Record<string, unknown>;
