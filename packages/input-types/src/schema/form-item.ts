import type { FormItemJson } from '@enonic/ui-types';

import { FormItemPath, FormItemPathElement } from './form-item-path';

/** What a form item is, for a renderer or a validator to switch on without `instanceof`. */
export type FormItemKind = 'input' | 'fieldset' | 'itemset' | 'optionset' | 'option';

/**
 * One item of a form: an input, or a container of items. Immutable but for the two links the
 * tree sets while it is built: the parent, and the application whose schema this is.
 */
export abstract class FormItem {
  abstract readonly kind: FormItemKind;

  private readonly name: string;
  private parent: FormItem | undefined;
  private applicationKey: string | undefined;
  protected formItems: FormItem[] = [];

  protected constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  /** The items directly inside; empty for an input. */
  getFormItems(): FormItem[] {
    return this.formItems;
  }

  setApplicationKey(applicationKey: string | undefined): this {
    this.applicationKey = applicationKey;
    return this;
  }

  getApplicationKey(): string | undefined {
    return this.applicationKey;
  }

  setParent(parent: FormItem): void {
    this.parent = parent;
  }

  getParent(): FormItem | undefined {
    return this.parent;
  }

  getPath(): FormItemPath {
    const parentPath = this.parent?.getPath() ?? FormItemPath.ROOT;
    return this.name.length === 0
      ? parentPath
      : FormItemPath.fromParent(parentPath, FormItemPathElement.fromString(this.name));
  }

  equals(other: unknown): boolean {
    return other instanceof FormItem && other.kind === this.kind && other.name === this.name;
  }
}

/** An item's JSON; an option has none of its own — its option set serializes it. */
export function toFormItemJson(item: FormItem): FormItemJson {
  if (item.kind === 'option') {
    throw new Error('An option is serialized by its option set');
  }
  return (item as unknown as { toJson(): FormItemJson }).toJson();
}

export function formItemsEqual(a: readonly FormItem[], b: readonly FormItem[]): boolean {
  return a.length === b.length && a.every((item, index) => item.equals(b[index]));
}
