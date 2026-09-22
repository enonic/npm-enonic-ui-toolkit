import { useCallback, useMemo } from 'react';

import { PropertyArray, type PropertySet, Value, ValueTypes } from '../data';
import { usePropertyArray } from '../hooks/use-property-array';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { FormOptionSet } from '../schema';
import { useFormRender } from './form-render-context';

/** The string array on an option set occurrence naming its selected options. */
export const SELECTED_NAME = '_selected';

function ensureSelectedArray(occurrence: PropertySet): PropertyArray {
  const existing = occurrence.getPropertyArray(SELECTED_NAME);
  if (existing !== undefined) return existing;
  const created = PropertyArray.create()
    .setName(SELECTED_NAME)
    .setType(ValueTypes.STRING)
    .setParent(occurrence)
    .build();
  occurrence.addPropertyArray(created);
  return created;
}

function ensureOptionDataSet(occurrence: PropertySet, name: string): void {
  let optionArray = occurrence.getPropertyArray(name);
  if (optionArray === undefined) {
    optionArray = PropertyArray.create()
      .setName(name)
      .setType(ValueTypes.DATA)
      .setParent(occurrence)
      .build();
    occurrence.addPropertyArray(optionArray);
  }
  if (optionArray.getSize() === 0) {
    optionArray.addSet();
  }
}

function readSelectedNames(selectedArray: PropertyArray, schemaOptionNames: string[]): string[] {
  const out: string[] = [];
  const size = selectedArray.getSize();
  for (let i = 0; i < size; i++) {
    const name = selectedArray.get(i)?.getValue().getString();
    if (name != null && schemaOptionNames.includes(name)) out.push(name);
  }
  return out;
}

function writeRadioSelection(selectedArray: PropertyArray, name: string): void {
  const value = new Value(name, ValueTypes.STRING);
  const existing = selectedArray.get(0);
  if (existing !== undefined) {
    existing.setValue(value);
  } else {
    selectedArray.add(value);
  }
}

/** Appends and moves into alphabetical place: one add and one move, not a rewrite of the array. */
function insertMultiSelection(selectedArray: PropertyArray, name: string, current: string[]): void {
  if (current.includes(name)) return;
  const nextSorted = [...current, name].sort((a, b) => a.localeCompare(b));
  const targetIndex = nextSorted.indexOf(name);
  selectedArray.add(new Value(name, ValueTypes.STRING));
  const appendedIndex = selectedArray.getSize() - 1;
  if (appendedIndex !== targetIndex) {
    selectedArray.move(appendedIndex, targetIndex);
  }
}

function optionHasData(occurrence: PropertySet, name: string): boolean {
  const dataSet = occurrence.getPropertyArray(name)?.getSet(0);
  return dataSet !== undefined && !dataSet.isEmpty();
}

export type UseOptionSetSelectionResult = {
  selectedNames: string[];
  isSelected: (name: string) => boolean;
  select: (name: string) => void;
  deselect: (name: string) => void;
  toggle: (name: string) => void;
};

/**
 * The `_selected` array of an option set occurrence, read and written. A deselected option's
 * data stays until save — reselecting restores it — and the form's `notify` hears about it;
 * `pruneUnselectedOptionData` strips it from what is saved.
 */
export function useOptionSetSelection(
  optionSet: FormOptionSet,
  occurrence: PropertySet,
): UseOptionSetSelectionResult {
  const t = useInputTypesPhrases();
  const { notify } = useFormRender();
  const isRadio = optionSet.isRadioSelection();
  const schemaOptionNames = useMemo(
    () => optionSet.getOptions().map((o) => o.getName()),
    [optionSet],
  );
  const selectedArray = useMemo(() => ensureSelectedArray(occurrence), [occurrence]);
  const { values } = usePropertyArray(selectedArray);

  const selectedNames = useMemo(
    () =>
      values
        .map((v) => v.getString())
        .filter((n): n is string => n != null && schemaOptionNames.includes(n)),
    [values, schemaOptionNames],
  );

  const isSelected = useCallback((name: string) => selectedNames.includes(name), [selectedNames]);

  const warnIfOptionHasData = useCallback(
    (name: string) => {
      if (notify !== undefined && optionHasData(occurrence, name)) {
        notify(t('enonic.inputTypes.optionSet.dataCleared'));
      }
    },
    [notify, occurrence, t],
  );

  const select = useCallback(
    (name: string) => {
      ensureOptionDataSet(occurrence, name);
      if (isRadio) {
        for (const prev of selectedNames) {
          if (prev !== name) warnIfOptionHasData(prev);
        }
        writeRadioSelection(selectedArray, name);
      } else {
        insertMultiSelection(selectedArray, name, selectedNames);
      }
    },
    [isRadio, selectedArray, selectedNames, occurrence, warnIfOptionHasData],
  );

  const deselect = useCallback(
    (name: string) => {
      warnIfOptionHasData(name);
      const size = selectedArray.getSize();
      for (let i = 0; i < size; i++) {
        if (selectedArray.get(i)?.getValue().getString() === name) {
          selectedArray.remove(i);
          break;
        }
      }
    },
    [selectedArray, warnIfOptionHasData],
  );

  const toggle = useCallback(
    (name: string) => {
      if (selectedNames.includes(name)) {
        deselect(name);
      } else {
        select(name);
      }
    },
    [selectedNames, select, deselect],
  );

  return { selectedNames, isSelected, select, deselect, toggle };
}

