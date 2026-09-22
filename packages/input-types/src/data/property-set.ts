import type { PropertyArrayJson } from '@enonic/ui-types';
import type {
  BinaryReference,
  DateTime,
  GeoPoint,
  LocalDate,
  LocalDateTime,
  LocalTime,
  Reference,
} from '@enonic/ui-utils';

import type { Property } from './property';
import { PropertyArray } from './property-array';
import {
  Listeners,
  PropertyAddedEvent,
  type PropertyEvent,
  type PropertyMovedEvent,
  type PropertyRemovedEvent,
  type PropertyValueChangedEvent,
} from './property-event';
import { PropertyPath } from './property-path';
import type { PropertyTree } from './property-tree';
import { Value } from './value';
import type { ValueType } from './value-type';
import { type ValueTypePropertySet, ValueTypes } from './value-types';

export type PropertyTreeDiff = {
  added: Property[];
  removed: Property[];
  modified: { oldValue: Property; newValue: Property }[];
};

/**
 * A set of properties grouped in arrays by name: the root of a tree, or the value of a property
 * of type `PropertySet`. Everything added anywhere below reports through it, so a listener on the
 * root hears the whole tree.
 *
 * The typed helpers exist per value type — `addString`, `addStrings`, `setString`,
 * `setStringByPath`, `getString`, `getStrings`, and the same for every other type. `get` with an
 * index reads a property of that name from this set; without one, the identifier is a path
 * relative to this set.
 */
export class PropertySet {
  private tree: PropertyTree | undefined;
  private property: Property | undefined;
  private readonly arraysByName = new Map<string, PropertyArray>();

  private readonly changedListeners = new Listeners<PropertyEvent>();
  private readonly addedListeners = new Listeners<PropertyAddedEvent>();
  private readonly removedListeners = new Listeners<PropertyRemovedEvent>();
  private readonly movedListeners = new Listeners<PropertyMovedEvent>();
  private readonly valueChangedListeners = new Listeners<PropertyValueChangedEvent>();

  private readonly forwardAdded = (event: PropertyAddedEvent): void => {
    this.addedListeners.notify(event);
    this.changedListeners.notify(event);
  };
  private readonly forwardRemoved = (event: PropertyRemovedEvent): void => {
    this.removedListeners.notify(event);
    this.changedListeners.notify(event);
  };
  private readonly forwardMoved = (event: PropertyMovedEvent): void => {
    this.movedListeners.notify(event);
    this.changedListeners.notify(event);
  };
  private readonly forwardValueChanged = (event: PropertyValueChangedEvent): void => {
    this.valueChangedListeners.notify(event);
    this.changedListeners.notify(event);
  };

  /** Without a tree the set is detached; it attaches when added to a tree's array. */
  constructor(tree?: PropertyTree) {
    this.tree = tree;
  }

  toString(): string {
    return `PropertySet[${this.getPropertyPath().toString()}]`;
  }

  /** Application protected: the property this set is the value of. */
  setContainerProperty(property: Property | undefined): void {
    this.property = property;
  }

  isDetached(): boolean {
    return this.tree === undefined;
  }

  getTree(): PropertyTree | undefined {
    return this.tree;
  }

  getType(): ValueTypePropertySet {
    return ValueTypes.DATA;
  }

  /** Application protected: attaches this set and every set below it. */
  attachToTree(tree: PropertyTree): void {
    this.tree = tree;
    this.forEach((property) => property.getPropertySet()?.attachToTree(tree));
  }

  addPropertyArray(array: PropertyArray): void {
    if (array.getTree() !== this.tree) {
      throw new Error(
        'Added PropertyArray must be attached to the same PropertyTree as this PropertySet',
      );
    }
    if (array.getParent() !== this) {
      throw new Error('Added PropertyArray must have this PropertySet as parent');
    }
    this.arraysByName.set(array.getName(), array);
    this.registerPropertyArrayListeners(array);
    for (const property of array.getProperties()) {
      this.forwardAdded(new PropertyAddedEvent(property));
    }
  }

  addProperty(name: string, value: Value): Property {
    return this.getOrCreatePropertyArray(name, value.getType()).add(value);
  }

  setPropertyByPath(path: string | PropertyPath, value: Value): Property {
    return this.doSetProperty(
      typeof path === 'string' ? PropertyPath.fromString(path) : path,
      value,
    );
  }

  setProperty(name: string, index: number, value: Value): Property {
    return this.getOrCreatePropertyArray(name, value.getType()).set(index, value);
  }

