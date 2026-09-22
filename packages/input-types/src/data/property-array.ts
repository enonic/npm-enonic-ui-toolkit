import type { PropertyArrayJson, PropertyValueJson } from '@enonic/ui-types';

import { Property } from './property';
import {
  Listeners,
  PropertyAddedEvent,
  PropertyMovedEvent,
  PropertyRemovedEvent,
  type PropertyValueChangedEvent,
} from './property-event';
import { PropertyPath, PropertyPathElement } from './property-path';
import type { PropertySet } from './property-set';
import type { PropertyTree } from './property-tree';
import { Value } from './value';
import type { ValueType } from './value-type';
import { ValueTypes } from './value-types';

export type PropertyArrayInit = {
  parent: PropertySet;
  name: string;
  type: ValueType;
};

/**
 * The properties of one name inside a set, in order, all of one type. Reports its own additions,
 * removals, moves and value changes, and forwards those of any set nested under it.
 */
export class PropertyArray {
  private readonly tree: PropertyTree | undefined;
  private readonly parent: PropertySet;
  private readonly name: string;
  private type: ValueType;
  private array: Property[] = [];

  private readonly addedListeners = new Listeners<PropertyAddedEvent>();
  private readonly removedListeners = new Listeners<PropertyRemovedEvent>();
  private readonly movedListeners = new Listeners<PropertyMovedEvent>();
  private readonly valueChangedListeners = new Listeners<PropertyValueChangedEvent>();

  private readonly forwardAdded = (event: PropertyAddedEvent): void =>
    this.addedListeners.notify(event);
  private readonly forwardRemoved = (event: PropertyRemovedEvent): void =>
    this.removedListeners.notify(event);
  private readonly forwardMoved = (event: PropertyMovedEvent): void =>
    this.movedListeners.notify(event);
  private readonly forwardValueChanged = (event: PropertyValueChangedEvent): void =>
    this.valueChangedListeners.notify(event);

  constructor(init: PropertyArrayInit) {
    Property.checkName(init.name);
    this.tree = init.parent.getTree();
    this.parent = init.parent;
    this.name = init.name;
    this.type = init.type;
  }

  static create(): PropertyArrayBuilder {
    return new PropertyArrayBuilder();
  }

  static fromJson(json: PropertyArrayJson, parent: PropertySet, tree: PropertyTree): PropertyArray {
    const type = ValueTypes.fromName(json.type);
    const array = new PropertyArray({ parent, name: json.name, type });

    json.values.forEach((valueJson, index) => {
      let value: Value;
      if (type.equals(ValueTypes.DATA)) {
        if (valueJson.set == null) {
          value = ValueTypes.DATA.newNullValue();
        } else {
          const set = tree.newPropertySet();
          for (const arrayJson of valueJson.set) {
            set.addPropertyArray(PropertyArray.fromJson(arrayJson, set, tree));
          }
          value = new Value(set, ValueTypes.DATA);
        }
      } else {
        value = type.fromJsonValue(valueJson.v);
      }
      array.addProperty(new Property({ array, name: json.name, index, value }));
    });
    return array;
  }

  forEach(callback: (property: Property, index: number) => void): void {
    this.array.forEach(callback);
  }

  map<U>(callback: (property: Property, index: number) => U): U[] {
    return this.array.map(callback);
  }

  some(callback: (property: Property, index: number) => boolean): boolean {
    return this.array.some(callback);
  }

  containsValue(value: Value): boolean {
    return this.array.some((property) => property.getValue().equals(value));
  }

  getTree(): PropertyTree | undefined {
    return this.tree;
  }

  getParent(): PropertySet {
    return this.parent;
  }

  getParentPropertyPath(): PropertyPath {
    return this.parent.getProperty()?.getPath() ?? PropertyPath.ROOT;
  }

  getName(): string {
    return this.name;
  }

  getType(): ValueType {
    return this.type;
  }

