import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useValidationVisibility,
  type ValidationVisibility,
} from '../context/validation-visibility';
import type {
  PropertyAddedEvent,
  PropertyArray,
  PropertySet,
  PropertyValueChangedEvent,
} from '../data';
import type { SetOccurrenceManagerState } from '../descriptor/set-occurrence-manager';
import { validateFormItemsValid } from '../descriptor/validate-form';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { FormItem, FormOptionSet, Occurrences } from '../schema';
import { SELECTED_NAME } from './option-set-selection';

const EMPTY = new Map<number, boolean>();

/** The min/max breach of a set's occurrence count as text, or `undefined` when within bounds. */
export function useSetOccurrenceError(
  occurrences: Occurrences,
  state: SetOccurrenceManagerState,
): string | undefined {
  const t = useInputTypesPhrases();
  return useMemo(() => {
    const min = occurrences.getMinimum();
    const max = occurrences.getMaximum();
    if (state.isMinimumBreached) {
      return min === 1
        ? t('enonic.inputTypes.validation.required')
        : t('enonic.inputTypes.occurrence.breaksMin', min);
    }
    if (state.isMaximumBreached) {
      return max === 1
        ? t('enonic.inputTypes.occurrence.breaksMaxOne')
        : t('enonic.inputTypes.occurrence.breaksMaxMany', max);
    }
    return undefined;
  }, [state.isMinimumBreached, state.isMaximumBreached, occurrences, t]);
}

/** The min/max breach of an occurrence's selection as text, once errors are to be shown. */
export function useOptionSetMultiselectionError(
  optionSet: FormOptionSet,
  showErrors: boolean,
  selectedNames: string[],
): string | undefined {
  const t = useInputTypesPhrases();
  const multiselection = optionSet.getMultiselection();
  return useMemo(() => {
    if (!showErrors) return undefined;
    const count = selectedNames.length;
    const min = multiselection.getMinimum();
    const max = multiselection.getMaximum();
    if (multiselection.minimumBreached(count)) {
      return min === 1
        ? t('enonic.inputTypes.optionSet.selectionBreaksMinOne')
        : t('enonic.inputTypes.optionSet.selectionBreaksMin', min);
    }
    if (multiselection.maximumBreached(count)) {
      return max === 1
        ? t('enonic.inputTypes.optionSet.selectionBreaksMaxOne')
        : t('enonic.inputTypes.optionSet.selectionBreaksMax', max);
    }
    return undefined;
  }, [showErrors, selectedNames, multiselection, t]);
}

function useOccurrenceChangeTick(propertySets: PropertySet[]): number {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (propertySets.length === 0) return undefined;
    for (const set of propertySets) set.onChanged(bump);
    return () => {
      for (const set of propertySets) set.unChanged(bump);
    };
  }, [bump, propertySets]);

  return tick;
}

/** Whether each item set occurrence has an invalid item, for the badge on a collapsed one. */
export function useItemSetChildErrors(
  formItems: FormItem[],
  propertySets: PropertySet[],
): Map<number, boolean> {
  const tick = useOccurrenceChangeTick(propertySets);
  // biome-ignore lint/correctness/useExhaustiveDependencies: tick re-reads the tree
  return useMemo(() => {
    if (propertySets.length === 0) return EMPTY;
    const next = new Map<number, boolean>();
    propertySets.forEach((set, i) => next.set(i, !validateFormItemsValid(formItems, set)));
    return next;
  }, [formItems, propertySets, tick]);
}

function hasOptionSetOccurrenceError(optionSet: FormOptionSet, occurrence: PropertySet): boolean {
  const multiselection = optionSet.getMultiselection();
  const schemaOptionNames = optionSet.getOptions().map((o) => o.getName());
  const selectedNames =
    occurrence
      .getPropertyArray(SELECTED_NAME)
      ?.getProperties()
      .map((p) => p.getValue().getString())
      .filter((n): n is string => n != null && schemaOptionNames.includes(n)) ?? [];

  if (multiselection.minimumBreached(selectedNames.length)) return true;
  if (multiselection.maximumBreached(selectedNames.length)) return true;

  for (const selectedName of selectedNames) {
    const option = optionSet.getOptions().find((o) => o.getName() === selectedName);
    if (option === undefined || option.getFormItems().length === 0) continue;
    const optionDataSet = occurrence.getPropertyArray(selectedName)?.getSet(0);
    if (optionDataSet === undefined) return true;
    if (!validateFormItemsValid(option.getFormItems(), optionDataSet)) return true;
  }
  return false;
}

