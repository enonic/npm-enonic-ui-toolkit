/** One step of a path: a property name and its index in its array; index 0 is written bare. */
export class PropertyPathElement {
  private readonly name: string;
  private readonly index: number;

  constructor(name: string, index: number) {
    this.name = name;
    this.index = index;
  }

  static fromString(str: string): PropertyPathElement {
    const open = str.indexOf('[');
    if (open === -1) {
      return new PropertyPathElement(str, 0);
    }
    return new PropertyPathElement(
      str.substring(0, open),
      Number.parseInt(str.substring(open + 1, str.indexOf(']')), 10),
    );
  }

  getName(): string {
    return this.name;
  }

  getIndex(): number {
    return this.index;
  }

  toString(): string {
    return this.index === 0 ? this.name : `${this.name}[${this.index}]`;
  }
}

/**
 * The address of a property in a tree: `.address[1].zip`. Absolute when it starts at the root,
 * which a leading `.` marks; relative when it is read from some set down the tree.
 */
export class PropertyPath {
  private static readonly DIVIDER = '.';

  static readonly ROOT = new PropertyPath([], true);

  private readonly elements: readonly PropertyPathElement[];
  private readonly absolute: boolean;
  private readonly refString: string;

  constructor(elements: readonly PropertyPathElement[], absolute = true) {
    elements.forEach((element, index) => {
      if (element.getName().length === 0) {
        throw new Error(`Path element was empty string at index: ${index}`);
      }
    });
    this.elements = elements;
    this.absolute = absolute;
    this.refString = (absolute ? PropertyPath.DIVIDER : '') + elements.join(PropertyPath.DIVIDER);
  }

  static fromString(s: string): PropertyPath {
    const absolute = s.startsWith(PropertyPath.DIVIDER);
    const elements = s
      .split(PropertyPath.DIVIDER)
      .filter((element) => element.length > 0)
      .map((element) => PropertyPathElement.fromString(element));
    return new PropertyPath(elements, absolute);
  }

  static fromParent(parent: PropertyPath, ...children: PropertyPathElement[]): PropertyPath {
    return new PropertyPath([...parent.elements, ...children], parent.absolute);
  }

  static fromPathElement(element: PropertyPathElement): PropertyPath {
    return new PropertyPath([element], true);
  }

  removeFirstPathElement(): PropertyPath {
    if (this.elements.length < 2) {
      throw new Error('Cannot remove the first element of a path with fewer than two elements');
    }
    return new PropertyPath(this.elements.slice(1), this.absolute);
  }

  elementCount(): number {
    return this.elements.length;
  }

  getElements(): readonly PropertyPathElement[] {
    return this.elements;
  }

  getElement(index: number): PropertyPathElement | undefined {
    return this.elements[index];
  }

  getFirstElement(): PropertyPathElement | undefined {
    return this.elements[0];
  }

  getLastElement(): PropertyPathElement | undefined {
    return this.elements[this.elements.length - 1];
  }

  hasParent(): boolean {
    return this.elements.length > 0;
  }

  getParentPath(): PropertyPath | undefined {
    return this.elements.length === 0 ? undefined : new PropertyPath(this.elements.slice(0, -1));
  }

  isAbsolute(): boolean {
    return this.absolute;
  }

  asRelative(): PropertyPath {
    return new PropertyPath(this.elements, false);
  }

  isRoot(): boolean {
    return this.elements.length === 0;
  }

  toString(): string {
    return this.refString;
  }

  equals(other: unknown): boolean {
    return other instanceof PropertyPath && other.refString === this.refString;
  }
}
