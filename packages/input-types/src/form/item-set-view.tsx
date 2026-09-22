import { Button } from '@enonic/ui';
import { Plus } from 'lucide-react';
import { type ReactElement, useCallback, useMemo, useRef } from 'react';

import { SortableList } from '../components/sortable-list';
import {
  useValidationVisibility,
  ValidationVisibilityProvider,
} from '../context/validation-visibility';
import type { PropertySet } from '../data';
import { usePropertySetArray } from '../hooks/use-property-set-array';
import { useSetOccurrenceManager } from '../hooks/use-set-occurrence-manager';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { FormItemSet } from '../schema';
import { FormItemRenderer } from './form-item-renderer';
import { useFormRender } from './form-render-context';
import { ItemSetOccurrenceView } from './item-set-occurrence-view';
import { useItemSetChildErrors, useSetChildShowErrors, useSetOccurrenceError } from './set-errors';
import { SetHeader } from './set-header';
import {
  usePropertySetKeys,
  useScrollPanelToOccurrence,
  useSetExpanded,
  useSetPropertyArray,
} from './set-hooks';
import { useClearSetServerErrors } from './use-clear-set-server-errors';

const ITEM_SET_VIEW_NAME = 'ItemSetView';

export type ItemSetViewProps = {
  itemSet: FormItemSet;
  propertySet: PropertySet;
};

/** An item set: a reorderable list of occurrences, each a set of the items, kept at the minimum. */
export const ItemSetView = ({ itemSet, propertySet }: ItemSetViewProps): ReactElement => {
  const t = useInputTypesPhrases();
  const name = itemSet.getName();
  const label = itemSet.getLabel();
  const helpText = itemSet.getHelpText();
  const occurrences = itemSet.getOccurrences();
  const formItems = useMemo(() => itemSet.getFormItems(), [itemSet]);
  const { enabled } = useFormRender();
  const validationVisibility = useValidationVisibility();
  const propertyArray = useSetPropertyArray(name, propertySet, occurrences);
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
  const { childShowErrors, childValidationVisibility } = useSetChildShowErrors(
    propertyArray,
    propertySets,
  );
  const childErrors = useItemSetChildErrors(formItems, propertySets);

  const addAt = useCallback(
    (index: number) => {
      if (!state.canAdd) return;
      lastAddedIndexRef.current = index;
      propertyArray.addSet();
      const last = propertyArray.getSize() - 1;
      if (index !== last) propertyArray.move(last, index);
      scheduleScrollTo(index);
      clearSetServerErrors();
    },
    [state.canAdd, propertyArray, scheduleScrollTo, clearSetServerErrors],
  );
  const handleAdd = useCallback(() => addAt(propertyArray.getSize()), [addAt, propertyArray]);
  const handleAddAbove = useCallback((index: number) => addAt(index), [addAt]);
  const handleAddBelow = useCallback((index: number) => addAt(index + 1), [addAt]);
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
    <div className="flex flex-col gap-3" data-component={ITEM_SET_VIEW_NAME}>
      <SetHeader
        label={label}
        description={helpText}
        isAllExpanded={isAllExpanded}
        showToggle={state.count > 1}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        occurrences={occurrences}
        occurrenceError={validationVisibility !== 'none' ? occurrenceError : undefined}
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
              <ItemSetOccurrenceView
                ref={(node: HTMLDivElement | null) => setOccurrenceRef(index, node)}
                index={index}
                grip={grip}
                propertySet={item}
                formItems={formItems}
                fallbackLabel={label}
                expanded={expanded.get(index) ?? false}
                isNew={index === lastAddedIndexRef.current}
                canAdd={enabled && state.canAdd}
                canRemove={enabled && state.canRemove}
                onAddAbove={handleAddAbove}
                onAddBelow={handleAddBelow}
                onRemove={handleRemove}
                onToggle={handleToggleSingle}
                occurrences={occurrences}
                hasErrors={
                  (childShowErrors.get(index) ?? false) && (childErrors.get(index) ?? false)
                }
              >
                {formItems.map((formItem) => (
                  <FormItemRenderer
                    key={formItem.getName()}
                    formItem={formItem}
                    propertySet={item}
                  />
                ))}
              </ItemSetOccurrenceView>
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
    </div>
  );
};
ItemSetView.displayName = ITEM_SET_VIEW_NAME;
