import type { PropertySet } from '../data';
import type { Occurrences } from '../schema';

export type SetOccurrenceManagerState = {
  readonly ids: string[];
  readonly count: number;
  readonly isMinimumBreached: boolean;
  readonly isMaximumBreached: boolean;
  readonly canAdd: boolean;
  readonly canRemove: boolean;
};

/**
 * The occurrences of an item set or an option set: a count and a stable id each, nothing about
 * the values — every occurrence's items validate themselves.
 */
export class SetOccurrenceManager {
  private readonly occurrences: Occurrences;
  private propertySets: PropertySet[];
  private ids: string[];
  private nextId = 0;

  constructor(occurrences: Occurrences, initialPropertySets: PropertySet[] = []) {
    this.occurrences = occurrences;
    this.propertySets = [...initialPropertySets];
    this.ids = this.propertySets.map(() => this.generateId());
  }

  private generateId(): string {
    return `set-occurrence-${this.nextId++}`;
  }

  /** Reconciles with the tree, keeping the id at every position whose set is the same object. */
  syncPropertySets(propertySets: PropertySet[]): void {
    const oldIds = this.ids;
    const oldSets = this.propertySets;
    this.propertySets = [...propertySets];
    this.ids = propertySets.map((set, i) =>
      oldSets[i] === set ? (oldIds[i] ?? this.generateId()) : this.generateId(),
    );
  }

  /** Reserves an id; the caller adds the set to the tree and the next sync reconciles. */
  add(): { id: string } | undefined {
    if (this.isMaximumReached()) {
      return undefined;
    }
    const id = this.generateId();
    this.ids.push(id);
    return { id };
  }

  remove(index: number): boolean {
    if (index < 0 || index >= this.ids.length) {
      return false;
    }
    this.propertySets.splice(index, 1);
    this.ids.splice(index, 1);
    return true;
  }

  move(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex < 0 ||
      fromIndex >= this.ids.length ||
      toIndex < 0 ||
      toIndex >= this.ids.length ||
      fromIndex === toIndex
    ) {
      return false;
    }
    const [movedSet] = this.propertySets.splice(fromIndex, 1);
    this.propertySets.splice(toIndex, 0, movedSet as PropertySet);
    const [movedId] = this.ids.splice(fromIndex, 1);
    this.ids.splice(toIndex, 0, movedId as string);
    return true;
  }

  getState(): SetOccurrenceManagerState {
    const count = this.ids.length;
    return {
      ids: [...this.ids],
      count,
      isMinimumBreached: this.occurrences.minimumBreached(count),
      isMaximumBreached: this.occurrences.maximumBreached(count),
      canAdd: !this.isMaximumReached(),
      canRemove: count > this.occurrences.getMinimum(),
    };
  }

  getId(index: number): string | undefined {
    return this.ids[index];
  }

  private isMaximumReached(): boolean {
    return this.occurrences.maximumReached(this.ids.length);
  }
}
