import { type PropertyArray, type PropertySet, ValueTypeConverter, ValueTypes } from '../data';
import { type InputTypeRegistry, inputTypeRegistry } from '../registry';
import type { Form, FormItem, FormItemSet, FormOptionSet, Input } from '../schema';

export type NormalizeFormValueTypesOptions = {
  registry?: InputTypeRegistry;
};

/**
 * Converts every stored value to the type its input type declares — a `Long` saved as a string
 * by an older writer becomes a long — through the form, its sets and the selected options.
 */
export function normalizeFormValueTypes(
  form: Form,
  root: PropertySet,
  options: NormalizeFormValueTypesOptions = {},
): void {
  normalizeFormItems(form.getFormItems(), root, options.registry ?? inputTypeRegistry);
}

function normalizeFormItems(
  items: FormItem[],
  propertySet: PropertySet,
  registry: InputTypeRegistry,
): void {
  for (const item of items) {
    switch (item.kind) {
      case 'input':
        normalizeInput(item as Input, propertySet, registry);
        break;
      case 'fieldset':
        normalizeFormItems(item.getFormItems(), propertySet, registry);
        break;
      case 'itemset':
        forEachSet(propertySet.getPropertyArray(item.getName()), (occurrence) => {
          normalizeFormItems((item as FormItemSet).getFormItems(), occurrence, registry);
        });
        break;
      case 'optionset':
        normalizeOptionSet(item as FormOptionSet, propertySet, registry);
        break;
      default:
        break;
    }
  }
}

function normalizeInput(input: Input, propertySet: PropertySet, registry: InputTypeRegistry): void {
  const propertyArray = propertySet.getPropertyArray(input.getName());
  if (propertyArray === undefined) return;
  const valueType = registry.getDescriptor(input.getInputType().getName())?.getValueType();
  if (valueType === undefined || valueType.equals(propertyArray.getType())) return;
  ValueTypeConverter.convertArrayValues(propertyArray, valueType);
}

function normalizeOptionSet(
  optionSet: FormOptionSet,
  propertySet: PropertySet,
  registry: InputTypeRegistry,
): void {
  forEachSet(propertySet.getPropertyArray(optionSet.getName()), (occurrence) => {
    for (const option of optionSet.getOptions()) {
      forEachSet(occurrence.getPropertyArray(option.getName()), (optionData) => {
        normalizeFormItems(option.getFormItems(), optionData, registry);
      });
    }
  });
}

function forEachSet(
  propertyArray: PropertyArray | undefined,
  callback: (set: PropertySet) => void,
): void {
  if (propertyArray === undefined || !propertyArray.getType().equals(ValueTypes.DATA)) return;
  const size = propertyArray.getSize();
  for (let i = 0; i < size; i++) {
    const set = propertyArray.getSet(i);
    if (set !== undefined) callback(set);
  }
}
