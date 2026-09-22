import type { OptionSetJson } from '@enonic/ui-types';

import type { FormItem } from './form-item';
import { formItemsEqual } from './form-item';
import type { FormOptionSetOption } from './form-option-set-option';
import { FormSet, type FormSetInit } from './form-set';
import type { Occurrences } from './occurrences';

export type FormOptionSetInit = FormSetInit & {
  expanded?: boolean;
  /** How many options one occurrence may select. */
  multiselection: Occurrences;
  options?: readonly FormOptionSetOption[];
};

/** A repeatable choice among options, each carrying its own items; the selection is stored under `_selected`. */
export class FormOptionSet extends FormSet {
  override readonly kind = 'optionset';

  private readonly options: FormOptionSetOption[] = [];
  private readonly expanded: boolean;
  private readonly multiselection: Occurrences;

  constructor(init: FormOptionSetInit) {
    super(init);
    this.expanded = init.expanded ?? false;
    this.multiselection = init.multiselection;
    for (const option of init.options ?? []) {
      this.addSetOption(option);
    }
  }

  addSetOption(option: FormOptionSetOption): void {
    option.setParent(this);
    this.options.push(option);
  }

  /** The options: an option set's items are its options. */
  override getFormItems(): FormItem[] {
    return this.options;
  }

  getOptions(): FormOptionSetOption[] {
    return this.options;
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  getMultiselection(): Occurrences {
    return this.multiselection;
  }

  /** Exactly one option per occurrence: rendered as radio buttons. */
  isRadioSelection(): boolean {
    return this.multiselection.getMinimum() === 1 && this.multiselection.getMaximum() === 1;
  }

  override equals(other: unknown): boolean {
    return (
      super.equals(other) &&
      other instanceof FormOptionSet &&
      other.expanded === this.expanded &&
      other.multiselection.equals(this.multiselection) &&
      formItemsEqual(this.options, other.options)
    );
  }

  toJson(): OptionSetJson {
    const helpText = this.getHelpText();
    return {
      formItemType: 'OptionSet',
      name: this.getName(),
      label: this.getLabel(),
      ...(helpText === undefined ? {} : { helpText }),
      expanded: this.expanded,
      occurrences: this.getOccurrences().toJson(),
      selection: this.multiselection.toJson(),
      options: this.options.map((option) => option.toJson()),
    };
  }
}