/** Selects an option on an occurrence outside a render: what seeding and adding do. */
export function selectOptionInPropertySet(
  occurrence: PropertySet,
  optionSet: FormOptionSet,
  name: string,
): void {
  ensureOptionDataSet(occurrence, name);
  const selectedArray = ensureSelectedArray(occurrence);
  if (optionSet.isRadioSelection()) {
    writeRadioSelection(selectedArray, name);
    return;
  }
  const schemaOptionNames = optionSet.getOptions().map((o) => o.getName());
  insertMultiSelection(selectedArray, name, readSelectedNames(selectedArray, schemaOptionNames));
}

/**
 * Selects a fresh occurrence's default options. Does nothing once `_selected` exists, even
 * empty: its presence means the user has chosen, and the choice stands.
 */
export function seedOptionSetDefaults(optionSet: FormOptionSet, occurrence: PropertySet): void {
  if (occurrence.getPropertyArray(SELECTED_NAME) !== undefined) return;
  const options = optionSet.getOptions();
  if (options.length === 0) return;
  const defaults = options.filter((o) => o.isDefaultOption());
  if (optionSet.isRadioSelection()) {
    const first = defaults[0];
    if (first !== undefined) selectOptionInPropertySet(occurrence, optionSet, first.getName());
    return;
  }
  for (const option of defaults) {
    selectOptionInPropertySet(occurrence, optionSet, option.getName());
  }
}

function readSelected(set: PropertySet): Set<string> | undefined {
  const selectedArray = set.getPropertyArray(SELECTED_NAME);
  if (selectedArray === undefined || !selectedArray.getType().equals(ValueTypes.STRING)) {
    return undefined;
  }
  const names = new Set<string>();
  selectedArray.forEach((property) => {
    const name = property.getValue().getString();
    if (name != null) names.add(name);
  });
  return names;
}

/**
 * Removes the data of unselected options, at every depth, from what is about to be saved. An
 * occurrence is any set carrying a `_selected` string array.
 */
export function pruneUnselectedOptionData(set: PropertySet): void {
  const selected = readSelected(set);
  for (const array of set.getPropertyArrays()) {
    if (!array.getType().equals(ValueTypes.DATA)) continue;
    const name = array.getName();
    if (selected !== undefined && name !== SELECTED_NAME && !selected.has(name)) {
      set.removeProperty(name, 0);
      continue;
    }
    for (let i = 0; i < array.getSize(); i++) {
      const child = array.getSet(i);
      if (child !== undefined) pruneUnselectedOptionData(child);
    }
  }
}

export function isLockedSingleOccurrence(optionSet: FormOptionSet): boolean {
  const occurrences = optionSet.getOccurrences();
  return occurrences.getMinimum() === 1 && occurrences.getMaximum() === 1;
}

/**
 * Whether an option set occurrence has a body to show: always for checkboxes and for a locked
 * single radio; for a radio with a choice made, only when the chosen option has items.
 */
export function useOptionSetHasBody(optionSet: FormOptionSet, occurrence: PropertySet): boolean {
  const { selectedNames } = useOptionSetSelection(optionSet, occurrence);
  return useMemo(() => {
    if (!optionSet.isRadioSelection()) return true;
    if (isLockedSingleOccurrence(optionSet)) return true;
    if (selectedNames.length === 0) return true;
    return optionSet
      .getOptions()
      .some((o) => selectedNames.includes(o.getName()) && o.getFormItems().length > 0);
  }, [optionSet, selectedNames]);
}