  /** Retypes the array, converting every value whose type differs. */
  convertValues(newType: ValueType, converter: (value: Value, toType: ValueType) => Value): void {
    this.type = newType;
    for (const property of this.array) {
      const source = property.getValue();
      if (!newType.equals(source.getType())) {
        property.setValue(converter(source, newType));
      }
    }
  }

  newSet(): PropertySet {
    return this.parent.newSet();
  }

  /** Application protected: adds a property built for this array, without an event. */
  addProperty(property: Property): void {
    if (property.getName() !== this.name) {
      throw new Error(
        `Expected name of added Property to be [${this.name}], got: ${property.getName()}`,
      );
    }
    if (!property.getType().equals(this.type)) {
      throw new Error(
        `Expected type of added Property to be [${this.type.toString()}], got: ${property.getType().toString()}`,
      );
    }
    if (property.getIndex() !== this.array.length) {
      throw new Error(
        `Expected index of added Property to be [${this.array.length}], got: ${property.getIndex()}`,
      );
    }
    this.array.push(property);
    this.registerPropertyListeners(property);
  }

  add(value: Value): Property {
    this.checkType(value.getType());
    const property = new Property({
      array: this,
      name: this.name,
      index: this.array.length,
      value,
    });
    this.array.push(property);

    const set = property.getPropertySet();
    if (this.tree !== undefined && set?.isDetached()) {
      set.attachToTree(this.tree);
    }

    this.addedListeners.notify(new PropertyAddedEvent(property));
    this.registerPropertyListeners(property);
    return property;
  }

  addSet(): PropertySet {
    const set = this.parent.newSet();
    this.add(new Value(set, ValueTypes.DATA));
    return set;
  }

  /** Replaces the value at `index`, or appends when `index` is the size. */
  set(index: number, value: Value): Property {
    this.checkType(value.getType());
    const existing = this.array[index];
    if (existing !== undefined) {
      existing.setValue(value);
      return existing;
    }
    if (index !== this.array.length) {
      throw new Error(`Index out of bounds: index: ${index}, size: ${this.array.length}`);
    }
    return this.add(value);
  }

  move(from: number, to: number): void {
    const property = this.array[from];
    if (property === undefined || to < 0 || to >= this.array.length) {
      throw new Error(`Cannot move [${from}] to [${to}] in an array of ${this.array.length}`);
    }
    this.array.splice(from, 1);
    this.array.splice(to, 0, property);
    this.reindex();
    this.movedListeners.notify(new PropertyMovedEvent(property, from, to));
  }

  /** Removes every property; `silent` skips the removed events. */
  removeAll(silent = false): void {
    const properties = this.array;
    this.array = [];
    for (const property of properties) {
      if (!silent) {
        this.removedListeners.notify(new PropertyRemovedEvent(property));
      }
      this.unregisterPropertyListeners(property);
      property.detach();
    }
  }

  remove(index: number): void {
    const property = this.array[index];
    if (property === undefined) {
      const path = PropertyPath.fromParent(
        this.getParentPropertyPath(),
        new PropertyPathElement(this.name, index),
      );
      throw new Error(`Property not found: ${path.toString()}`);
    }
    this.array.splice(index, 1);
    this.reindex();
    this.removedListeners.notify(new PropertyRemovedEvent(property));
    this.unregisterPropertyListeners(property);
    property.detach();
  }

  exists(index: number): boolean {
    return this.array[index] !== undefined;
  }

  get(index: number): Property | undefined {
    return this.array[index];
  }

  getValue(index: number): Value | undefined {
    return this.array[index]?.getValue();
  }

  getSet(index: number): PropertySet | undefined {
    return this.array[index]?.getPropertySet();
  }

  getSize(): number {
    return this.array.length;
  }

  isEmpty(): boolean {
    return this.array.length === 0;
  }

  /** A copy of the array of properties. */
  getProperties(): Property[] {
    return this.array.slice();
  }

  equals(other: unknown): boolean {
    return (
      other instanceof PropertyArray &&
      other.name === this.name &&
      other.type.equals(this.type) &&
      other.array.length === this.array.length &&
      other.array.every((property, index) => property.equals(this.array[index]))
    );
  }

