import { Button } from '@enonic/ui';
import { Plus } from 'lucide-react';
import { type ReactElement, useCallback, useMemo, useRef, useState } from 'react';

import { SortableList } from '../components/sortable-list';
import {
  useValidationVisibility,
  ValidationVisibilityProvider,
} from '../context/validation-visibility';
import type { PropertySet } from '../data';
import { usePropertySetArray } from '../hooks/use-property-set-array';
import { useSetOccurrenceManager } from '../hooks/use-set-occurrence-manager';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { FormOptionSet } from '../schema';
import { useFormRender } from './form-render-context';
import { OptionSetOccurrenceBody } from './option-set-occurrence-body';
import { OptionSetOccurrenceView } from './option-set-occurrence-view';
import {
  isLockedSingleOccurrence,
  SELECTED_NAME,
  seedOptionSetDefaults,
  selectOptionInPropertySet,
} from './option-set-selection';
import { OptionSetConfirmAdd, SetConfirmOverlay, useConfirmPosition } from './set-confirmation';
import {
  useOptionSetChildErrors,
  useSetChildShowErrors,
  useSetOccurrenceError,
} from './set-errors';
import { SetHeader } from './set-header';
import {
  usePropertySetKeys,
  useScrollPanelToOccurrence,
  useSetExpanded,
  useSetPropertyArray,
} from './set-hooks';
import { useClearSetServerErrors } from './use-clear-set-server-errors';

const OPTION_SET_VIEW_NAME = 'OptionSetView';

export type OptionSetViewProps = {
  optionSet: FormOptionSet;
  propertySet: PropertySet;
};

/**
 * An option set: occurrences of a choice among options, each with the chosen options' items.
 * A radio set is not filled to its minimum unless locked to one occurrence: a choice must be
 * made first, and adding asks for it.
 */
