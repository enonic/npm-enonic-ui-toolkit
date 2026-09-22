import { Button, cn, IconButton } from '@enonic/ui';
import { Plus, X } from 'lucide-react';
import { type ReactElement, type ReactNode, useCallback } from 'react';

import type { Value } from '../data';
import type { InputTypeConfig } from '../descriptor/input-type-config';
import type { OccurrenceManagerState } from '../descriptor/occurrence-manager';
import type { ValidationResult } from '../descriptor/validation-result';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { Input } from '../schema';
import type { InputTypeComponent } from '../types';
import { getFirstError, getOccurrenceError } from '../utils/validation';
import { FieldError } from './field-error';
import { InputLabel } from './input-label';
import { SortableGridList } from './sortable-grid-list';

export type OccurrenceListRootProps<C extends InputTypeConfig = InputTypeConfig> = {
  Component: InputTypeComponent<C>;
  state: OccurrenceManagerState;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onChange: (index: number, value: Value, rawValue?: string) => void;
  onBlur?: (index: number) => void;
  onFocus?: () => void;
  onMobileComplete?: (index: number, element: HTMLElement) => void;
  config: C;
  input: Input;
  enabled: boolean;
  /** Occurrences an external caller holds a processing lock on; they render read-only and busy. */
  processingOccurrenceIds?: ReadonlySet<string>;
  /** The `inputRef` callback per occurrence id, so the field can reveal and focus by id. */
  getInputRef?: (occurrenceId: string) => (el: HTMLElement | null) => void;
  /** The attention blink for one occurrence; the others get `undefined`. */
  highlight?: { occurrenceId: string; count: number };
};

type OccurrenceListItemContentProps<C extends InputTypeConfig = InputTypeConfig> = {
  Component: InputTypeComponent<C>;
  value: Value;
  rawValue?: string;
  index: number;
  config: C;
  input: Input;
  enabled: boolean;
  errors: OccurrenceManagerState['occurrenceValidation'][number];
  showRemove: boolean;
  processing: boolean;
  inputRef?: (el: HTMLElement | null) => void;
  highlight?: number;
  className?: string;
  onChange: (index: number, value: Value, rawValue?: string) => void;
  onBlur?: (index: number) => void;
  onFocus?: () => void;
  onMobileComplete?: (index: number, element: HTMLElement) => void;
  onRemove: (index: number) => void;
};

const OccurrenceListItemContent = <C extends InputTypeConfig = InputTypeConfig>({
  Component,
  value,
  rawValue,
  index,
  config,
  input,
  enabled,
  errors,
  showRemove,
  processing,
  inputRef,
  highlight,
  className,
  onChange,
  onBlur,
  onFocus,
  onMobileComplete,
  onRemove,
}: OccurrenceListItemContentProps<C>): ReactNode => {
  const t = useInputTypesPhrases();
  return (
    <>
      <div className={cn('min-w-0 flex-1', className)}>
        <Component
          value={value}
          rawValue={rawValue}
          onChange={(v: Value, raw?: string) => onChange(index, v, raw)}
          onBlur={onBlur ? () => onBlur(index) : undefined}
          onFocus={onFocus}
          onMobileComplete={
            onMobileComplete ? (element) => onMobileComplete(index, element) : undefined
          }
          config={config}
          input={input}
          enabled={enabled}
          index={index}
          errors={errors.validationResults}
          processing={processing}
          inputRef={inputRef}
          highlight={highlight}
        />
      </div>
      {showRemove && (
        <IconButton
          icon={X}
          iconSize="lg"
          variant="text"
          className="size-8"
          disabled={!enabled}
          aria-label={t('enonic.inputTypes.occurrence.remove')}
          onClick={() => onRemove(index)}
        />
      )}
    </>
  );
};

const OccurrenceListItem = <C extends InputTypeConfig = InputTypeConfig>({
  className,
  ...props
}: OccurrenceListItemContentProps<C>): ReactElement => (
  <div className={cn('flex items-center gap-2', props.showRemove && 'pr-2', className)}>
    <OccurrenceListItemContent {...props} />
  </div>
);

const OCCURRENCE_LIST_NAME = 'OccurrenceList';

/**
 * The occurrences of a `list`-mode input: one component per value, with the label above, the add
 * button below, a remove button per row when the minimum allows, and drag-to-reorder when the
 * input is multiple. A single-occurrence input renders its component bare.
 */