  /** A deep copy under `destination`, with `destination`'s tree. */
  copy(destination: PropertySet): PropertyArray {
    const copy = new PropertyArray({ parent: destination, name: this.name, type: this.type });
    for (const property of this.array) {
      copy.addProperty(property.copy(copy));
    }
    return copy;
  }

  /** Application protected: forwards a nested set's events through this array. */
  registerPropertySetListeners(set: PropertySet): void {
    set.onPropertyAdded(this.forwardAdded);
    set.onPropertyRemoved(this.forwardRemoved);
    set.onPropertyMoved(this.forwardMoved);
    set.onPropertyValueChanged(this.forwardValueChanged);
  }

  /** Application protected. */
  unregisterPropertySetListeners(set: PropertySet): void {
    set.unPropertyAdded(this.forwardAdded);
    set.unPropertyRemoved(this.forwardRemoved);
    set.unPropertyMoved(this.forwardMoved);
    set.unPropertyValueChanged(this.forwardValueChanged);
  }

  onPropertyAdded(listener: (event: PropertyAddedEvent) => void): void {
    this.addedListeners.add(listener);
  }

  unPropertyAdded(listener: (event: PropertyAddedEvent) => void): void {
    this.addedListeners.remove(listener);
  }

  onPropertyRemoved(listener: (event: PropertyRemovedEvent) => void): void {
    this.removedListeners.add(listener);
  }

  unPropertyRemoved(listener: (event: PropertyRemovedEvent) => void): void {
    this.removedListeners.remove(listener);
  }

  onPropertyMoved(listener: (event: PropertyMovedEvent) => void): void {
    this.movedListeners.add(listener);
  }

  unPropertyMoved(listener: (event: PropertyMovedEvent) => void): void {
    this.movedListeners.remove(listener);
  }

  onPropertyValueChanged(listener: (event: PropertyValueChangedEvent) => void): void {
    this.valueChangedListeners.add(listener);
  }

  unPropertyValueChanged(listener: (event: PropertyValueChangedEvent) => void): void {
    this.valueChangedListeners.remove(listener);
  }

  toJson(): PropertyArrayJson {
    const values: PropertyValueJson[] = this.array.map((property) => {
      if (this.type.equals(ValueTypes.DATA)) {
        const set = property.getPropertySet();
        return set === undefined ? {} : { set: set.toJson() };
      }
      return { v: this.type.toJsonValue(property.getValue()) };
    });
    return { name: this.name, type: this.type.getName(), values };
  }

  private reindex(): void {
    this.array.forEach((property, index) => property.setIndex(index));
  }

  private checkType(type: ValueType): void {
    if (!this.type.equals(type)) {
      throw new Error(
        `This PropertyArray expects only properties with value of type '${this.type.toString()}', got: ${type.toString()}`,
      );
    }
  }

  private registerPropertyListeners(property: Property): void {
    const set = property.getPropertySet();
    if (set !== undefined) {
      this.registerPropertySetListeners(set);
    }
    property.onPropertyValueChanged(this.forwardValueChanged);
  }

  private unregisterPropertyListeners(property: Property): void {
    property.unPropertyValueChanged(this.forwardValueChanged);
    const set = property.getPropertySet();
    if (set !== undefined) {
      this.unregisterPropertySetListeners(set);
    }
  }
}

export class PropertyArrayBuilder {
  private parent?: PropertySet;
  private name?: string;
  private type?: ValueType;

  setParent(value: PropertySet): this {
    this.parent = value;
    return this;
  }

  setName(value: string): this {
    this.name = value;
    return this;
  }

  setType(value: ValueType): this {
    this.type = value;
    return this;
  }

  build(): PropertyArray {
    if (this.parent === undefined || this.name === undefined || this.type === undefined) {
      throw new Error('A PropertyArray needs a parent, a name and a type');
    }
    return new PropertyArray({ parent: this.parent, name: this.name, type: this.type });
  }
}