  removeProperties(properties: readonly Property[]): void {
    for (const property of properties) {
      this.removeProperty(property.getName(), property.getIndex());
    }
  }

  removeProperty(name: string, index: number): void {
    const array = this.arraysByName.get(name);
    array?.remove(index);
    if (array === undefined || array.isEmpty()) {
      this.arraysByName.delete(name);
    }
  }

  removeAllProperties(): void {
    for (const [name, array] of this.arraysByName) {
      array.removeAll();
      this.arraysByName.delete(name);
    }
  }

  /** True when nothing below holds a value: null values, empty strings, `false` and empty sets do not count. */
  isEmpty(): boolean {
    for (const array of this.arraysByName.values()) {
      const filled = array.some((property) => {
        if (property.hasNullValue()) return false;
        const type = property.getType();
        if (type.equals(ValueTypes.STRING) && property.getString() === '') return false;
        if (type.equals(ValueTypes.BOOLEAN) && property.getBoolean() === false) return false;
        if (type.equals(ValueTypes.DATA) && property.getPropertySet()?.isEmpty()) return false;
        return true;
      });
      if (filled) {
        return false;
      }
    }
    return true;
  }

  /** Drops null values, empty strings, `false` and sets left empty, all the way down. */
  removeEmptyValues(): void {
    const toRemove: Property[] = [];
    this.forEach((property) => {
      const type = property.getType();
      if (property.hasNullValue()) {
        toRemove.push(property);
      } else if (type.equals(ValueTypes.STRING) && property.getString() === '') {
        toRemove.push(property);
      } else if (type.equals(ValueTypes.BOOLEAN) && property.getBoolean() === false) {
        toRemove.push(property);
      } else if (type.equals(ValueTypes.DATA)) {
        const set = property.getPropertySet();
        set?.removeEmptyValues();
        if (set?.isEmpty()) {
          toRemove.push(property);
        }
      }
    });
    // Highest index first, so removing one does not shift the next.
    toRemove.sort((a, b) => b.getIndex() - a.getIndex());
    this.removeProperties(toRemove);
    this.removeEmptyArrays();
  }

  /** Drops arrays with no properties left, all the way down. */
  removeEmptySets(): void {
    this.forEach((property) => property.getPropertySet()?.removeEmptySets());
    this.removeEmptyArrays();
  }

  /** The number of properties directly in this set. */
  getSize(): number {
    let size = 0;
    for (const array of this.arraysByName.values()) {
      size += array.getSize();
    }
    return size;
  }

  countProperties(name: string): number {
    return this.arraysByName.get(name)?.getSize() ?? 0;
  }

  /** The path of the property this set is the value of; `ROOT` for the root set. */
  getPropertyPath(): PropertyPath {
    return this.property?.getPath() ?? PropertyPath.ROOT;
  }

  /**
   * With no arguments, the property this set is the value of. With a name and an index, that
   * property of this set. With a path, the property there, relative to this set.
   */
  getProperty(identifier?: string | PropertyPath, index?: number): Property | undefined {
    if (identifier === undefined) {
      return this.property;
    }
    if (index !== undefined && typeof identifier === 'string') {
      return this.arraysByName.get(identifier)?.get(index);
    }
    return this.getPropertyByPath(identifier);
  }

  getPropertyByPath(path: string | PropertyPath): Property | undefined {
    const resolved = typeof path === 'string' ? PropertyPath.fromString(path) : path;
    const first = resolved.getFirstElement();
    if (first === undefined) {
      return undefined;
    }
    const property = this.arraysByName.get(first.getName())?.get(first.getIndex());
    if (resolved.elementCount() === 1) {
      return property;
    }
    return property?.getPropertySet()?.getPropertyByPath(resolved.removeFirstPathElement());
  }

  getPropertyArray(name: string): PropertyArray | undefined {
    return this.arraysByName.get(name);
  }

  getPropertyArrays(): PropertyArray[] {
    return [...this.arraysByName.values()];
  }

  /** Every property directly in this set, array by array. */
  forEach(callback: (property: Property, index: number) => void): void {
    for (const array of this.arraysByName.values()) {
      array.forEach(callback);
    }
  }

  forEachProperty(name: string, callback: (property: Property, index: number) => void): void {
    this.arraysByName.get(name)?.forEach(callback);
  }

  reset(): void {
    this.forEach((property) => property.reset());
  }

  isNotNull(identifier: string | PropertyPath, index?: number): boolean {
    const property = this.getProperty(identifier, index);
    return property !== undefined && property.hasNonNullValue();
  }

