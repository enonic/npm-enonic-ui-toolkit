import { type PropertySet, PropertyPath, PropertyPathElement } from '../data';
import { inputTypeRegistry, type InputTypeRegistry } from '../registry';
import type { FieldSet, Form, FormItem, FormItemSet, FormOptionSet, Input } from '../schema';
import { bucketServerErrorsByOccurrence, mergeServerErrors } from '../utils/server-errors';
import type {
  FieldSetValidationNode,
  FormValidationNode,
  FormValidationResult,
  InputValidationNode,
  ItemSetValidationNode,
  OptionSetValidationNode,
  SkippedValidationNode,
} from './form-validation-result';
import type { OccurrenceValidationState } from './occurrence-manager';
import type { ValidationMessage, ValidationResult } from './validation-result';

/** Per input name, what the user typed for each occurrence, where it did not parse. */
export type RawValueMap = Map<string, (string | undefined)[]>;

export type ServerError = { readonly path: string; readonly message: string };

export type ValidateFormOptions = {
  rawValues?: RawValueMap;
  /** The server's errors, by data path, merged into the input they belong to. */
  serverErrors?: readonly ServerError[];
  /** The registry the form's input types were registered in; the shared one by default. */
  registry?: InputTypeRegistry;
};

const SELECTED = '_selected';

function stripLeadingDot(path: string): string {
  return path.startsWith('.') ? path.slice(1) : path;
}

function isNodeValid(node: FormValidationNode): boolean {
  switch (node.type) {
    case 'skipped':
      return true;
    case 'input':
      if (node.occurrenceError != null) return false;
      if (node.optional)
        return !node.errors.some((occurrence) => occurrence.some((error) => error.server));
      return node.errors.every((occurrence) => occurrence.length === 0);
    case 'fieldset':
      return node.isValid !== false;
    case 'itemset':
      return node.occurrenceError == null && node.occurrences.every((o) => o.isValid !== false);
    case 'optionset':
      return (
        node.occurrenceError == null &&
        node.occurrences.every((o) => o.multiselectionError == null && o.isValid !== false)
      );
  }
}

function setOccurrenceError(
  item: FormItemSet | FormOptionSet,
  validCount: number,
): ValidationMessage | undefined {
  const occurrences = item.getOccurrences();
  if (occurrences.minimumBreached(validCount)) {
    return { key: 'enonic.inputTypes.set.breaksMin', values: [occurrences.getMinimum()] };
  }
  if (occurrences.maximumBreached(validCount)) {
    return { key: 'enonic.inputTypes.set.breaksMax', values: [occurrences.getMaximum()] };
  }
  return undefined;
}

function validateInput(
  input: Input,
  propertySet: PropertySet,
  options?: ValidateFormOptions,
): InputValidationNode {
  const name = input.getName();
  const path = input.getPath().toString();
  const registry = options?.registry ?? inputTypeRegistry;
  const definition = registry.getDefinition(input.getInputType().getName());
  const occurrences = input.getOccurrences();
  const optional = occurrences.getMinimum() === 0;

  if (definition === undefined) {
    return { type: 'input', path, name, errors: [], optional };
  }

  const descriptor = definition.descriptor;
  const config = descriptor.readConfig(input.getInputTypeConfig() ?? {});
  const propertyArray = propertySet.getPropertyArray(name);
  const size = propertyArray?.getSize() ?? 0;
  const rawValues = options?.rawValues?.get(name);

  const occurrenceValidation: OccurrenceValidationState[] = [];
  const errors: ValidationResult[][] = [];
  for (let i = 0; i < Math.max(size, 1); i++) {
    const value = propertyArray?.getValue(i) ?? descriptor.getValueType().newNullValue();
    const validationResults = descriptor.validate(value, config, rawValues?.[i]);
    occurrenceValidation.push({
      index: i,
      breaksRequired: descriptor.valueBreaksRequired(value),
      validationResults,
    });
    errors.push(validationResults);
  }

  const serverErrors = options?.serverErrors;
  if (serverErrors !== undefined && serverErrors.length > 0) {
    const dataPath = stripLeadingDot(
      PropertyPath.fromParent(
        propertySet.getPropertyPath(),
        new PropertyPathElement(name, 0),
      ).toString(),
    );
    const byOccurrence = bucketServerErrorsByOccurrence(serverErrors, dataPath);
    mergeServerErrors(occurrenceValidation, byOccurrence).forEach((entry, index) => {
      errors[index] = entry.validationResults;
    });
  }

  const totalValid = occurrenceValidation.filter(
    (ov) => !ov.breaksRequired && ov.validationResults.length === 0,
  ).length;
  const hasFieldErrors = occurrenceValidation.some((ov) => ov.validationResults.length > 0);

  let occurrenceError: ValidationMessage | undefined;
  if (!hasFieldErrors) {
    const min = occurrences.getMinimum();
    const max = occurrences.getMaximum();
    if (occurrences.minimumBreached(totalValid)) {
      occurrenceError =
        min >= 1 && max !== 1
          ? { key: 'enonic.inputTypes.occurrence.breaksMin', values: [min] }
          : { key: 'enonic.inputTypes.validation.required' };
    } else if (occurrences.maximumBreached(totalValid)) {
      occurrenceError =
        max > 1
          ? { key: 'enonic.inputTypes.occurrence.breaksMaxMany', values: [max] }
          : { key: 'enonic.inputTypes.occurrence.breaksMaxOne' };
    }
  }

  return { type: 'input', path, name, errors, occurrenceError, optional };
}