const OccurrenceListRoot = <C extends InputTypeConfig = InputTypeConfig>({
  Component,
  state,
  onAdd,
  onRemove,
  onMove,
  onChange,
  onBlur,
  onFocus,
  onMobileComplete,
  config,
  input,
  enabled,
  processingOccurrenceIds,
  getInputRef,
  highlight,
}: OccurrenceListRootProps<C>): ReactElement => {
  const isProcessing = (index: number): boolean => {
    const id = state.ids[index];
    return id !== undefined && (processingOccurrenceIds?.has(id) ?? false);
  };
  const occurrenceInputRef = (index: number): ((el: HTMLElement | null) => void) | undefined => {
    const id = state.ids[index];
    return id === undefined ? undefined : getInputRef?.(id);
  };
  const occurrenceHighlight = (index: number): number | undefined => {
    const id = state.ids[index];
    return highlight != null && id !== undefined && highlight.occurrenceId === id
      ? highlight.count
      : undefined;
  };
  const t = useInputTypesPhrases();
  const occurrences = input.getOccurrences();
  const min = occurrences.getMinimum();
  const max = occurrences.getMaximum();
  // Not multiple: a maximum of 1, required or not, renders one bare input with no add or remove.
  const isSingle = !occurrences.multiple();
  // Fixed: an exact count like 3:3 — no add, no remove, no drag.
  const isFixed = min > 0 && min === max && !isSingle;
  const isDraggable = occurrences.multiple() && !isFixed;
  const keyExtractor = useCallback((_: Value, i: number) => state.ids[i] ?? String(i), [state.ids]);

  if (isSingle) {
    // The minimum is filled eagerly, so the first value is there.
    const value = state.values[0];
    const errors = state.occurrenceValidation[0];
    if (value === undefined || errors === undefined)
      return <div data-component={OCCURRENCE_LIST_NAME} />;

    // An occurrence error and field errors are exclusive, so both go in one list the component
    // renders through its own error display.
    const occurrenceError = getOccurrenceError(occurrences, state.occurrenceValidation);
    const allErrors: ValidationResult[] =
      occurrenceError === undefined
        ? errors.validationResults
        : [...errors.validationResults, occurrenceError];

    return (
      <div data-component={OCCURRENCE_LIST_NAME} className="grid gap-y-2">
        <InputLabel input={input} />
        <Component
          value={value}
          rawValue={state.rawValues[0]}
          onChange={(v: Value, raw?: string) => onChange(0, v, raw)}
          onBlur={onBlur ? () => onBlur(0) : undefined}
          onFocus={onFocus}
          onMobileComplete={
            onMobileComplete ? (element) => onMobileComplete(0, element) : undefined
          }
          config={config}
          input={input}
          enabled={enabled}
          index={0}
          errors={allErrors}
          processing={isProcessing(0)}
          inputRef={occurrenceInputRef(0)}
          highlight={occurrenceHighlight(0)}
        />
      </div>
    );
  }

  const contentProps = (index: number): OccurrenceListItemContentProps<C> | undefined => {
    const value = state.values[index];
    const errors = state.occurrenceValidation[index];
    if (value === undefined || errors === undefined) return undefined;
    return {
      Component,
      value,
      rawValue: state.rawValues[index],
      index,
      config,
      input,
      enabled,
      errors,
      // The schema minimum says whether a remove is allowed; never removing the last visible
      // input is the policy on top of it.
      showRemove: state.canRemove && state.values.length > 1 && !isFixed,
      processing: isProcessing(index),
      inputRef: occurrenceInputRef(index),
      highlight: occurrenceHighlight(index),
      onChange,
      onBlur,
      onFocus,
      onMobileComplete,
      onRemove,
    };
  };

  const addButton = state.canAdd && !isFixed && (
    <Button
      variant="outline"
      size="sm"
      iconSize={16}
      iconStrokeWidth={1.75}
      endIcon={Plus}
      label={t('enonic.inputTypes.occurrence.add')}
      className="ml-auto w-fit"
      onClick={onAdd}
      disabled={!enabled}
    />
  );

  const occurrenceError = getOccurrenceError(occurrences, state.occurrenceValidation);
  const footer = (occurrenceError !== undefined || addButton) && (
    <div className="flex items-start gap-x-2">
      <FieldError className="flex-1" error={occurrenceError} />
      {addButton}
    </div>
  );

  if (isDraggable) {
    const showRemove = state.canRemove && state.values.length > 1;
    return (
      <div data-component={OCCURRENCE_LIST_NAME} className="grid gap-y-2">
        <InputLabel input={input} />
        <SortableGridList
          items={state.values}
          keyExtractor={keyExtractor}
          onMove={onMove}
          enabled={enabled}
          dragLabel={t('enonic.inputTypes.occurrence.reorder')}
          className="flex flex-col gap-y-2.5"
          itemClassName={({ isMovable }) =>
            cn(
              '-my-1 grid gap-2 py-1',
              isMovable
                ? 'grid-cols-[auto_minmax(0,1fr)_auto] pl-2'
                : 'grid-cols-[minmax(0,1fr)_auto]',
              showRemove && 'pr-2',
            )
          }
          renderItem={({ index, isMovable }) => {
            const props = contentProps(index);
            if (props === undefined) return null;
            const fieldError = props.processing
              ? undefined
              : getFirstError(props.errors.validationResults, t);
            return (
              <>
                <OccurrenceListItemContent
                  {...props}
                  errors={{ ...props.errors, validationResults: [] }}
                  className={cn(
                    isMovable ? 'col-start-2' : 'col-start-1',
                    !showRemove && 'col-span-2',
                  )}
                />
                <FieldError
                  className={cn(
                    'min-w-0',
                    isMovable ? 'col-span-2 col-start-2' : 'col-span-2 col-start-1',
                  )}
                  message={fieldError}
                />
              </>
            );
          }}
        />
        {footer}
      </div>
    );
  }

  return (
    <div data-component={OCCURRENCE_LIST_NAME} className="grid gap-y-2">
      <InputLabel input={input} />
      <div className="flex flex-col gap-y-2.5">
        {state.values.map((_, i) => {
          const props = contentProps(i);
          return props === undefined ? null : <OccurrenceListItem key={state.ids[i]} {...props} />;
        })}
      </div>
      {footer}
    </div>
  );
};
OccurrenceListRoot.displayName = OCCURRENCE_LIST_NAME;

export const OccurrenceList = Object.assign(OccurrenceListRoot, {
  Root: OccurrenceListRoot,
});
