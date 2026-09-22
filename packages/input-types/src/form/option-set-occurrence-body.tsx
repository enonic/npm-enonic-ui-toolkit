import { Checkbox, RadioGroup } from '@enonic/ui';
import { type JSX, type ReactElement, useCallback, useMemo, useState } from 'react';

import { FieldError } from '../components/field-error';
import {
  useValidationVisibility,
  ValidationVisibilityProvider,
} from '../context/validation-visibility';
import type { PropertySet } from '../data';
import type { FormOptionSet } from '../schema';
import { FormItemRenderer } from './form-item-renderer';
import { isLockedSingleOccurrence, useOptionSetSelection } from './option-set-selection';
import { useOptionSetMultiselectionError } from './set-errors';

const OPTION_SET_OCCURRENCE_BODY_NAME = 'OptionSetOccurrenceBody';

type RadioBodyProps = {
  enabled: boolean;
  optionSet: FormOptionSet;
  occurrence: PropertySet;
  selectedNames: string[];
  onSelect: (name: string) => void;
  error?: string;
};

/** Every option as a radio, the chosen one's items under it. */
const RadioBody = ({
  enabled,
  optionSet,
  occurrence,
  selectedNames,
  onSelect,
  error,
}: RadioBodyProps): ReactElement => {
  const options = useMemo(() => optionSet.getOptions(), [optionSet]);
  const selectedName = selectedNames[0] ?? '';

  // A handed-in onKeyDown replaces the group's roving arrow navigation, which would otherwise
  // also take the arrows typed into the nested inputs; the arrows stay inert on the radios.
  const handleKeyDown: JSX.KeyboardEventHandler<HTMLDivElement> = (event) => {
    const isArrowKey =
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight';
    if (!isArrowKey) return;
    if (event.target instanceof Element && event.target.closest('[role="radio"]') != null) {
      event.preventDefault();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <RadioGroup.Root
        name={`${optionSet.getName()}-radio`}
        value={selectedName}
        onValueChange={onSelect}
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-6 p-0 has-focus-visible:ring-0"
      >
        {options.map((option) => {
          const optionName = option.getName();
          const formItems = option.getFormItems();
          const optionDataSet = occurrence.getPropertyArray(optionName)?.getSet(0);
          const isChecked = selectedName === optionName;
          return (
            <div className="flex flex-col gap-7.5" key={optionName}>
              <RadioGroup.Item value={optionName} disabled={!enabled} tabIndex={enabled ? 0 : -1}>
                <RadioGroup.Indicator />
                <span>{option.getLabel() || optionName}</span>
              </RadioGroup.Item>
              {isChecked && formItems.length > 0 && optionDataSet && (
                <div className="ml-1.5 flex flex-col gap-7.5 border-l border-l-bdr-soft pl-5">
                  {formItems.map((formItem) => (
                    <FormItemRenderer
                      key={formItem.getName()}
                      formItem={formItem}
                      propertySet={optionDataSet}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </RadioGroup.Root>
      {error && <FieldError message={error} />}
    </div>
  );
};
RadioBody.displayName = 'OptionSetOccurrenceBody.Radio';

type CheckboxBodyProps = {
  enabled: boolean;
  optionSet: FormOptionSet;
  occurrence: PropertySet;
  selectedNames: string[];
  onToggle: (name: string) => void;
  error?: string;
};

/** Every option as a checkbox, the checked ones' items under them. */
const CheckboxBody = ({
  enabled,
  optionSet,
  occurrence,
  selectedNames,
  onToggle,
  error,
}: CheckboxBodyProps): ReactElement => {
  const multiselection = optionSet.getMultiselection();
  const options = useMemo(() => optionSet.getOptions(), [optionSet]);
  const isAtMax =
    multiselection.getMaximum() > 0 && selectedNames.length >= multiselection.getMaximum();

  // An option checked this session starts its items in interactive mode: errors after a touch.
  const [freshlySelected, setFreshlySelected] = useState<Set<string>>(() => new Set());
  const parentVisibility = useValidationVisibility();

  const handleToggle = useCallback(
    (name: string) => {
      setFreshlySelected((prev) => {
        const next = new Set(prev);
        if (selectedNames.includes(name)) next.delete(name);
        else next.add(name);
        return next;
      });
      onToggle(name);
    },
    [selectedNames, onToggle],
  );

  return (
    <div className="flex flex-col gap-6">
      {options.map((option) => {
        const optionName = option.getName();
        const checked = selectedNames.includes(optionName);
        const formItems = option.getFormItems();
        const optionDataSet = occurrence.getPropertyArray(optionName)?.getSet(0);
        const optionVisibility = freshlySelected.has(optionName) ? 'interactive' : parentVisibility;
        return (
          <div className="flex flex-col gap-7.5" key={optionName}>
            <Checkbox
              checked={checked}
              onCheckedChange={() => handleToggle(optionName)}
              disabled={!enabled || (isAtMax && !checked)}
              label={option.getLabel() || optionName}
            />
            {checked && formItems.length > 0 && optionDataSet && (
              <ValidationVisibilityProvider visibility={optionVisibility}>
                <div className="ml-1.75 flex flex-col gap-7.5 border-l border-l-bdr-soft pl-5">
                  {formItems.map((formItem) => (
                    <FormItemRenderer
                      key={formItem.getName()}
                      formItem={formItem}
                      propertySet={optionDataSet}
                    />
                  ))}
                </div>
              </ValidationVisibilityProvider>
            )}
          </div>
        );
      })}
      {error && <FieldError message={error} />}
    </div>
  );
};
CheckboxBody.displayName = 'OptionSetOccurrenceBody.Checkbox';

type SelectedOptionBodyProps = {
  optionSet: FormOptionSet;
  occurrence: PropertySet;
  selectedNames: string[];
};

/** The chosen option's items alone, for a radio occurrence whose choice is made. */
const SelectedOptionBody = ({
  optionSet,
  occurrence,
  selectedNames,
}: SelectedOptionBodyProps): ReactElement | null => {
  const selectedOption = useMemo(
    () => optionSet.getOptions().find((o) => selectedNames.includes(o.getName())),
    [optionSet, selectedNames],
  );
  if (selectedOption === undefined) return null;
  const formItems = selectedOption.getFormItems();
  if (formItems.length === 0) return null;
  const optionDataSet = occurrence.getPropertyArray(selectedOption.getName())?.getSet(0);
  if (optionDataSet === undefined) return null;
  return (
    <div className="flex flex-col gap-7.5">
      {formItems.map((formItem) => (
        <FormItemRenderer
          key={formItem.getName()}
          formItem={formItem}
          propertySet={optionDataSet}
        />
      ))}
    </div>
  );
};
SelectedOptionBody.displayName = 'OptionSetOccurrenceBody.Selected';

export type OptionSetOccurrenceBodyProps = {
  optionSet: FormOptionSet;
  occurrence: PropertySet;
  enabled: boolean;
};

/**
 * The inside of an option set occurrence: radios or checkboxes over the options, and the items
 * of the selected ones. A radio occurrence with its choice made shows the choice's items alone.
 */
export const OptionSetOccurrenceBody = ({
  optionSet,
  occurrence,
  enabled,
}: OptionSetOccurrenceBodyProps): ReactElement => {
  const visibility = useValidationVisibility();
  const [interacted, setInteracted] = useState(false);
  const { selectedNames, select, toggle } = useOptionSetSelection(optionSet, occurrence);
  const showErrors = visibility === 'all' || (visibility === 'interactive' && interacted);
  const error = useOptionSetMultiselectionError(optionSet, showErrors, selectedNames);

  const handleToggle = useCallback(
    (name: string) => {
      setInteracted(true);
      toggle(name);
    },
    [toggle],
  );

  if (optionSet.isRadioSelection()) {
    const needsPicker = selectedNames.length === 0;
    if (isLockedSingleOccurrence(optionSet) || needsPicker) {
      return (
        <div data-component={OPTION_SET_OCCURRENCE_BODY_NAME}>
          <RadioBody
            enabled={enabled}
            optionSet={optionSet}
            occurrence={occurrence}
            selectedNames={selectedNames}
            onSelect={select}
            error={error}
          />
        </div>
      );
    }
    return (
      <div data-component={OPTION_SET_OCCURRENCE_BODY_NAME}>
        <SelectedOptionBody
          optionSet={optionSet}
          occurrence={occurrence}
          selectedNames={selectedNames}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-component={OPTION_SET_OCCURRENCE_BODY_NAME}>
      <CheckboxBody
        enabled={enabled}
        optionSet={optionSet}
        occurrence={occurrence}
        selectedNames={selectedNames}
        onToggle={handleToggle}
        error={error}
      />
    </div>
  );
};
OptionSetOccurrenceBody.displayName = OPTION_SET_OCCURRENCE_BODY_NAME;
