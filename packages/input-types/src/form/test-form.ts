import type {
  FormItemJson,
  InputConfigJson,
  InputJson,
  ItemSetJson,
  OptionSetJson,
  OptionSetOptionJson,
} from '@enonic/ui-types';

import { Form } from '../schema';

export function inputJson(
  name: string,
  inputType: string,
  min = 0,
  max = 1,
  config: InputConfigJson = {},
): InputJson {
  return {
    formItemType: 'Input',
    name,
    label: name,
    inputType,
    occurrences: { minimum: min, maximum: max },
    config,
  };
}

export function itemSetJson(
  name: string,
  min: number,
  max: number,
  items: readonly FormItemJson[],
): ItemSetJson {
  return {
    formItemType: 'ItemSet',
    name,
    label: name,
    occurrences: { minimum: min, maximum: max },
    items,
  };
}

export function optionSetJson(
  name: string,
  occurrences: { minimum: number; maximum: number },
  selection: { minimum: number; maximum: number },
  options: readonly OptionSetOptionJson[],
): OptionSetJson {
  return { formItemType: 'OptionSet', name, label: name, occurrences, selection, options };
}

export function formOf(...items: FormItemJson[]): Form {
  return Form.fromJson(items);
}
