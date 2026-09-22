import type { PropertyTreeJson } from '@enonic/ui-types';
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
import type {
  PropertyAddedEvent,
  PropertyEvent,
  PropertyMovedEvent,
  PropertyRemovedEvent,
  PropertyValueChangedEvent,
} from './property-event';
import type { PropertyPath } from './property-path';
import { PropertySet, type PropertyTreeDiff } from './property-set';
import type { Value } from './value';

/**
 * The root container of properties: a root `PropertySet` and the identity every set below it
 * attaches to. Every method here is the root set's, so a tree can be used where a set can; the
 * typed helpers per value type are the same as `PropertySet`'s.
 */
export class PropertyTree {
  private readonly root: PropertySet;

  /** Empty, or a deep copy of `sourceRoot` when one is given. */
  constructor(sourceRoot?: PropertySet) {
    this.root = sourceRoot === undefined ? new PropertySet(this) : sourceRoot.copy(this);
  }

  static fromJson(json: PropertyTreeJson): PropertyTree {
    const tree = new PropertyTree();
    for (const arrayJson of json) {
      tree.root.addPropertyArray(PropertyArray.fromJson(arrayJson, tree.root, tree));
    }
    return tree;
  }

  getRoot(): PropertySet {
    return this.root;
  }

  /** A new set attached to this tree, not yet added anywhere. */
  newPropertySet(): PropertySet {
    return new PropertySet(this);
  }

  addProperty(name: string, value: Value): Property {
    return this.root.addProperty(name, value);
  }

  setPropertyByPath(path: string | PropertyPath, value: Value): Property {
    return this.root.setPropertyByPath(path, value);
  }

  setProperty(name: string, index: number, value: Value): Property {
    return this.root.setProperty(name, index, value);
  }

  removeProperties(properties: readonly Property[]): void {
    this.root.removeProperties(properties);
  }

  removeProperty(name: string, index: number): void {
    this.root.removeProperty(name, index);
  }

  getProperty(identifier?: string | PropertyPath, index?: number): Property | undefined {
    return this.root.getProperty(identifier, index);
  }

  getPropertyArray(name: string): PropertyArray | undefined {
    return this.root.getPropertyArray(name);
  }

  forEachProperty(name: string, callback: (property: Property, index: number) => void): void {
    this.root.forEachProperty(name, callback);
  }

  isEmpty(): boolean {
    return this.root.isEmpty();
  }

  removeEmptyValues(): void {
    this.root.removeEmptyValues();
  }

  diff(other: PropertyTree): PropertyTreeDiff {
    return this.root.diff(other.root);
  }

  copy(): PropertyTree {
    return new PropertyTree(this.root);
  }

  toJson(): PropertyTreeJson {
    return this.root.toJson();
  }

  equals(other: unknown): boolean {
    return other instanceof PropertyTree && other.root.equals(this.root);
  }

  onChanged(listener: (event: PropertyEvent) => void): void {
    this.root.onChanged(listener);
  }

  unChanged(listener: (event: PropertyEvent) => void): void {
    this.root.unChanged(listener);
  }

  onPropertyAdded(listener: (event: PropertyAddedEvent) => void): void {
    this.root.onPropertyAdded(listener);
  }

  unPropertyAdded(listener: (event: PropertyAddedEvent) => void): void {
    this.root.unPropertyAdded(listener);
  }

  onPropertyRemoved(listener: (event: PropertyRemovedEvent) => void): void {
    this.root.onPropertyRemoved(listener);
  }

  unPropertyRemoved(listener: (event: PropertyRemovedEvent) => void): void {
    this.root.unPropertyRemoved(listener);
  }

  onPropertyMoved(listener: (event: PropertyMovedEvent) => void): void {
    this.root.onPropertyMoved(listener);
  }

  unPropertyMoved(listener: (event: PropertyMovedEvent) => void): void {
    this.root.unPropertyMoved(listener);
  }

  onPropertyValueChanged(listener: (event: PropertyValueChangedEvent) => void): void {
    this.root.onPropertyValueChanged(listener);
  }

  unPropertyValueChanged(listener: (event: PropertyValueChangedEvent) => void): void {
    this.root.unPropertyValueChanged(listener);
  }

  addPropertySet(name: string, value?: PropertySet): PropertySet {
    return this.root.addPropertySet(name, value);
  }

