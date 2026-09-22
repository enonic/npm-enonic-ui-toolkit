import type { Value } from '../data';
import type { Occurrences } from '../schema';
import type { InputTypeConfig } from './input-type-config';
import type { InputTypeDescriptor } from './input-type-descriptor';
import type { ValidationResult } from './validation-result';

export type OccurrenceValidationState = {
  readonly index: number;
  readonly breaksRequired: boolean;
  readonly validationResults: ValidationResult[];
};

export type OccurrenceManagerState = {
  readonly ids: string[];
  readonly values: Value[];
  readonly rawValues: (string | undefined)[];
  readonly occurrenceValidation: OccurrenceValidationState[];
  readonly totalValid: number;
  readonly isMinimumBreached: boolean;
  readonly isMaximumBreached: boolean;
  readonly isValid: boolean;
  readonly canAdd: boolean;
  readonly canRemove: boolean;
};

/**
 * The values of one input with a stable id each, and their validation. Pure: a hook drives it in
 * React, anything else can drive it too. An id survives moves and removals, so an async caller
 * can capture one and address the same occurrence when it comes back.
 */
export class OccurrenceManager<C extends InputTypeConfig = InputTypeConfig> {
  private readonly occurrences: Occurrences;
  private readonly descriptor: InputTypeDescriptor<C>;
  private readonly config: C;
  private values: Value[];
  private rawValues: (string | undefined)[];
  private ids: string[];
  private readonly transientErrors = new Map<string, string>();
  private nextId = 0;

  constructor(
    occurrences: Occurrences,
    descriptor: InputTypeDescriptor<C>,
    config: C,
    initialValues: Value[] = [],
  ) {
    this.occurrences = occurrences;
    this.descriptor = descriptor;
    this.config = config;
    this.values = [...initialValues];
    this.rawValues = initialValues.map(() => undefined);
    this.ids = this.values.map(() => this.generateId());
  }

  private generateId(): string {
    return `occurrence-${this.nextId++}`;
  }

  getValues(): Value[] {
    return [...this.values];
  }

  getIds(): string[] {
    return [...this.ids];
  }

  /**
   * Replaces the values from outside, keeping the id and raw value at every position whose value
   * is the same object, so a sync after `set()` does not blank what the user typed. No maximum is
   * enforced: the data is shown as it is and the breach reported. Transient errors go, since the
   * values they were tied to did.
   */
  setValues(values: Value[]): void {
    const oldIds = this.ids;
    const oldValues = this.values;
    const oldRawValues = this.rawValues;
    this.values = [...values];
    this.rawValues = values.map((value, i) =>
      oldValues[i] === value ? oldRawValues[i] : undefined,
    );
    this.ids = this.values.map((_, i) => oldIds[i] ?? this.generateId());
    this.transientErrors.clear();
  }

  getCount(): number {
    return this.values.length;
  }

  getOccurrences(): Occurrences {
    return this.occurrences;
  }

  add(value?: Value): boolean {
    if (this.isMaximumReached()) {
      return false;
    }
    this.values.push(value ?? this.descriptor.getValueType().newNullValue());
    this.rawValues.push(undefined);
    this.ids.push(this.generateId());
    return true;
  }

  remove(index: number): boolean {
    const id = this.ids[index];
    if (id === undefined) {
      return false;
    }
    this.values.splice(index, 1);
    this.rawValues.splice(index, 1);
    this.ids.splice(index, 1);
    this.transientErrors.delete(id);
    return true;
  }

  move(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex < 0 ||
      fromIndex >= this.values.length ||
      toIndex < 0 ||
      toIndex >= this.values.length ||
      fromIndex === toIndex
    ) {
      return false;
    }
    moveItem(this.values, fromIndex, toIndex);
    moveItem(this.rawValues, fromIndex, toIndex);
    moveItem(this.ids, fromIndex, toIndex);
    return true;
  }

  /** A user-driven change: the descriptor owns the occurrence's errors again. */
  set(index: number, value: Value, rawValue?: string): void {
    const id = this.ids[index];
    if (id === undefined) {
      return;
    }
    this.values[index] = value;
    this.rawValues[index] = rawValue;
    this.transientErrors.delete(id);
  }

  /** False for an id that is gone, so a caller learns its captured id is stale. */
  setTransientError(occurrenceId: string, message: string): boolean {
    if (!this.ids.includes(occurrenceId)) {
      return false;
    }
    this.transientErrors.set(occurrenceId, message);
    return true;
  }

  clearTransientError(occurrenceId: string): boolean {
    return this.transientErrors.delete(occurrenceId);
  }

  clearAllTransientErrors(): void {
    this.transientErrors.clear();
  }

  getTransientError(occurrenceId: string): string | undefined {
    return this.transientErrors.get(occurrenceId);
  }

  hasTransientErrors(): boolean {
    return this.transientErrors.size > 0;
  }

  /** Gates on the total count, empty values included, unlike the validation. */
  canAdd(): boolean {
    return !this.isMaximumReached();
  }

  canRemove(): boolean {
    return this.values.length > this.occurrences.getMinimum();
  }

  isMaximumReached(): boolean {
    return this.occurrences.maximumReached(this.values.length);
  }

  /**
   * Every occurrence validated, with the transient error first where there is one, and the
   * count checked against the occurrences: only a non-empty, error-free value counts towards it.
   */
  validate(): OccurrenceManagerState {
    const occurrenceValidation: OccurrenceValidationState[] = this.values.map((value, index) => {
      const results = this.descriptor.validate(value, this.config, this.rawValues[index]);
      const id = this.ids[index];
      const transient = id === undefined ? undefined : this.transientErrors.get(id);
      return {
        index,
        breaksRequired: this.descriptor.valueBreaksRequired(value),
        validationResults:
          transient == null ? results : [{ message: transient, transient: true }, ...results],
      };
    });

    const totalValid = occurrenceValidation.filter(
      (ov) => !ov.breaksRequired && ov.validationResults.length === 0,
    ).length;
    const isMinimumBreached = this.occurrences.minimumBreached(totalValid);
    const isMaximumBreached = this.occurrences.maximumBreached(totalValid);

    return {
      ids: this.getIds(),
      values: this.getValues(),
      rawValues: [...this.rawValues],
      occurrenceValidation,
      totalValid,
      isMinimumBreached,
      isMaximumBreached,
      isValid:
        !isMinimumBreached &&
        !isMaximumBreached &&
        occurrenceValidation.every((ov) => ov.validationResults.length === 0),
      canAdd: this.canAdd(),
      canRemove: this.canRemove(),
    };
  }
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): void {
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved as T);
}
