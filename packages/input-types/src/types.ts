import type { ComponentType } from 'react';

import type { PropertyPath, Value } from './data';
import type { InputTypeConfig } from './descriptor/input-type-config';
import type { InputTypeDescriptor } from './descriptor/input-type-descriptor';
import type { OccurrenceManagerState } from './descriptor/occurrence-manager';
import type { ValidationResult } from './descriptor/validation-result';
import type { Input, Occurrences } from './schema';

/**
 * How an input type renders its occurrences: `list` renders one component per value inside the
 * package's occurrence list, `single` renders exactly one, `internal` hands the whole array to a
 * component that manages its own occurrences — a selector, a tag list.
 */
export type InputTypeMode = 'list' | 'single' | 'internal';

/** What every occurrence component receives, one per occurrence. */
export type InputTypeComponentProps<C extends InputTypeConfig = InputTypeConfig> = {
  value: Value;
  rawValue?: string;
  onChange: (value: Value, rawValue?: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  /** Mobile soft-keyboard completion: a leaf input calls this for Enter with its focusable element. */
  onMobileComplete?: (element: HTMLElement) => void;
  config: C;
  input: Input;
  enabled: boolean;
  index: number;
  errors: ValidationResult[];
  /** True while the field is read-only at the form level. */
  readOnly?: boolean;
  /** True while an external caller holds a processing lock on this occurrence. */
  processing?: boolean;
  /**
   * Callback ref for the leaf input's focusable element, so the field can reveal, focus and
   * blur it by occurrence id. A leaf forwards its own ref and calls with `null` on unmount.
   */
  inputRef?: (el: HTMLElement | null) => void;
  /** Edge-trigger counter for the attention blink; each increment restarts the pulse. */
  highlight?: number;
};

export type InputTypeComponent<C extends InputTypeConfig = InputTypeConfig> = ComponentType<
  InputTypeComponentProps<C>
>;

/** What an `internal`-mode component receives: the whole array and the means to change it. */
export type SelfManagedComponentProps<C extends InputTypeConfig = InputTypeConfig> = {
  occurrenceIds: string[];
  values: Value[];
  onChange: (index: number, value: Value, rawValue?: string) => void;
  onBlur?: (index: number) => void;
  onAdd: (value?: Value) => void;
  onRemove: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  occurrences: Occurrences;
  config: C;
  input: Input;
  dataPath?: PropertyPath;
  enabled: boolean;
  errors: OccurrenceManagerState['occurrenceValidation'];
};

export type SelfManagedInputTypeComponent<C extends InputTypeConfig = InputTypeConfig> =
  ComponentType<SelfManagedComponentProps<C>>;

/** A registered input type: its descriptor, and the component that renders it, if any. */
export type InputTypeDefinition<C extends InputTypeConfig = InputTypeConfig> =
  | { mode: 'list'; descriptor: InputTypeDescriptor<C>; component?: InputTypeComponent<C> }
  | { mode: 'single'; descriptor: InputTypeDescriptor<C>; component?: InputTypeComponent<C> }
  | {
      mode: 'internal';
      descriptor: InputTypeDescriptor<C>;
      component?: SelfManagedInputTypeComponent<C>;
    };
