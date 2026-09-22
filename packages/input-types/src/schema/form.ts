import type { FormJson } from '@enonic/ui-types';

import { type FormItem, formItemsEqual, toFormItemJson } from './form-item';
import { formItemsFromJson } from './from-json';
import type { Input } from './input';

/**
 * A form: its items in order. An item is found by name at this level only; a field set's items
 * are its own, and a field set itself may repeat a name, since it holds no data.
 */
export class Form {
  private readonly formItems: FormItem[] = [];
  private readonly itemsByName = new Map<string, FormItem>();

  constructor(formItems: readonly FormItem[] = []) {
    for (const item of formItems) {
      this.addFormItem(item);
    }
  }

  /** From XP's dialect; `applicationKey` is the application whose schema this is, for custom input types. */
  static fromJson(json: FormJson, applicationKey?: string): Form {
    return new Form(formItemsFromJson(json, applicationKey));
  }

  addFormItem(item: FormItem): void {
    const name = item.getName();
    if (item.kind !== 'fieldset' && this.itemsByName.has(name)) {
      throw new Error(`FormItem already added: ${name}`);
    }
    this.itemsByName.set(name, item);
    this.formItems.push(item);
  }

  getFormItems(): FormItem[] {
    return this.formItems;
  }

  getFormItemByName(name: string): FormItem | undefined {
    return this.itemsByName.get(name);
  }

  getInputByName(name: string): Input | undefined {
    const item = this.itemsByName.get(name);
    return item?.kind === 'input' ? (item as Input) : undefined;
  }

  toJson(): FormJson {
    return this.formItems.map((item) => toFormItemJson(item));
  }

  equals(other: unknown): boolean {
    return other instanceof Form && formItemsEqual(this.formItems, other.formItems);
  }
}