function safePath(item: FormItem): string {
  return item.getName().length === 0 ? '' : item.getPath().toString();
}

function validateFieldSet(
  fieldSet: FieldSet,
  propertySet: PropertySet,
  options?: ValidateFormOptions,
): FieldSetValidationNode {
  const children = validateFormItems(fieldSet.getFormItems(), propertySet, options);
  return {
    type: 'fieldset',
    path: safePath(fieldSet),
    name: fieldSet.getName(),
    children,
    isValid: children.every(isNodeValid),
  };
}

function validateItemSet(
  itemSet: FormItemSet,
  propertySet: PropertySet,
  options?: ValidateFormOptions,
): ItemSetValidationNode {
  const name = itemSet.getName();
  const array = propertySet.getPropertyArray(name);
  const size = array?.getSize() ?? 0;

  // Raw values are keyed by input name and collide for nested inputs of one name; the consumer
  // scopes them per occurrence when that matters.
  const occurrences: ItemSetValidationNode['occurrences'] = [];
  for (let i = 0; i < size; i++) {
    const occurrenceSet = array?.getSet(i) ?? propertySet.newSet();
    const children = validateFormItems(itemSet.getFormItems(), occurrenceSet, options);
    occurrences.push({ children, isValid: children.every(isNodeValid) });
  }

  const validCount = occurrences.filter((o) => o.isValid !== false).length;
  return {
    type: 'itemset',
    path: safePath(itemSet),
    name,
    occurrenceError: setOccurrenceError(itemSet, validCount),
    occurrences,
  };
}

function validateOptionSet(
  optionSet: FormOptionSet,
  propertySet: PropertySet,
  options?: ValidateFormOptions,
): OptionSetValidationNode {
  const name = optionSet.getName();
  const array = propertySet.getPropertyArray(name);
  const size = array?.getSize() ?? 0;
  const multiselection = optionSet.getMultiselection();
  const optionNames = optionSet.getOptions().map((option) => option.getName());

  const occurrences: OptionSetValidationNode['occurrences'] = [];
  for (let i = 0; i < size; i++) {
    const occurrenceSet = array?.getSet(i);
    if (occurrenceSet === undefined) {
      occurrences.push({ children: [], isValid: true });
      continue;
    }

    const selectedNames = (occurrenceSet.getPropertyArray(SELECTED)?.getProperties() ?? [])
      .map((property) => property.getString())
      .filter(
        (selected): selected is string => selected !== undefined && optionNames.includes(selected),
      );

    let multiselectionError: ValidationMessage | undefined;
    if (multiselection.minimumBreached(selectedNames.length)) {
      multiselectionError = {
        key: 'enonic.inputTypes.optionSet.selectionBreaksMin',
        values: [multiselection.getMinimum()],
      };
    } else if (multiselection.maximumBreached(selectedNames.length)) {
      multiselectionError = {
        key: 'enonic.inputTypes.optionSet.selectionBreaksMax',
        values: [multiselection.getMaximum()],
      };
    }

    const children: FormValidationNode[] = [];
    for (const selectedName of selectedNames) {
      const option = optionSet
        .getOptions()
        .find((candidate) => candidate.getName() === selectedName);
      if (option === undefined || option.getFormItems().length === 0) continue;
      const optionDataSet =
        occurrenceSet.getPropertyArray(selectedName)?.getSet(0) ?? occurrenceSet.newSet();
      children.push(...validateFormItems(option.getFormItems(), optionDataSet, options));
    }

    occurrences.push({
      children,
      multiselectionError,
      isValid: multiselectionError == null && children.every(isNodeValid),
    });
  }

  const validCount = occurrences.filter((o) => o.isValid !== false).length;
  return {
    type: 'optionset',
    path: safePath(optionSet),
    name,
    occurrenceError: setOccurrenceError(optionSet, validCount),
    occurrences,
  };
}

function validateFormItems(
  items: readonly FormItem[],
  propertySet: PropertySet,
  options?: ValidateFormOptions,
): FormValidationNode[] {
  return items.map((item): FormValidationNode => {
    switch (item.kind) {
      case 'input':
        return validateInput(item as Input, propertySet, options);
      case 'fieldset':
        return validateFieldSet(item as FieldSet, propertySet, options);
      case 'itemset':
        return validateItemSet(item as FormItemSet, propertySet, options);
      case 'optionset':
        return validateOptionSet(item as FormOptionSet, propertySet, options);
      default:
        return {
          type: 'skipped',
          path: safePath(item),
          name: item.getName(),
        } satisfies SkippedValidationNode;
    }
  });
}

/**
 * The whole form against its data: every input through its descriptor, every set occurrence by
 * occurrence. An input type the registry does not know validates as fine.
 */
export function validateForm(
  form: Form,
  propertySet: PropertySet,
  options?: ValidateFormOptions,
): FormValidationResult {
  const children = validateFormItems(form.getFormItems(), propertySet, options);
  return { isValid: children.every(isNodeValid), children };
}

/** Only whether some items are valid, when no `Form` and no tree of results is wanted. */
export function validateFormItemsValid(
  items: readonly FormItem[],
  propertySet: PropertySet,
  options?: ValidateFormOptions,
): boolean {
  return validateFormItems(items, propertySet, options).every(isNodeValid);
}
