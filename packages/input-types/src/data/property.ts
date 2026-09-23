import type {
  BinaryReference,
  DateTime,
  GeoPoint,
  LocalDate,
  LocalDateTime,
  LocalTime,
  Reference,
} from '@enonic/ui-utils';

import type { PropertyArray } from './property-array';
import { Listeners, PropertyValueChangedEvent } from './property-event';
import { PropertyPath, PropertyPathElement } from './property-path';
import type { PropertySet } from './property-set';
import { Value } from './value';
import type { ValueType } from './value-type';
import { ValueTypes } from './value-types';

export type PropertyInit = {
  array: PropertyArray;
  name: string;
  index: number;
  value: Value;
};

/**
 * One value in a tree, at a name and an index inside its `PropertyArray`. Mutable: the value can
 * change, and the index changes when the array is reordered. A property whose value is a set is
 * that set's container, and the set's events forward through the property's array.
 */
export class Property {
  private readonly array: PropertyArray;
  private readonly parent: PropertySet;
  private readonly name: string;
  private index: number;
  private value: Value;
  private readonly valueChangedListeners = new Listeners<PropertyValueChangedEvent>();

  constructor(init: PropertyInit) {
    Property.checkName(init.name);
    this.array = init.array;
    this.parent = init.array.getParent();
    this.name = init.name;
    this.index = init.index;
    this.value = init.value;
    this.getPropertySet()?.setContainerProperty(this);
  }

  static checkName(name: string): void {
    if (name.trim() === '') {
      throw new Error('Property name cannot be blank');
    }
    if (name.includes('.')) {
      throw new Error('Property name cannot contain .');
    }
    if (name.includes('[') || name.includes(']')) {
      throw new Error('Property name cannot contain [ or ]');
    }
  }

  static create(): PropertyBuilder {
    return new PropertyBuilder();
  }

  /** Application protected: the array reindexes its properties when one moves or leaves. */
  setIndex(index: number): void {
    this.index = index;
  }

  /** Replaces the value, reporting a `PropertyValueChangedEvent` when it differs; `force` marks the event. */
  setValue(value: Value, force = false): void {
    const oldValue = this.value;
    this.value = value;

    const added = value.getPropertySet();
    if (added !== undefined) {
      added.setContainerProperty(this);
      this.array.registerPropertySetListeners(added);
    }
    const removed = oldValue.getPropertySet();
    if (removed !== undefined) {
      removed.setContainerProperty(undefined);
      this.array.unregisterPropertySetListeners(removed);
    }

    if (!value.equals(oldValue)) {
      this.valueChangedListeners.notify(
        new PropertyValueChangedEvent(this, oldValue, value, force),
      );
    }
  }

  convertValueType(type: ValueType, converter: (value: Value, toType: ValueType) => Value): void {
    this.array.convertValues(type, converter);
  }

  /** Application protected: called by the array when the property leaves it. */
  detach(): void {
    const set = this.getPropertySet();
    if (set !== undefined) {
      set.setContainerProperty(undefined);
      this.array.unregisterPropertySetListeners(set);
    }
    this.valueChangedListeners.clear();
  }

  /** Back to the null value, or an empty set for a set. */
  reset(): void {
    if (this.hasNullValue()) {
      return;
    }
    const set = this.getPropertySet();
    if (set !== undefined) {
      set.reset();
    } else {
      this.setValue(this.getType().newNullValue());
    }
  }

  getParent(): PropertySet {
    return this.parent;
  }

  hasParentProperty(): boolean {
    return this.getParentProperty() !== undefined;
  }

  getParentProperty(): Property | undefined {
    return this.parent.getProperty();
  }

  getPath(): PropertyPath {
    const element = new PropertyPathElement(this.name, this.index);
    const parentProperty = this.getParentProperty();
    return parentProperty === undefined
      ? PropertyPath.fromPathElement(element)
      : PropertyPath.fromParent(parentProperty.getPath(), element);
  }

  getName(): string {
    return this.name;
  }

  getIndex(): number {
    return this.index;
  }

  getType(): ValueType {
    return this.value.getType();
  }

  getValue(): Value {
    return this.value;
  }

  hasNullValue(): boolean {
    return this.value.isNull();
  }

  hasNonNullValue(): boolean {
    return this.value.isNotNull();
  }

  /** The nested set, when this property's type is `PropertySet` and the value is not null. */
  getPropertySet(): PropertySet | undefined {
    return this.value.getPropertySet();
  }

  getString(): string | undefined {
    return this.value.getString();
  }

  getLong(): number | undefined {
    return this.value.getLong();
  }

  getDouble(): number | undefined {
    return this.value.getDouble();
  }

  getBoolean(): boolean | undefined {
    return this.value.getBoolean();
  }

  getDateTime(): DateTime | undefined {
    return this.value.getDateTime();
  }

  getLocalDate(): LocalDate | undefined {
    return this.value.getLocalDate();
  }

  getLocalDateTime(): LocalDateTime | undefined {
    return this.value.getLocalDateTime();
  }

  getLocalTime(): LocalTime | undefined {
    return this.value.getLocalTime();
  }

  getGeoPoint(): GeoPoint | undefined {
    return this.value.getGeoPoint();
  }

  getReference(): Reference | undefined {
    return this.value.getReference();
  }

  getBinaryReference(): BinaryReference | undefined {
    return this.value.getBinaryReference();
  }

  equals(other: unknown): boolean {
    return (
      other instanceof Property &&
      other.name === this.name &&
      other.index === this.index &&
      other.value.equals(this.value)
    );
  }

  /** A copy inside `destination`, deep for a set value. */
  copy(destination: PropertyArray): Property {
    const set = this.getPropertySet();
    const value =
      set === undefined ? this.value : new Value(set.copy(destination.getTree()), ValueTypes.DATA);
    return new Property({ array: destination, name: this.name, index: this.index, value });
  }

  onPropertyValueChanged(listener: (event: PropertyValueChangedEvent) => void): void {
    this.valueChangedListeners.add(listener);
  }

  unPropertyValueChanged(listener: (event: PropertyValueChangedEvent) => void): void {
    this.valueChangedListeners.remove(listener);
  }
}

export class PropertyBuilder {
  private array?: PropertyArray;
  private name?: string;
  private index?: number;
  private value?: Value;

  setArray(value: PropertyArray): this {
    this.array = value;
    return this;
  }

  setName(value: string): this {
    this.name = value;
    return this;
  }

  setIndex(value: number): this {
    this.index = value;
    return this;
  }

  setValue(value: Value): this {
    this.value = value;
    return this;
  }

  build(): Property {
    if (
      this.array === undefined ||
      this.name === undefined ||
      this.index === undefined ||
      this.value === undefined
    ) {
      throw new Error('A Property needs an array, a name, an index and a value');
    }
    return new Property({
      array: this.array,
      name: this.name,
      index: this.index,
      value: this.value,
    });
  }
}