  isNull(identifier: string | PropertyPath, index?: number): boolean {
    return !this.isNotNull(identifier, index);
  }

  equals(other: unknown): boolean {
    if (!(other instanceof PropertySet) || other.arraysByName.size !== this.arraysByName.size) {
      return false;
    }
    for (const [name, array] of this.arraysByName) {
      if (!array.equals(other.arraysByName.get(name))) {
        return false;
      }
    }
    return true;
  }

  /** What changed between this set and `other`, all the way down. */
  diff(other: PropertySet): PropertyTreeDiff {
    const checked = new Set<string>();
    const diff = this.doDiff(other, checked);
    const inverse = other.doDiff(this, checked);
    return { ...diff, added: [...diff.added, ...inverse.removed] };
  }

  /** A deep copy attached to `destinationTree`. */
  copy(destinationTree: PropertyTree | undefined): PropertySet {
    const copy = new PropertySet(destinationTree);
    for (const array of this.arraysByName.values()) {
      copy.addPropertyArray(array.copy(copy));
    }
    return copy;
  }

  addPropertiesFromSet(source: PropertySet): this {
    for (const array of source.arraysByName.values()) {
      this.addPropertyArray(array.copy(this));
    }
    return this;
  }

  toJson(): PropertyArrayJson[] {
    return [...this.arraysByName.values()].map((array) => array.toJson());
  }

  /** Any event from anywhere below. */
  onChanged(listener: (event: PropertyEvent) => void): void {
    this.changedListeners.add(listener);
  }

