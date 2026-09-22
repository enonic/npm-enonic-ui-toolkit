import type { ItemSetJson } from '@enonic/ui-types';

import { type FormItem, formItemsEqual, toFormItemJson } from './form-item';
import { FormSet, type FormSetInit } from './form-set';
import type { Input } from './input';

export type FormItemSetInit = FormSetInit & {
  items?: readonly FormItem[];
};

/** A repeatable group of items; each occurrence is a nested set in the data. */
export class FormItemSet extends FormSet {
  override readonly kind = 'itemset';

  private readonly itemsByName = new Map<string, FormItem>();

  constructor(init: FormItemSetInit) {
    super(init);
    for (const item of init.items ?? []) {
      this.addFormItem(item);
    }
  }

  addFormItem(item: FormItem): void {
    const name = item.getName();
    if (name !== '' && this.itemsByName.has(name)) {
      throw new Error(`FormItem already added: ${name}`);
    }
    item.setParent(this);
    this.itemsByName.set(name, item);
    this.formItems.push(item);
  }

  getFormItemByName(name: string): FormItem | undefined {
    return this.itemsByName.get(name);
  }

  getInputByName(name: string): Input | undefined {
    const item = this.itemsByName.get(name);
    return item?.kind === 'input' ? (item as Input) : undefined;
  }

  override equals(other: unknown): boolean {
    return (
      super.equals(other) &&
      other instanceof FormItemSet &&
      formItemsEqual(this.formItems, other.formItems)
    );
  }

  toJson(): ItemSetJson {
    const helpText = this.getHelpText();
    return {
      formItemType: 'ItemSet',
      name: this.getName(),
      label: this.getLabel(),
      ...(helpText === undefined ? {} : { helpText }),
      occurrences: this.getOccurrences().toJson(),
      items: this.formItems.map((item) => toFormItemJson(item)),
    };
  }
}
