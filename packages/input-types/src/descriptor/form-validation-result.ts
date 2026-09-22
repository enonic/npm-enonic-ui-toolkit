import type { ValidationMessage, ValidationResult } from './validation-result';

/** The validation of one input, one error list per occurrence. */
export type InputValidationNode = {
  readonly type: 'input';
  readonly path: string;
  readonly name: string;
  readonly errors: ValidationResult[][];
  /** A min/max breach of the occurrences themselves; absent when the count is fine. */
  readonly occurrenceError?: ValidationMessage;
  /** True when the input is not required (minimum 0). */
  readonly optional: boolean;
};

export type FieldSetValidationNode = {
  readonly type: 'fieldset';
  readonly path: string;
  readonly name: string;
  readonly children: FormValidationNode[];
  readonly isValid?: boolean;
};

export type ItemSetValidationNode = {
  readonly type: 'itemset';
  readonly path: string;
  readonly name: string;
  readonly occurrenceError?: ValidationMessage;
  readonly occurrences: {
    readonly children: FormValidationNode[];
    readonly isValid?: boolean;
  }[];
};

export type OptionSetValidationNode = {
  readonly type: 'optionset';
  readonly path: string;
  readonly name: string;
  readonly occurrenceError?: ValidationMessage;
  readonly occurrences: {
    readonly children: FormValidationNode[];
    readonly multiselectionError?: ValidationMessage;
    readonly isValid?: boolean;
  }[];
};

/** A form item kind the validator does not know. */
export type SkippedValidationNode = {
  readonly type: 'skipped';
  readonly path: string;
  readonly name: string;
};

export type FormValidationNode =
  | InputValidationNode
  | FieldSetValidationNode
  | ItemSetValidationNode
  | OptionSetValidationNode
  | SkippedValidationNode;

export type FormValidationResult = {
  readonly isValid: boolean;
  readonly children: FormValidationNode[];
};