  unChanged(listener: (event: PropertyEvent) => void): void {
    this.changedListeners.remove(listener);
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

  /** A new set on the same tree, not yet added anywhere. */
  newSet(): PropertySet {
    if (this.tree === undefined) {
      throw new Error('The PropertySet must be attached to a PropertyTree before newSet is called');
    }
    return this.tree.newPropertySet();
  }

  addPropertySet(name: string, value?: PropertySet): PropertySet {
    const set = value ?? this.newSet();
    this.addProperty(name, new Value(set, ValueTypes.DATA));
    return set;
  }

  setPropertySet(name: string, index: number, value: PropertySet): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.DATA));
  }

  setPropertySetByPath(path: string | PropertyPath, value: PropertySet): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.DATA));
  }

  getPropertySet(identifier: string | PropertyPath, index?: number): PropertySet | undefined {
    return this.getProperty(identifier, index)?.getPropertySet();
  }

  getPropertySets(name: string): PropertySet[] {
    const sets: PropertySet[] = [];
    this.forEachProperty(name, (property) => {
      const set = property.getPropertySet();
      if (set !== undefined) {
        sets.push(set);
      }
    });
    return sets;
  }

  addString(name: string, value: string): Property {
    return this.addProperty(name, new Value(value, ValueTypes.STRING));
  }

  addStrings(name: string, values: readonly string[]): Property[] {
    return values.map((value) => this.addString(name, value));
  }

  setString(name: string, index: number, value: string): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.STRING));
  }

  setStringByPath(path: string | PropertyPath, value: string): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.STRING));
  }

  getString(identifier: string | PropertyPath, index?: number): string | undefined {
    return this.getProperty(identifier, index)?.getString();
  }

  getStrings(name: string): (string | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getString()) ?? [];
  }
  addLong(name: string, value: number): Property {
    return this.addProperty(name, new Value(value, ValueTypes.LONG));
  }

  addLongs(name: string, values: readonly number[]): Property[] {
    return values.map((value) => this.addLong(name, value));
  }

  setLong(name: string, index: number, value: number): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.LONG));
  }

  setLongByPath(path: string | PropertyPath, value: number): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.LONG));
  }

  getLong(identifier: string | PropertyPath, index?: number): number | undefined {
    return this.getProperty(identifier, index)?.getLong();
  }

  getLongs(name: string): (number | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getLong()) ?? [];
  }
  addDouble(name: string, value: number): Property {
    return this.addProperty(name, new Value(value, ValueTypes.DOUBLE));
  }

  addDoubles(name: string, values: readonly number[]): Property[] {
    return values.map((value) => this.addDouble(name, value));
  }

  setDouble(name: string, index: number, value: number): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.DOUBLE));
  }

  setDoubleByPath(path: string | PropertyPath, value: number): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.DOUBLE));
  }

  getDouble(identifier: string | PropertyPath, index?: number): number | undefined {
    return this.getProperty(identifier, index)?.getDouble();
  }

  getDoubles(name: string): (number | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getDouble()) ?? [];
  }
  addBoolean(name: string, value: boolean): Property {
    return this.addProperty(name, new Value(value, ValueTypes.BOOLEAN));
  }

  addBooleans(name: string, values: readonly boolean[]): Property[] {
    return values.map((value) => this.addBoolean(name, value));
  }

  setBoolean(name: string, index: number, value: boolean): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.BOOLEAN));
  }

  setBooleanByPath(path: string | PropertyPath, value: boolean): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.BOOLEAN));
  }

  getBoolean(identifier: string | PropertyPath, index?: number): boolean | undefined {
    return this.getProperty(identifier, index)?.getBoolean();
  }

  getBooleans(name: string): (boolean | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getBoolean()) ?? [];
  }
  addReference(name: string, value: Reference): Property {
    return this.addProperty(name, new Value(value, ValueTypes.REFERENCE));
  }

  addReferences(name: string, values: readonly Reference[]): Property[] {
    return values.map((value) => this.addReference(name, value));
  }

  setReference(name: string, index: number, value: Reference): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.REFERENCE));
  }

  setReferenceByPath(path: string | PropertyPath, value: Reference): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.REFERENCE));
  }

  getReference(identifier: string | PropertyPath, index?: number): Reference | undefined {
    return this.getProperty(identifier, index)?.getReference();
  }

  getReferences(name: string): (Reference | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getReference()) ?? [];
  }
  addBinaryReference(name: string, value: BinaryReference): Property {
    return this.addProperty(name, new Value(value, ValueTypes.BINARY_REFERENCE));
  }

  addBinaryReferences(name: string, values: readonly BinaryReference[]): Property[] {
    return values.map((value) => this.addBinaryReference(name, value));
  }

  setBinaryReference(name: string, index: number, value: BinaryReference): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.BINARY_REFERENCE));
  }

  setBinaryReferenceByPath(path: string | PropertyPath, value: BinaryReference): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.BINARY_REFERENCE));
  }

  getBinaryReference(
    identifier: string | PropertyPath,
    index?: number,
  ): BinaryReference | undefined {
    return this.getProperty(identifier, index)?.getBinaryReference();
  }

  getBinaryReferences(name: string): (BinaryReference | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getBinaryReference()) ?? [];
  }
  addGeoPoint(name: string, value: GeoPoint): Property {
    return this.addProperty(name, new Value(value, ValueTypes.GEO_POINT));
  }

  addGeoPoints(name: string, values: readonly GeoPoint[]): Property[] {
    return values.map((value) => this.addGeoPoint(name, value));
  }

  setGeoPoint(name: string, index: number, value: GeoPoint): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.GEO_POINT));
  }

  setGeoPointByPath(path: string | PropertyPath, value: GeoPoint): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.GEO_POINT));
  }

  getGeoPoint(identifier: string | PropertyPath, index?: number): GeoPoint | undefined {
    return this.getProperty(identifier, index)?.getGeoPoint();
  }

  getGeoPoints(name: string): (GeoPoint | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getGeoPoint()) ?? [];
  }
  addLocalDate(name: string, value: LocalDate): Property {
    return this.addProperty(name, new Value(value, ValueTypes.LOCAL_DATE));
  }

  addLocalDates(name: string, values: readonly LocalDate[]): Property[] {
    return values.map((value) => this.addLocalDate(name, value));
  }

  setLocalDate(name: string, index: number, value: LocalDate): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.LOCAL_DATE));
  }

  setLocalDateByPath(path: string | PropertyPath, value: LocalDate): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.LOCAL_DATE));
  }

  getLocalDate(identifier: string | PropertyPath, index?: number): LocalDate | undefined {
    return this.getProperty(identifier, index)?.getLocalDate();
  }

  getLocalDates(name: string): (LocalDate | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getLocalDate()) ?? [];
  }
  addLocalDateTime(name: string, value: LocalDateTime): Property {
    return this.addProperty(name, new Value(value, ValueTypes.LOCAL_DATE_TIME));
  }

  addLocalDateTimes(name: string, values: readonly LocalDateTime[]): Property[] {
    return values.map((value) => this.addLocalDateTime(name, value));
  }

  setLocalDateTime(name: string, index: number, value: LocalDateTime): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.LOCAL_DATE_TIME));
  }

  setLocalDateTimeByPath(path: string | PropertyPath, value: LocalDateTime): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.LOCAL_DATE_TIME));
  }

  getLocalDateTime(identifier: string | PropertyPath, index?: number): LocalDateTime | undefined {
    return this.getProperty(identifier, index)?.getLocalDateTime();
  }

  getLocalDateTimes(name: string): (LocalDateTime | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getLocalDateTime()) ?? [];
  }
  addLocalTime(name: string, value: LocalTime): Property {
    return this.addProperty(name, new Value(value, ValueTypes.LOCAL_TIME));
  }

  addLocalTimes(name: string, values: readonly LocalTime[]): Property[] {
    return values.map((value) => this.addLocalTime(name, value));
  }

  setLocalTime(name: string, index: number, value: LocalTime): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.LOCAL_TIME));
  }

  setLocalTimeByPath(path: string | PropertyPath, value: LocalTime): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.LOCAL_TIME));
  }

  getLocalTime(identifier: string | PropertyPath, index?: number): LocalTime | undefined {
    return this.getProperty(identifier, index)?.getLocalTime();
  }

  getLocalTimes(name: string): (LocalTime | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getLocalTime()) ?? [];
  }
  addDateTime(name: string, value: DateTime): Property {
    return this.addProperty(name, new Value(value, ValueTypes.DATE_TIME));
  }

  addDateTimes(name: string, values: readonly DateTime[]): Property[] {
    return values.map((value) => this.addDateTime(name, value));
  }

  setDateTime(name: string, index: number, value: DateTime): Property {
    return this.setProperty(name, index, new Value(value, ValueTypes.DATE_TIME));
  }

  setDateTimeByPath(path: string | PropertyPath, value: DateTime): Property {
    return this.setPropertyByPath(path, new Value(value, ValueTypes.DATE_TIME));
  }

  getDateTime(identifier: string | PropertyPath, index?: number): DateTime | undefined {
    return this.getProperty(identifier, index)?.getDateTime();
  }

  getDateTimes(name: string): (DateTime | undefined)[] {
    return this.getPropertyArray(name)?.map((property) => property.getDateTime()) ?? [];
  }

  private doSetProperty(path: PropertyPath, value: Value): Property {
    const first = path.getFirstElement();
    if (first === undefined) {
      throw new Error('Cannot set a property at the root path');
    }
    if (path.elementCount() === 1) {
      return this.setProperty(first.getName(), first.getIndex(), value);
    }
    return this.getOrCreateSet(first.getName(), first.getIndex()).doSetProperty(
      path.removeFirstPathElement(),
      value,
    );
  }

  private getOrCreateSet(name: string, index: number): PropertySet {
    const existing = this.getProperty(name, index)?.getPropertySet();
    if (existing !== undefined) {
      return existing;
    }
    const set = new PropertySet(this.tree);
    this.setProperty(name, index, new Value(set, ValueTypes.DATA));
    return set;
  }

  private getOrCreatePropertyArray(name: string, type: ValueType): PropertyArray {
    let array = this.arraysByName.get(name);
    if (array === undefined) {
      array = new PropertyArray({ parent: this, name, type });
      this.arraysByName.set(name, array);
      this.registerPropertyArrayListeners(array);
    }
    return array;
  }

  private removeEmptyArrays(): void {
    for (const [name, array] of this.arraysByName) {
      if (array.isEmpty()) {
        this.arraysByName.delete(name);
      }
    }
  }

  private doDiff(other: PropertySet, checked: Set<string>): PropertyTreeDiff {
    const diff: PropertyTreeDiff = { added: [], removed: [], modified: [] };
    this.forEach((property) => {
      const path = property.getPath().toString();
      if (checked.has(path)) {
        return;
      }
      const otherProperty = other.getProperty(property.getName(), property.getIndex());
      if (otherProperty === undefined) {
        diff.removed.push(property);
        return;
      }
      const set = property.getPropertySet();
      const otherSet = otherProperty.getPropertySet();
      if (set !== undefined && otherSet !== undefined) {
        const nested = set.doDiff(otherSet, checked);
        diff.added.push(...nested.added);
        diff.removed.push(...nested.removed);
        diff.modified.push(...nested.modified);
        return;
      }
      if (!property.equals(otherProperty)) {
        diff.modified.push({ oldValue: property, newValue: otherProperty });
      }
      checked.add(path);
    });
    return diff;
  }

  private registerPropertyArrayListeners(array: PropertyArray): void {
    array.onPropertyAdded(this.forwardAdded);
    array.onPropertyRemoved(this.forwardRemoved);
    array.onPropertyMoved(this.forwardMoved);
    array.onPropertyValueChanged(this.forwardValueChanged);
  }
}