  setPropertySet(name: string, index: number, value: PropertySet): Property {
    return this.root.setPropertySet(name, index, value);
  }

  setPropertySetByPath(path: string | PropertyPath, value: PropertySet): Property {
    return this.root.setPropertySetByPath(path, value);
  }

  getPropertySet(identifier: string | PropertyPath, index?: number): PropertySet | undefined {
    return this.root.getPropertySet(identifier, index);
  }

  getPropertySets(name: string): PropertySet[] {
    return this.root.getPropertySets(name);
  }

  addString(name: string, value: string): Property {
    return this.root.addString(name, value);
  }

  addStrings(name: string, values: readonly string[]): Property[] {
    return this.root.addStrings(name, values);
  }

  setString(name: string, index: number, value: string): Property {
    return this.root.setString(name, index, value);
  }

  setStringByPath(path: string | PropertyPath, value: string): Property {
    return this.root.setStringByPath(path, value);
  }

  getString(identifier: string | PropertyPath, index?: number): string | undefined {
    return this.root.getString(identifier, index);
  }

  getStrings(name: string): (string | undefined)[] {
    return this.root.getStrings(name);
  }
  addLong(name: string, value: number): Property {
    return this.root.addLong(name, value);
  }

  addLongs(name: string, values: readonly number[]): Property[] {
    return this.root.addLongs(name, values);
  }

  setLong(name: string, index: number, value: number): Property {
    return this.root.setLong(name, index, value);
  }

  setLongByPath(path: string | PropertyPath, value: number): Property {
    return this.root.setLongByPath(path, value);
  }

  getLong(identifier: string | PropertyPath, index?: number): number | undefined {
    return this.root.getLong(identifier, index);
  }

  getLongs(name: string): (number | undefined)[] {
    return this.root.getLongs(name);
  }
  addDouble(name: string, value: number): Property {
    return this.root.addDouble(name, value);
  }

  addDoubles(name: string, values: readonly number[]): Property[] {
    return this.root.addDoubles(name, values);
  }

  setDouble(name: string, index: number, value: number): Property {
    return this.root.setDouble(name, index, value);
  }

  setDoubleByPath(path: string | PropertyPath, value: number): Property {
    return this.root.setDoubleByPath(path, value);
  }

  getDouble(identifier: string | PropertyPath, index?: number): number | undefined {
    return this.root.getDouble(identifier, index);
  }

  getDoubles(name: string): (number | undefined)[] {
    return this.root.getDoubles(name);
  }
  addBoolean(name: string, value: boolean): Property {
    return this.root.addBoolean(name, value);
  }

  addBooleans(name: string, values: readonly boolean[]): Property[] {
    return this.root.addBooleans(name, values);
  }

  setBoolean(name: string, index: number, value: boolean): Property {
    return this.root.setBoolean(name, index, value);
  }

  setBooleanByPath(path: string | PropertyPath, value: boolean): Property {
    return this.root.setBooleanByPath(path, value);
  }

  getBoolean(identifier: string | PropertyPath, index?: number): boolean | undefined {
    return this.root.getBoolean(identifier, index);
  }

  getBooleans(name: string): (boolean | undefined)[] {
    return this.root.getBooleans(name);
  }
  addReference(name: string, value: Reference): Property {
    return this.root.addReference(name, value);
  }

  addReferences(name: string, values: readonly Reference[]): Property[] {
    return this.root.addReferences(name, values);
  }

  setReference(name: string, index: number, value: Reference): Property {
    return this.root.setReference(name, index, value);
  }

  setReferenceByPath(path: string | PropertyPath, value: Reference): Property {
    return this.root.setReferenceByPath(path, value);
  }

  getReference(identifier: string | PropertyPath, index?: number): Reference | undefined {
    return this.root.getReference(identifier, index);
  }

  getReferences(name: string): (Reference | undefined)[] {
    return this.root.getReferences(name);
  }
  addBinaryReference(name: string, value: BinaryReference): Property {
    return this.root.addBinaryReference(name, value);
  }

  addBinaryReferences(name: string, values: readonly BinaryReference[]): Property[] {
    return this.root.addBinaryReferences(name, values);
  }

  setBinaryReference(name: string, index: number, value: BinaryReference): Property {
    return this.root.setBinaryReference(name, index, value);
  }

  setBinaryReferenceByPath(path: string | PropertyPath, value: BinaryReference): Property {
    return this.root.setBinaryReferenceByPath(path, value);
  }

