import { useEffect, useState } from 'react';

import {
  type Property,
  type PropertyArray,
  type PropertySet,
  type ValueType,
  ValueTypes,
} from '../data';
import type { FormItem, FormOptionSetOption, Input } from '../schema';
import { SELECTED_NAME } from './option-set-selection';

const ALLOWED_VALUE_TYPES: readonly ValueType[] = [
  ValueTypes.STRING,
  ValueTypes.DOUBLE,
  ValueTypes.LONG,
  ValueTypes.LOCAL_DATE,
  ValueTypes.LOCAL_TIME,
];

export type SetOccurrenceLabel = {
  primary: string;
  secondary?: string;
};

/**
 * What a collapsed occurrence is called: the first value inside it, or the set's label when it
 * has none; for an option set, the selected options with the first value under them. Follows
 * the occurrence's own events, so it reads what the user has typed.
 */
export function useSetOccurrenceLabel(
  propertySet: PropertySet,
  formItems: FormItem[],
  fallbackLabel: string,
): SetOccurrenceLabel {
  const [label, setLabel] = useState(() =>
    resolveSetOccurrenceLabel(propertySet, formItems, fallbackLabel),
  );

  useEffect(() => {
    const update = (): void =>
      setLabel(resolveSetOccurrenceLabel(propertySet, formItems, fallbackLabel));
    update();
    propertySet.onPropertyValueChanged(update);
    propertySet.onPropertyAdded(update);
    propertySet.onPropertyRemoved(update);
    return () => {
      propertySet.unPropertyValueChanged(update);
      propertySet.unPropertyAdded(update);
      propertySet.unPropertyRemoved(update);
    };
  }, [propertySet, formItems, fallbackLabel]);

  return label;
}

// The type first: `getString()` throws for a `DATA` value, and a selected option's data set is one.
function isAllowedValueAndType(property: Property): boolean {
  if (property.getValue().isNull()) return false;
  const propertyType = property.getType();
  if (!ALLOWED_VALUE_TYPES.some((vt) => vt.equals(propertyType))) return false;
  const text = property.getString() ?? '';
  if (ValueTypes.LOCAL_TIME.equals(propertyType) && text === '00:00') return false;
  return text.length > 0;
}

function sanitizeValue(value: string): string {
  return value
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

function getRadioButtonLabel(input: Input, selectedValue: string): string {
  const options = input.getInputTypeConfig()?.option ?? [];
  const selected = options.find((entry) => entry['@value'] === selectedValue);
  return typeof selected?.value === 'string' ? selected.value : '';
}

function getPropertyValue(property: Property, formItem: FormItem): string {
  const text = property.getString() ?? '';
  if (formItem.kind === 'input' && (formItem as Input).getInputType().getName() === 'RadioButton') {
    return getRadioButtonLabel(formItem as Input, text);
  }
  return text;
}

function findFormItem(property: Property, formItems: FormItem[]): FormItem | undefined {
  const propName = property.getName();
  for (const item of formItems) {
    if (item.getName() === propName) return item;
    const children = item.getFormItems();
    if (children.length > 0) {
      const found = findFormItem(property, children);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function fetchPropertyValues(
  propArray: PropertyArray,
  formItems: FormItem[],
  propValues: string[],
  firstOnly: boolean,
): void {
  propArray.some((property) => {
    const formItem = findFormItem(property, formItems);
    if (formItem === undefined) return false;

    if (isAllowedValueAndType(property)) {
      const value = sanitizeValue(getPropertyValue(property, formItem));
      if (value.length > 0) propValues.push(value);
    } else if (ValueTypes.DATA.equals(property.getType())) {
      const childSet = property.getPropertySet();
      childSet?.getPropertyArrays().some((childArray) => {
        if (childArray.getName() === SELECTED_NAME) return false;
        fetchPropertyValues(childArray, formItems, propValues, firstOnly);
        return firstOnly && propValues.length > 0;
      });
    }
    return firstOnly && propValues.length > 0;
  });
}

function readSelectedNames(propertySet: PropertySet): Set<string> | undefined {
  const selectedArray = propertySet.getPropertyArray(SELECTED_NAME);
  if (selectedArray === undefined) return undefined;
  const names = new Set<string>();
  selectedArray.forEach((property) => {
    const name = property.getValue().getString();
    if (name != null) names.add(name);
  });
  return names;
}

function getFirstPropertyValue(propertySet: PropertySet, formItems: FormItem[]): string {
  const formItemNames = formItems.map((fi) => fi.getName());
  const selectedNames = readSelectedNames(propertySet);
  const propArrays = propertySet
    .getPropertyArrays()
    .sort((a, b) => formItemNames.indexOf(a.getName()) - formItemNames.indexOf(b.getName()));

  const propValues: string[] = [];
  for (const propArray of propArrays) {
    const arrayName = propArray.getName();
    if (arrayName === SELECTED_NAME) continue;
    if (selectedNames !== undefined && !selectedNames.has(arrayName)) continue;
    fetchPropertyValues(propArray, formItems, propValues, true);
    if (propValues.length > 0) break;
  }
  return propValues.join(', ');
}

function getSelectedOptionsLabel(propertySet: PropertySet, formItems: FormItem[]): string {
  const selectedArray = propertySet.getPropertyArray(SELECTED_NAME);
  if (selectedArray === undefined || selectedArray.getSize() === 0) return '';
  const labels: string[] = [];
  selectedArray.forEach((property) => {
    const name = property.getValue().getString();
    if (name == null) return;
    const option = formItems.find((fi) => fi.getName() === name);
    if (option?.kind !== 'option') return;
    const label = (option as FormOptionSetOption).getLabel();
    if (label.length > 0) labels.push(label);
  });
  return labels.join(', ');
}

/** What `useSetOccurrenceLabel` reads off the occurrence, without the subscription. */
export function resolveSetOccurrenceLabel(
  propertySet: PropertySet,
  formItems: FormItem[],
  fallbackLabel: string,
): SetOccurrenceLabel {
  const isOptionSet = propertySet.getPropertyArray(SELECTED_NAME) !== undefined;
  const firstValue = getFirstPropertyValue(propertySet, formItems);
  if (!isOptionSet) {
    return { primary: firstValue || fallbackLabel };
  }
  const selectedOptions = getSelectedOptionsLabel(propertySet, formItems);
  return {
    primary: selectedOptions || fallbackLabel,
    secondary: selectedOptions ? firstValue : undefined,
  };
}
