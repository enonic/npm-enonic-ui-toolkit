import type { LayoutJson } from '@enonic/ui-types';

import { FormItem, formItemsEqual, toFormItemJson } from './form-item';

export type FieldSetInit = {
  name?: string;
  label?: string;
  items?: readonly FormItem[];
};

/** A labelled group of items with no data of its own: its items live in the same set as it does. */
export class FieldSet extends FormItem {
  override readonly kind = 'fieldset';

  private readonly label: string | undefined;

  constructor(init: FieldSetInit = {}) {
    super(init.name ?? '');
    this.label = init.label;
    for (const item of init.items ?? []) {
      this.addFormItem(item);
    }
  }

  addFormItem(item: FormItem): void {
    item.setParent(this);
    this.formItems.push(item);
  }

  getLabel(): string | undefined {
    return this.label;
  }

  override equals(other: unknown): boolean {
    return (
      super.equals(other) &&
      other instanceof FieldSet &&
      other.label === this.label &&
      formItemsEqual(this.formItems, other.formItems)
    );
  }

  toJson(): LayoutJson {
    return {
      formItemType: 'Layout',
      ...(this.getName() === '' ? {} : { name: this.getName() }),
      ...(this.label === undefined ? {} : { label: this.label }),
      items: this.formItems.map((item) => toFormItemJson(item)),
    };
  }
}
