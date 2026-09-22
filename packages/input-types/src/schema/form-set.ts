import { FormItem } from './form-item';
import type { Occurrences } from './occurrences';

export type FormSetInit = {
  name: string;
  label: string;
  helpText?: string;
  occurrences: Occurrences;
};

/** What an item set and an option set share: a label, help text, and how often they occur. */
export abstract class FormSet extends FormItem {
  private readonly label: string;
  private readonly helpText: string | undefined;
  private readonly occurrences: Occurrences;

  protected constructor(init: FormSetInit) {
    super(init.name);
    this.label = init.label;
    this.helpText = init.helpText;
    this.occurrences = init.occurrences;
  }

  getLabel(): string {
    return this.label;
  }

  getHelpText(): string | undefined {
    return this.helpText;
  }

  getOccurrences(): Occurrences {
    return this.occurrences;
  }

  override equals(other: unknown): boolean {
    return (
      super.equals(other) &&
      other instanceof FormSet &&
      other.label === this.label &&
      other.helpText === this.helpText &&
      other.occurrences.equals(this.occurrences)
    );
  }
}