export const OptionSetView = ({ optionSet, propertySet }: OptionSetViewProps): ReactElement => {
  const t = useInputTypesPhrases();
  const name = optionSet.getName();
  const label = optionSet.getLabel();
  const helpText = optionSet.getHelpText();
  const occurrences = optionSet.getOccurrences();

  const anchorRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const [confirmingAdd, setConfirmingAdd] = useState(false);
  const confirmationPosition = useConfirmPosition({
    enabled: confirmingAdd,
    anchorRef,
    confirmationRef,
  });

  const formItems = useMemo(() => optionSet.getFormItems(), [optionSet]);
  const { enabled } = useFormRender();
  const validationVisibility = useValidationVisibility();
  const seedDefaults = useCallback(
    (occurrence: PropertySet) => seedOptionSetDefaults(optionSet, occurrence),
    [optionSet],
  );
  const isRadio = optionSet.isRadioSelection();
  const propertyArray = useSetPropertyArray(name, propertySet, occurrences, {
    onCreateOccurrence: seedDefaults,
    seedMin: !isRadio || isLockedSingleOccurrence(optionSet),
  });
  const { propertySets } = usePropertySetArray(propertyArray);
  const propertySetKeys = usePropertySetKeys(propertySets);
  const { state, remove, move } = useSetOccurrenceManager(occurrences, propertySets);
  const { setOccurrenceRef, scheduleScrollTo } = useScrollPanelToOccurrence(propertySets);
  const clearSetServerErrors = useClearSetServerErrors(propertySet, name);
  const lastAddedIndexRef = useRef<number | undefined>(undefined);
  const {
    expanded,
    isAllExpanded,
    handleExpandAll,
    handleCollapseAll,
    handleDragStart,
    handleToggleSingle,
  } = useSetExpanded(propertyArray, state.count);

  const occurrenceError = useSetOccurrenceError(occurrences, state);
  const { childShowErrors, childValidationVisibility, setInteracted } = useSetChildShowErrors(
    propertyArray,
    propertySets,
  );
  const childErrors = useOptionSetChildErrors(optionSet, propertySets);

  const addAt = useCallback(
    (index: number, selectedName?: string) => {
      if (!state.canAdd) return;
      lastAddedIndexRef.current = index;
      const occurrence = propertyArray.addSet();
      const last = propertyArray.getSize() - 1;
      if (index !== last) propertyArray.move(last, index);
      if (selectedName !== undefined) {
        selectOptionInPropertySet(occurrence, optionSet, selectedName);
      } else {
        seedDefaults(occurrence);
      }
      scheduleScrollTo(index);
      clearSetServerErrors();
    },
    [state.canAdd, propertyArray, optionSet, seedDefaults, scheduleScrollTo, clearSetServerErrors],
  );
  const handleAdd = useCallback(() => {
    if (!state.canAdd) return;
    if (isRadio) setConfirmingAdd(true);
    else addAt(propertyArray.getSize());
  }, [isRadio, state.canAdd, addAt, propertyArray]);
  const handleConfirmAdd = useCallback(
    (selectedName: string) => {
      setConfirmingAdd(false);
      addAt(propertyArray.getSize(), selectedName);
    },
    [addAt, propertyArray],
  );
  const handleCancelAdd = useCallback(() => setConfirmingAdd(false), []);
  const handleAddAbove = useCallback(
    (index: number, selectedName?: string) => addAt(index, selectedName),
    [addAt],
  );
  const handleAddBelow = useCallback(
    (index: number, selectedName?: string) => addAt(index + 1, selectedName),
    [addAt],
  );
  const handleRemove = useCallback(
    (index: number) => {
      if (!state.canRemove) return;
      if (remove(index)) {
        propertyArray.remove(index);
        clearSetServerErrors();
      }
    },
    [state.canRemove, remove, propertyArray, clearSetServerErrors],
  );
  const handleReset = useCallback(
    (index: number) => {
      const occurrence = propertySets[index];
      if (occurrence === undefined) return;
      const selected = occurrence.getPropertyArray(SELECTED_NAME);
      if (selected !== undefined) {
        for (let i = selected.getSize() - 1; i >= 0; i--) selected.remove(i);
      }
      for (const option of optionSet.getOptions()) {
        occurrence.removeProperty(option.getName(), 0);
      }
      clearSetServerErrors();
    },
    [propertySets, optionSet, clearSetServerErrors],
  );
  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (move(fromIndex, toIndex)) {
        propertyArray.move(fromIndex, toIndex);
        clearSetServerErrors();
      }
    },
    [move, propertyArray, clearSetServerErrors],
  );

  return (
    <div
      className="flex flex-col gap-3"
      data-component={OPTION_SET_VIEW_NAME}
      data-confirming={confirmingAdd}
    >
      {confirmingAdd && <SetConfirmOverlay />}
      {confirmingAdd && (
        <OptionSetConfirmAdd
          ref={confirmationRef}
          position={confirmationPosition}
          optionSet={optionSet}
          onCancel={handleCancelAdd}
          onConfirm={handleConfirmAdd}
        />
      )}
      <SetHeader
        label={label}
        showToggle={state.count > 1}
        description={helpText}
        isAllExpanded={isAllExpanded}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        occurrences={occurrences}
        occurrenceError={
          validationVisibility === 'all' || setInteracted ? occurrenceError : undefined
        }
      />
      {state.count > 0 && (
        <SortableList
          items={propertySets}
          keyExtractor={(_: PropertySet, i: number) => propertySetKeys[i] ?? String(i)}
          onMove={handleMove}
          enabled={enabled && state.count > 1}
          dragLabel={t('enonic.inputTypes.occurrence.reorder')}
          className="flex flex-col gap-2.5"
          onDragStart={handleDragStart}
          controlGrip
          renderItem={({ item, index }, grip) => (
            <ValidationVisibilityProvider
              visibility={childValidationVisibility.get(index) ?? validationVisibility}
            >
              <OptionSetOccurrenceView
                ref={(node: HTMLDivElement | null) => setOccurrenceRef(index, node)}
                index={index}
                grip={grip}
                propertySet={item}
                optionSet={optionSet}
                formItems={formItems}
                fallbackLabel={label}
                expanded={expanded.get(index) ?? false}
                isNew={index === lastAddedIndexRef.current}
                canAdd={enabled && state.canAdd}
                canRemove={enabled && state.canRemove}
                onAddAbove={handleAddAbove}
                onAddBelow={handleAddBelow}
                onRemove={handleRemove}
                onReset={isRadio && !state.canRemove ? handleReset : undefined}
                onToggle={handleToggleSingle}
                hasErrors={(childShowErrors.get(index) ?? false) && childErrors.get(index) === true}
              >
                <OptionSetOccurrenceBody
                  optionSet={optionSet}
                  occurrence={item}
                  enabled={enabled}
                />
              </OptionSetOccurrenceView>
            </ValidationVisibilityProvider>
          )}
        />
      )}
      {enabled && state.canAdd && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            label={t('enonic.inputTypes.set.add')}
            endIcon={Plus}
            onClick={handleAdd}
          />
        </div>
      )}
      <div ref={anchorRef} className="h-0 w-full" />
    </div>
  );
};
OptionSetView.displayName = OPTION_SET_VIEW_NAME;
