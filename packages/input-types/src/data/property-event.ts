import type { Property } from './property';
import type { PropertyPath } from './property-path';
import type { Value } from './value';

export type PropertyEventType = 'added' | 'moved' | 'valueChanged' | 'removed';

/** What a tree reports: which property, and what happened to it. */
export class PropertyEvent {
  private readonly type: PropertyEventType;
  private readonly property: Property;

  constructor(type: PropertyEventType, property: Property) {
    this.type = type;
    this.property = property;
  }

  getType(): PropertyEventType {
    return this.type;
  }

  getProperty(): Property {
    return this.property;
  }

  getPath(): PropertyPath {
    return this.property.getPath();
  }

  toString(): string {
    return this.getPath().toString();
  }
}

export class PropertyAddedEvent extends PropertyEvent {
  constructor(property: Property) {
    super('added', property);
  }
}

export class PropertyRemovedEvent extends PropertyEvent {
  constructor(property: Property) {
    super('removed', property);
  }
}

export class PropertyMovedEvent extends PropertyEvent {
  private readonly from: number;
  private readonly to: number;

  constructor(property: Property, from: number, to: number) {
    super('moved', property);
    this.from = from;
    this.to = to;
  }

  getFrom(): number {
    return this.from;
  }

  getTo(): number {
    return this.to;
  }

  override toString(): string {
    return `${this.getPath().toString()}: [${this.from}] -> [${this.to}]`;
  }
}

export class PropertyValueChangedEvent extends PropertyEvent {
  private readonly previousValue: Value;
  private readonly newValue: Value;
  private readonly force: boolean;

  constructor(property: Property, previousValue: Value, newValue: Value, force = false) {
    super('valueChanged', property);
    this.previousValue = previousValue;
    this.newValue = newValue;
    this.force = force;
  }

  getPreviousValue(): Value {
    return this.previousValue;
  }

  getNewValue(): Value {
    return this.newValue;
  }

  /** Set when the change was reported although the value compares equal. */
  isForce(): boolean {
    return this.force;
  }
}

/** A listener list that unsubscribes by identity. */
export class Listeners<E> {
  private listeners: ((event: E) => void)[] = [];

  add(listener: (event: E) => void): void {
    this.listeners.push(listener);
  }

  remove(listener: (event: E) => void): void {
    this.listeners = this.listeners.filter((candidate) => candidate !== listener);
  }

  notify(event: E): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  clear(): void {
    this.listeners = [];
  }
}
