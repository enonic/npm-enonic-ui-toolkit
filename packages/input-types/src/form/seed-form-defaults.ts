import { PropertyArray, type PropertySet, type ValueType, ValueTypes } from '../data';
import { computeDefaultValue } from '../descriptor/default-value';
import { getEffectiveOccurrences } from '../descriptor/get-effective-occurrences';
import { type InputTypeRegistry, inputTypeRegistry } from '../registry';
import type { Form, FormItem, FormItemSet, FormOptionSet, Input } from '../schema';
import { SELECTED_NAME, seedOptionSetDefaults } from './option-set-selection';

export type SeedFormDefaultsOptions = {
  /** The registry the inputs' defaults come from; the shared one when absent. */
  registry?: InputTypeRegistry;
};

/**
 * Writes a form's defaults into a fresh set, as rendering it would: the minimum occurrences of
 * every input and set, each input's configured default, an option set's default selection.
 * Seeding before the first render keeps a stored config equal to what the form shows, so
 * nothing looks changed before anyone typed. Arrays already present are left alone.
 */
export function seedFormDefaults(
  form: Form,
  root: PropertySet,
  options: SeedFormDefaultsOptions = {},
): void {
  const registry = options.registry ?? inputTypeRegistry;
  seedFormItems(form.getFormItems(), root, registry);
}

function seedFormItems(
  items: FormItem[],
  propertySet: PropertySet,
  registry: InputTypeRegistry,
): void {
  for (const item of items) {
    switch (item.kind) {
      case 'input':
        seedInput(item as Input, propertySet, registry);
        break;
      case 'fieldset':
        seedFormItems(item.getFormItems(), propertySet, registry);
        break;
      case 'itemset':
        seedItemSet(item as FormItemSet, propertySet, registry);
        break;
      case 'optionset':
        seedOptionSet(item as FormOptionSet, propertySet, registry);
        break;
      default:
        break;
    }
  }
}

function seedInput(input: Input, propertySet: PropertySet, registry: InputTypeRegistry): void {
  const definition = registry.getDefinition(input.getInputType().getName());
  // Without a component the input renders as unsupported and writes nothing.
  if (definition?.component == null) return;

  const { descriptor, mode } = definition;
  const config = descriptor.readConfig(input.getInputTypeConfig() ?? {});
  const occurrences = getEffectiveOccurrences(mode, input.getOccurrences());
  const propertyArray = getOrCreatePropertyArray(
    propertySet,
    input.getName(),
    descriptor.getValueType(),
  );
  const defaultValue = computeDefaultValue(input, descriptor, config);

  // A self-managed type is not filled to its minimum; it gets its one configured default.
  const minFill =
    mode === 'internal' ? (defaultValue.isNull() ? 0 : 1) : Math.max(occurrences.getMinimum(), 1);
  while (
    propertyArray.getSize() < minFill &&
    !occurrences.maximumReached(propertyArray.getSize())
  ) {
    propertyArray.add(defaultValue);
  }
}

function seedItemSet(
  itemSet: FormItemSet,
  propertySet: PropertySet,
  registry: InputTypeRegistry,
): void {
  const occurrences = itemSet.getOccurrences();
  const propertyArray = getOrCreatePropertyArray(propertySet, itemSet.getName(), ValueTypes.DATA);
  const items = itemSet.getFormItems();
  while (propertyArray.getSize() < occurrences.getMinimum()) {
    seedFormItems(items, propertyArray.addSet(), registry);
  }
}

function seedOptionSet(
  optionSet: FormOptionSet,
  propertySet: PropertySet,
  registry: InputTypeRegistry,
): void {
  const occurrences = optionSet.getOccurrences();
  const propertyArray = getOrCreatePropertyArray(propertySet, optionSet.getName(), ValueTypes.DATA);
  const isLockedSingle = occurrences.getMinimum() === 1 && occurrences.getMaximum() === 1;
  // As the view: a radio set seeds occurrences only when locked to one.
  if (optionSet.isRadioSelection() && !isLockedSingle) return;

  while (propertyArray.getSize() < occurrences.getMinimum()) {
    const occurrence = propertyArray.addSet();
    seedOptionSetDefaults(optionSet, occurrence);
    seedSelectedOptionItems(optionSet, occurrence, registry);
  }
}

function seedSelectedOptionItems(
  optionSet: FormOptionSet,
  occurrence: PropertySet,
  registry: InputTypeRegistry,
): void {
  const selectedNames = readSelectedOptionNames(occurrence);
  if (selectedNames.length === 0) return;
  for (const option of optionSet.getOptions()) {
    if (!selectedNames.includes(option.getName())) continue;
    const items = option.getFormItems();
    if (items.length === 0) continue;
    const optionDataSet = occurrence.getPropertyArray(option.getName())?.getSet(0);
    if (optionDataSet === undefined) continue;
    seedFormItems(items, optionDataSet, registry);
  }
}

function readSelectedOptionNames(occurrence: PropertySet): string[] {
  const names: string[] = [];
  occurrence.getPropertyArray(SELECTED_NAME)?.forEach((property) => {
    const name = property.getValue().getString();
    if (name != null) names.push(name);
  });
  return names;
}

function getOrCreatePropertyArray(
  propertySet: PropertySet,
  name: string,
  type: ValueType,
): PropertyArray {
  const existing = propertySet.getPropertyArray(name);
  if (existing !== undefined) return existing;
  const created = PropertyArray.create().setName(name).setType(type).setParent(propertySet).build();
  propertySet.addPropertyArray(created);
  return created;
}
