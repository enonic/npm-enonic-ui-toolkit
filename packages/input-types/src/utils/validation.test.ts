import { describe, expect, it } from 'vitest';

import type {
  FieldSetValidationNode,
  FormValidationResult,
  InputValidationNode,
  SkippedValidationNode,
} from '../descriptor/form-validation-result';
import type { OccurrenceValidationState } from '../descriptor/occurrence-manager';
import type { ValidationResult } from '../descriptor/validation-result';
import type { ResolvePhrase } from '../descriptor/validation-result';
import { Occurrences } from '../schema';
import { findByPath, getFirstError, getOccurrenceErrorMessage } from './validation';

const t: ResolvePhrase = (key: string, ...args: unknown[]) =>
  args.length > 0 ? `${key}:${args.join(',')}` : key;

const passKey: ResolvePhrase = (key) => key;

describe('getFirstError', () => {
  it('should return undefined for empty array', () => {
    const result = getFirstError([], passKey);

    expect(result).toBeUndefined();
  });

  it('should return first message for single error', () => {
    const errors: ValidationResult[] = [{ message: 'Not a whole number' }];

    const result = getFirstError(errors, passKey);

    expect(result).toBe('Not a whole number');
  });

  it('should return first message for multiple errors', () => {
    const errors: ValidationResult[] = [{ message: 'First error' }, { message: 'Second error' }];

    const result = getFirstError(errors, passKey);

    expect(result).toBe('First error');
  });
});

describe('getOccurrenceErrorMessage', () => {
  it('returns undefined when any occurrence has field errors', () => {
    const validation: OccurrenceValidationState[] = [
      { index: 0, breaksRequired: false, validationResults: [{ message: 'Invalid' }] },
    ];

    expect(getOccurrenceErrorMessage(Occurrences.minmax(1, 3), validation, t)).toBeUndefined();
  });

  it('returns field.value.required when min >= 1 and max === 1 and minimum breached', () => {
    const validation: OccurrenceValidationState[] = [
      { index: 0, breaksRequired: true, validationResults: [] },
    ];

    expect(getOccurrenceErrorMessage(Occurrences.minmax(1, 1), validation, t)).toBe(
      'enonic.inputTypes.validation.required',
    );
  });

  it('returns field.occurrence.breaks.min when min >= 1 and max !== 1 and minimum breached', () => {
    const validation: OccurrenceValidationState[] = [];

    expect(getOccurrenceErrorMessage(Occurrences.minmax(2, 5), validation, t)).toBe(
      'enonic.inputTypes.occurrence.breaksMin:2',
    );
  });

  it('returns field.occurrence.breaks.max.one when max === 1 and maximum breached', () => {
    const validation: OccurrenceValidationState[] = [
      { index: 0, breaksRequired: false, validationResults: [] },
      { index: 1, breaksRequired: false, validationResults: [] },
    ];

    expect(getOccurrenceErrorMessage(Occurrences.minmax(0, 1), validation, t)).toBe(
      'enonic.inputTypes.occurrence.breaksMaxOne',
    );
  });

  it('returns field.occurrence.breaks.max.many when max > 1 and maximum breached', () => {
    const validation: OccurrenceValidationState[] = [
      { index: 0, breaksRequired: false, validationResults: [] },
      { index: 1, breaksRequired: false, validationResults: [] },
      { index: 2, breaksRequired: false, validationResults: [] },
    ];

    expect(getOccurrenceErrorMessage(Occurrences.minmax(0, 2), validation, t)).toBe(
      'enonic.inputTypes.occurrence.breaksMaxMany:2',
    );
  });

  it('returns undefined when counts satisfied', () => {
    const validation: OccurrenceValidationState[] = [
      { index: 0, breaksRequired: false, validationResults: [] },
      { index: 1, breaksRequired: false, validationResults: [] },
    ];

    expect(getOccurrenceErrorMessage(Occurrences.minmax(1, 3), validation, t)).toBeUndefined();
  });

  it('returns undefined for empty validation array with min=0', () => {
    expect(getOccurrenceErrorMessage(Occurrences.minmax(0, 3), [], t)).toBeUndefined();
  });

  it('returns minimum breach for empty validation array with min=1', () => {
    expect(getOccurrenceErrorMessage(Occurrences.minmax(1, 0), [], t)).toBe(
      'enonic.inputTypes.occurrence.breaksMin:1',
    );
  });
});

describe('findByPath', () => {
  const inputNode: InputValidationNode = {
    type: 'input',
    path: 'myInput',
    name: 'myInput',
    errors: [],
    optional: false,
  };

  const nestedInput: InputValidationNode = {
    type: 'input',
    path: 'fs.nested',
    name: 'nested',
    errors: [[{ message: 'bad' }]],
    optional: false,
  };

  const fieldSetNode: FieldSetValidationNode = {
    type: 'fieldset',
    path: 'fs',
    name: 'fs',
    children: [nestedInput],
    isValid: false,
  };

  const skippedNode: SkippedValidationNode = {
    type: 'skipped',
    path: 'skippedSet',
    name: 'skippedSet',
  };

  const result: FormValidationResult = {
    isValid: false,
    children: [inputNode, fieldSetNode, skippedNode],
  };

  it('finds InputValidationNode at root', () => {
    expect(findByPath(result, 'myInput')).toBe(inputNode);
  });

  it('finds nested Input inside FieldSet', () => {
    expect(findByPath(result, 'fs.nested')).toBe(nestedInput);
  });

  it('returns undefined for non-existent path', () => {
    expect(findByPath(result, 'nonExistent')).toBeUndefined();
  });

  it('finds FieldSet node itself', () => {
    expect(findByPath(result, 'fs')).toBe(fieldSetNode);
  });

  it('handles empty children', () => {
    const empty: FormValidationResult = { isValid: true, children: [] };

    expect(findByPath(empty, 'anything')).toBeUndefined();
  });

  it('finds SkippedValidationNode', () => {
    expect(findByPath(result, 'skippedSet')).toBe(skippedNode);
  });
});
