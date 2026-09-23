import type { OptionSetOptionJson } from '@enonic/ui-types';

import { FormItem, formItemsEqual, toFormItemJson } from './form-item';

export type FormOptionSetOptionInit = {
  name: string;
  label: string;
  helpText?: string;
  defaultOption?: boolean;
  items?: readonly FormItem[];
};

/** One option of an option set: a name the selection stores, and the items shown when selected. */
export class FormOptionSetOption extends FormItem {
  override readonly kind = 'option';

  private readonly label: string;
  private readonly helpText: string | undefined;
  private readonly defaultOption: boolean;
  private readonly itemsByName = new Map<string, FormItem>();

  constructor(init: FormOptionSetOptionInit) {
    super(init.name);
    this.label = init.label;
    this.helpText = init.helpText;
    this.defaultOption = init.defaultOption ?? false;
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

  getLabel(): string {
    return this.label;
  }

  getHelpText(): string | undefined {
    return this.helpText;
  }

  isDefaultOption(): boolean {
    return this.defaultOption;
  }

  override toString(): string {
    return this.label;
  }

  override equals(other: unknown): boolean {
    return (
      super.equals(other) &&
      other instanceof FormOptionSetOption &&
      other.label === this.label &&
      other.helpText === this.helpText &&
      other.defaultOption === this.defaultOption &&
      formItemsEqual(this.formItems, other.formItems)
    );
  }

  toJson(): OptionSetOptionJson {
    return {
      name: this.getName(),
      label: this.label,
      ...(this.helpText === undefined ? {} : { helpText: this.helpText }),
      default: this.defaultOption,
      items: this.formItems.map((item) => toFormItemJson(item)),
    };
  }
}