  getBinaryReference(
    identifier: string | PropertyPath,
    index?: number,
  ): BinaryReference | undefined {
    return this.root.getBinaryReference(identifier, index);
  }

  getBinaryReferences(name: string): (BinaryReference | undefined)[] {
    return this.root.getBinaryReferences(name);
  }
  addGeoPoint(name: string, value: GeoPoint): Property {
    return this.root.addGeoPoint(name, value);
  }

  addGeoPoints(name: string, values: readonly GeoPoint[]): Property[] {
    return this.root.addGeoPoints(name, values);
  }

  setGeoPoint(name: string, index: number, value: GeoPoint): Property {
    return this.root.setGeoPoint(name, index, value);
  }

  setGeoPointByPath(path: string | PropertyPath, value: GeoPoint): Property {
    return this.root.setGeoPointByPath(path, value);
  }

  getGeoPoint(identifier: string | PropertyPath, index?: number): GeoPoint | undefined {
    return this.root.getGeoPoint(identifier, index);
  }

  getGeoPoints(name: string): (GeoPoint | undefined)[] {
    return this.root.getGeoPoints(name);
  }
  addLocalDate(name: string, value: LocalDate): Property {
    return this.root.addLocalDate(name, value);
  }

  addLocalDates(name: string, values: readonly LocalDate[]): Property[] {
    return this.root.addLocalDates(name, values);
  }

  setLocalDate(name: string, index: number, value: LocalDate): Property {
    return this.root.setLocalDate(name, index, value);
  }

  setLocalDateByPath(path: string | PropertyPath, value: LocalDate): Property {
    return this.root.setLocalDateByPath(path, value);
  }

  getLocalDate(identifier: string | PropertyPath, index?: number): LocalDate | undefined {
    return this.root.getLocalDate(identifier, index);
  }

  getLocalDates(name: string): (LocalDate | undefined)[] {
    return this.root.getLocalDates(name);
  }
  addLocalDateTime(name: string, value: LocalDateTime): Property {
    return this.root.addLocalDateTime(name, value);
  }

  addLocalDateTimes(name: string, values: readonly LocalDateTime[]): Property[] {
    return this.root.addLocalDateTimes(name, values);
  }

  setLocalDateTime(name: string, index: number, value: LocalDateTime): Property {
    return this.root.setLocalDateTime(name, index, value);
  }

  setLocalDateTimeByPath(path: string | PropertyPath, value: LocalDateTime): Property {
    return this.root.setLocalDateTimeByPath(path, value);
  }

  getLocalDateTime(identifier: string | PropertyPath, index?: number): LocalDateTime | undefined {
    return this.root.getLocalDateTime(identifier, index);
  }

  getLocalDateTimes(name: string): (LocalDateTime | undefined)[] {
    return this.root.getLocalDateTimes(name);
  }
  addLocalTime(name: string, value: LocalTime): Property {
    return this.root.addLocalTime(name, value);
  }

  addLocalTimes(name: string, values: readonly LocalTime[]): Property[] {
    return this.root.addLocalTimes(name, values);
  }

  setLocalTime(name: string, index: number, value: LocalTime): Property {
    return this.root.setLocalTime(name, index, value);
  }

  setLocalTimeByPath(path: string | PropertyPath, value: LocalTime): Property {
    return this.root.setLocalTimeByPath(path, value);
  }

  getLocalTime(identifier: string | PropertyPath, index?: number): LocalTime | undefined {
    return this.root.getLocalTime(identifier, index);
  }

  getLocalTimes(name: string): (LocalTime | undefined)[] {
    return this.root.getLocalTimes(name);
  }
  addDateTime(name: string, value: DateTime): Property {
    return this.root.addDateTime(name, value);
  }

  addDateTimes(name: string, values: readonly DateTime[]): Property[] {
    return this.root.addDateTimes(name, values);
  }

  setDateTime(name: string, index: number, value: DateTime): Property {
    return this.root.setDateTime(name, index, value);
  }

  setDateTimeByPath(path: string | PropertyPath, value: DateTime): Property {
    return this.root.setDateTimeByPath(path, value);
  }

  getDateTime(identifier: string | PropertyPath, index?: number): DateTime | undefined {
    return this.root.getDateTime(identifier, index);
  }

  getDateTimes(name: string): (DateTime | undefined)[] {
    return this.root.getDateTimes(name);
  }
}