/** Whether each option set occurrence breaks its selection or holds an invalid item. */
export function useOptionSetChildErrors(
  optionSet: FormOptionSet,
  propertySets: PropertySet[],
): Map<number, boolean> {
  const tick = useOccurrenceChangeTick(propertySets);
  // biome-ignore lint/correctness/useExhaustiveDependencies: tick re-reads the tree
  return useMemo(() => {
    if (propertySets.length === 0) return EMPTY;
    const next = new Map<number, boolean>();
    propertySets.forEach((set, i) => next.set(i, hasOptionSetOccurrenceError(optionSet, set)));
    return next;
  }, [optionSet, propertySets, tick]);
}

type OccurrenceInteraction = {
  interacted: boolean;
  validationVisibility: ValidationVisibility;
};

export type UseSetChildShowErrorsResult = {
  childValidationVisibility: Map<number, ValidationVisibility>;
  childShowErrors: Map<number, boolean>;
  setInteracted: boolean;
};

/**
 * Per-occurrence error visibility: an occurrence added during the session shows nothing until
 * the user edits it, whatever the form-wide visibility says, since the form's setting is not
 * per occurrence.
 */
export function useSetChildShowErrors(
  propertyArray: PropertyArray,
  propertySets: PropertySet[],
): UseSetChildShowErrorsResult {
  const validationVisibility = useValidationVisibility();
  const [tick, setTick] = useState(0);
  const [setInteracted, setSetInteracted] = useState(false);
  const occurrenceInteractions = useMemo(
    () => new WeakMap<PropertySet, OccurrenceInteraction>(),
    [],
  );

  const getOrInit = useCallback(
    (set: PropertySet, defaultVisibility: ValidationVisibility): OccurrenceInteraction => {
      const existing = occurrenceInteractions.get(set);
      if (existing !== undefined) return existing;
      const fresh: OccurrenceInteraction = {
        interacted: false,
        validationVisibility: defaultVisibility,
      };
      occurrenceInteractions.set(set, fresh);
      return fresh;
    },
    [occurrenceInteractions],
  );

  useEffect(() => {
    propertySets.forEach((set) => getOrInit(set, validationVisibility));
  }, [propertySets, validationVisibility, getOrInit]);

  useEffect(() => {
    // Registers after `useSetPropertyArray` has seeded the minimum: the seed's synchronous adds
    // are not user interaction and must not count as one.
    const addHandler = (event: PropertyAddedEvent): void => {
      const property = event.getProperty();
      if (
        property.getParent() !== propertyArray.getParent() ||
        property.getName() !== propertyArray.getName()
      ) {
        return;
      }
      const set = property.getPropertySet();
      if (set === undefined) return;
      occurrenceInteractions.set(set, { interacted: false, validationVisibility: 'none' });
      setSetInteracted(true);
      setTick((t) => t + 1);
    };

    const valueChangedHandler = (event: PropertyValueChangedEvent): void => {
      // An edit inside nested option data sits levels below the occurrence: walk up to it.
      let set: PropertySet | undefined = event.getProperty().getParent();
      while (set !== undefined) {
        const container = set.getProperty();
        if (container === undefined) return;
        if (
          container.getName() === propertyArray.getName() &&
          container.getParent() === propertyArray.getParent()
        ) {
          break;
        }
        set = container.getParent();
      }
      if (set === undefined) return;
      const current = getOrInit(set, validationVisibility);
      const nextVisibility: ValidationVisibility =
        current.validationVisibility === 'none' ? 'all' : current.validationVisibility;
      occurrenceInteractions.set(set, { interacted: true, validationVisibility: nextVisibility });
      setTick((t) => t + 1);
    };

    propertyArray.onPropertyAdded(addHandler);
    propertyArray.onPropertyValueChanged(valueChangedHandler);
    return () => {
      propertyArray.unPropertyAdded(addHandler);
      propertyArray.unPropertyValueChanged(valueChangedHandler);
    };
  }, [propertyArray, validationVisibility, occurrenceInteractions, getOrInit]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick re-reads the interactions
  const childValidationVisibility = useMemo(() => {
    const map = new Map<number, ValidationVisibility>();
    propertySets.forEach((set, index) => {
      map.set(index, getOrInit(set, validationVisibility).validationVisibility);
    });
    return map;
  }, [propertySets, tick, validationVisibility, getOrInit]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick re-reads the interactions
  const childShowErrors = useMemo(() => {
    const map = new Map<number, boolean>();
    propertySets.forEach((set, index) => {
      const { interacted, validationVisibility: vv } = getOrInit(set, validationVisibility);
      map.set(index, vv === 'all' || (vv === 'interactive' && interacted));
    });
    return map;
  }, [propertySets, tick, validationVisibility, getOrInit]);

  return { childValidationVisibility, childShowErrors, setInteracted };
}
