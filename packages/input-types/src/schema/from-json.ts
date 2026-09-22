import type { FormItemJson, FormJson } from '@enonic/ui-types';

import { FieldSet } from './field-set';
import type { FormItem } from './form-item';
import { FormItemSet } from './form-item-set';
import { FormOptionSet } from './form-option-set';
import { FormOptionSetOption } from './form-option-set-option';
import { Input } from './input';
import { Occurrences } from './occurrences';

/**
 * One form item from its JSON, in XP's dialect. A form fragment reference is `undefined`: XP's
 * `lib-content` inlines fragments before serializing, and one that is still a reference has no
 * items to render.
 */
export function formItemFromJson(
  json: FormItemJson,
  applicationKey?: string,
): FormItem | undefined {
  switch (json.formItemType) {
    case 'Input':
      return Input.fromJson(json).setApplicationKey(applicationKey);
    case 'Layout':
      return new FieldSet({
        name: json.name,
        label: json.label,
        items: formItemsFromJson(json.items, applicationKey),
      }).setApplicationKey(applicationKey);
    case 'ItemSet':
      return new FormItemSet({
        name: json.name,
        label: json.label,
        helpText: json.helpText,
        occurrences: Occurrences.fromJson(json.occurrences),
        items: formItemsFromJson(json.items, applicationKey),
      }).setApplicationKey(applicationKey);
    case 'OptionSet':
      return new FormOptionSet({
        name: json.name,
        label: json.label,
        helpText: json.helpText,
        expanded: json.expanded,
        occurrences: Occurrences.fromJson(json.occurrences),
        multiselection: Occurrences.fromJson(json.selection),
        options: json.options.map((option) =>
          new FormOptionSetOption({
            name: option.name,
            label: option.label,
            helpText: option.helpText,
            defaultOption: option.default,
            items: formItemsFromJson(option.items ?? [], applicationKey),
          }).setApplicationKey(applicationKey),
        ),
      }).setApplicationKey(applicationKey);
    case 'FormFragment':
      return undefined;
  }
}

export function formItemsFromJson(json: FormJson, applicationKey?: string): FormItem[] {
  const items: FormItem[] = [];
  for (const itemJson of json) {
    const item = formItemFromJson(itemJson, applicationKey);
    if (item !== undefined) {
      items.push(item);
    }
  }
  return items;
}
