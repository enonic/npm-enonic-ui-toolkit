import { cn, Combobox, FilledSquareCheck, IconButton, Listbox } from '@enonic/ui';
import { Square, X } from 'lucide-react';
import { type ReactElement, useCallback, useMemo, useState } from 'react';

import { useValidationVisibility } from '../context/validation-visibility';
import { type Value, ValueTypes } from '../data';
import type { ComboBoxConfig } from '../descriptor/input-type-config';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import type { SelfManagedComponentProps } from '../types';
import { getFirstError, getOccurrenceErrorMessage } from '../utils/validation';
import { FieldError } from './field-error';
import { SortableGridList } from './sortable-grid-list';

const COMBO_BOX_INPUT_NAME = 'ComboBoxInput';

export type ComboBoxInputProps = SelfManagedComponentProps<ComboBoxConfig>;

export const ComboBoxInput = ({
  values,
  onAdd,
  onRemove,
  onMove,
  occurrences,
  config,
  enabled,
  errors,
}: ComboBoxInputProps): ReactElement => {
  const t = useInputTypesPhrases();
  const visibility = useValidationVisibility();
  const [searchValue, setSearchValue] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const selectedStrings = useMemo(
    () => values.filter((v) => !v.isNull()).map((v) => v.getString() ?? ''),
    [values],
  );
  const selectedSet = useMemo(() => new Set(selectedStrings), [selectedStrings]);
  const optionMap = useMemo(
    () => new Map(config.options.map((o) => [o.value, o])),
    [config.options],
  );

  const filteredOptions = useMemo(() => {
    if (!searchValue) return config.options;
    const query = searchValue.toLowerCase();
    return config.options.filter(
      (o) => o.label.toLowerCase().includes(query) || o.value.toLowerCase().includes(query),
    );
  }, [config.options, searchValue]);

  const isMultiSelect = occurrences.getMaximum() === 0 || occurrences.getMaximum() > 1;
  const canAdd = occurrences.getMaximum() === 0 || values.length < occurrences.getMaximum();
  const occurrenceErrorVisible = visibility === 'all' || (visibility === 'interactive' && touched);
  const occurrenceError = occurrenceErrorVisible
    ? getOccurrenceErrorMessage(occurrences, errors, t)
    : undefined;
  const firstFieldError = errors
    .map((entry) => getFirstError(entry.validationResults, t))
    .find(Boolean);
  const fieldMessage = firstFieldError ?? (visibility !== 'all' ? occurrenceError : undefined);
  const hasErrors = occurrenceError != null || firstFieldError != null;

  const handleSelectionChange = useCallback(
    (newSelection: readonly string[]) => {
      setTouched(true);
      const newSet = new Set(newSelection);
      // Backwards, so the indices still to be removed are not shifted by the removals done.
      for (let i = values.length - 1; i >= 0; i--) {
        const current = values[i];
        const str = current === undefined || current.isNull() ? undefined : current.getString();
        if (str != null && !newSet.has(str)) {
          onRemove(i);
        }
      }
      for (const val of newSelection) {
        if (!selectedSet.has(val)) {
          onAdd(ValueTypes.STRING.newValue(val));
        }
      }
      setSearchValue(undefined);
    },
    [selectedSet, values, onAdd, onRemove],
  );
  const handleRemove = useCallback(
    (index: number) => {
      setTouched(true);
      onRemove(index);
    },
    [onRemove],
  );

  const keyExtractor = useCallback(
    (item: Value, index: number) => (item.isNull() ? `null-${index}` : (item.getString() ?? '')),
    [],
  );

  return (
    <div data-component={COMBO_BOX_INPUT_NAME} className="flex flex-col gap-y-2">
      {canAdd && (
        <Combobox.Root
          value={searchValue}
          onChange={setSearchValue}
          selection={selectedStrings}
          onSelectionChange={handleSelectionChange}
          selectionMode={isMultiSelect ? 'staged' : 'multiple'}
          disabled={!enabled}
          error={hasErrors}
        >
          <Combobox.Content className="relative">
            <Combobox.Control>
              <Combobox.Search>
                <Combobox.SearchIcon />
                <Combobox.Input placeholder={t('enonic.inputTypes.field.optionPlaceholder')} />
                {isMultiSelect && <Combobox.Apply label={t('enonic.inputTypes.action.apply')} />}
                <Combobox.Toggle />
              </Combobox.Search>
            </Combobox.Control>
            <Combobox.Popup>
              <Listbox.Content className="rounded-sm">
                {filteredOptions.map((option) => (
                  <Listbox.Item key={option.value} value={option.value} className="min-h-5.5">
                    <span className="flex-1">{option.label}</span>
                    {isMultiSelect && (
                      <span className="pointer-events-none inline-flex shrink-0" aria-hidden="true">
                        <Square className="size-4 text-main group-aria-selected:hidden group-data-[tone=inverse]:text-alt" />
                        <FilledSquareCheck className="hidden size-4 text-main group-aria-selected:block group-data-[tone=inverse]:text-alt" />
                      </span>
                    )}
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Combobox.Popup>
          </Combobox.Content>
        </Combobox.Root>
      )}

      {values.length > 0 && (
        <SortableGridList
          items={values}
          keyExtractor={keyExtractor}
          onMove={onMove}
          enabled={enabled}
          dragLabel={t('enonic.inputTypes.occurrence.reorder')}
          className={cn('flex flex-col gap-y-2.5', canAdd && 'mt-3')}
          itemClassName="gap-2.5 px-2.5 py-1"
          renderItem={({ item, index }) => {
            const str = item.isNull() ? '' : (item.getString() ?? '');
            const itemError = getFirstError(errors[index]?.validationResults ?? [], t);
            return (
              <>
                <div className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', itemError && 'text-error')}>
                    {optionMap.get(str)?.label ?? str}
                  </span>
                </div>
                <IconButton
                  icon={X}
                  iconSize="lg"
                  variant="text"
                  className="size-8"
                  disabled={!enabled}
                  aria-label={t('enonic.inputTypes.occurrence.remove')}
                  onClick={() => handleRemove(index)}
                />
              </>
            );
          }}
        />
      )}

      <FieldError message={fieldMessage} />
    </div>
  );
};
ComboBoxInput.displayName = COMBO_BOX_INPUT_NAME;
