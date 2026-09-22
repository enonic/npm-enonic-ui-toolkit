import type {
  FormValidationNode,
  FormValidationResult,
} from '../descriptor/form-validation-result';
import type { OccurrenceValidationState } from '../descriptor/occurrence-manager';
import {
  type ResolvePhrase,
  resolveValidationMessage,
  type ValidationMessage,
  type ValidationResult,
} from '../descriptor/validation-result';
import type { Occurrences } from '../schema';

/** The first error's text, through the phrases. */
export function getFirstError(
  errors: readonly ValidationResult[],
  t: ResolvePhrase,
): string | undefined {
  const first = errors[0];
  return first === undefined ? undefined : resolveValidationMessage(first, t);
}

type OccurrenceBreach = 'none' | 'min' | 'max';

function getOccurrenceBreach(
  occurrences: Occurrences,
  validation: readonly OccurrenceValidationState[],
): OccurrenceBreach {
  if (validation.some((entry) => entry.validationResults.length > 0)) return 'none';
  const totalValid = validation.filter(
    (entry) => !entry.breaksRequired && entry.validationResults.length === 0,
  ).length;
  if (occurrences.minimumBreached(totalValid)) return 'min';
  if (occurrences.maximumBreached(totalValid)) return 'max';
  return 'none';
}

/**
 * The min/max breach of an input's occurrences, or `undefined` when a value has an error of its
 * own (which comes first) or the count is fine.
 */
export function getOccurrenceError(
  occurrences: Occurrences,
  validation: readonly OccurrenceValidationState[],
): ValidationMessage | undefined {
  const breach = getOccurrenceBreach(occurrences, validation);
  if (breach === 'none') return undefined;
  const min = occurrences.getMinimum();
  const max = occurrences.getMaximum();
  if (breach === 'min') {
    return min >= 1 && max !== 1
      ? { key: 'enonic.inputTypes.occurrence.breaksMin', values: [min] }
      : { key: 'enonic.inputTypes.validation.required' };
  }
  return max > 1
    ? { key: 'enonic.inputTypes.occurrence.breaksMaxMany', values: [max] }
    : { key: 'enonic.inputTypes.occurrence.breaksMaxOne' };
}

export function getOccurrenceErrorMessage(
  occurrences: Occurrences,
  validation: readonly OccurrenceValidationState[],
  t: ResolvePhrase,
): string | undefined {
  const error = getOccurrenceError(occurrences, validation);
  return error === undefined ? undefined : resolveValidationMessage(error, t);
}

export function hasOccurrenceError(
  occurrences: Occurrences,
  validation: readonly OccurrenceValidationState[],
): boolean {
  return getOccurrenceBreach(occurrences, validation) !== 'none';
}

function search(
  nodes: readonly FormValidationNode[],
  path: string,
): FormValidationNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.type === 'fieldset') {
      const found = search(node.children, path);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** A node by its form item path, through field sets. */
export function findByPath(
  result: FormValidationResult,
  path: string,
): FormValidationNode | undefined {
  return search(result.children, path);
}
