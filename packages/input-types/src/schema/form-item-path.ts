export class FormItemPathElement {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  static fromString(str: string): FormItemPathElement {
    return new FormItemPathElement(str);
  }

  getName(): string {
    return this.name;
  }

  toString(): string {
    return this.name;
  }
}

/** Where a form item sits in its form: the names of its containers and its own, `.address.zip`. */
export class FormItemPath {
  private static readonly DIVIDER = '.';

  static readonly ROOT = new FormItemPath([], true);

  private readonly elements: readonly FormItemPathElement[];
  private readonly absolute: boolean;
  private readonly refString: string;

  constructor(elements: readonly FormItemPathElement[], absolute = true) {
    elements.forEach((element, index) => {
      if (element.getName().length === 0) {
        throw new Error(`Path element was empty string at index: ${index}`);
      }
    });
    this.elements = elements;
    this.absolute = absolute;
    this.refString = (absolute ? FormItemPath.DIVIDER : '') + elements.join(FormItemPath.DIVIDER);
  }

  static fromString(s: string): FormItemPath {
    const absolute = s.startsWith(FormItemPath.DIVIDER);
    const elements = s
      .split(FormItemPath.DIVIDER)
      .filter((element) => element.length > 0)
      .map((element) => FormItemPathElement.fromString(element));
    return new FormItemPath(elements, absolute);
  }

  static fromParent(parent: FormItemPath, ...children: FormItemPathElement[]): FormItemPath {
    return new FormItemPath([...parent.elements, ...children], parent.absolute);
  }

  newWithoutFirstElement(): FormItemPath {
    return new FormItemPath(this.elements.slice(1), this.absolute);
  }

  elementCount(): number {
    return this.elements.length;
  }

  getElements(): readonly FormItemPathElement[] {
    return this.elements;
  }

  getElement(index: number): FormItemPathElement | undefined {
    return this.elements[index];
  }

  getFirstElement(): FormItemPathElement | undefined {
    return this.elements[0];
  }

  getLastElement(): FormItemPathElement | undefined {
    return this.elements[this.elements.length - 1];
  }

  hasParent(): boolean {
    return this.elements.length > 0;
  }

  getParentPath(): FormItemPath | undefined {
    return this.elements.length === 0 ? undefined : new FormItemPath(this.elements.slice(0, -1));
  }

  isAbsolute(): boolean {
    return this.absolute;
  }

  toString(): string {
    return this.refString;
  }

  equals(other: unknown): boolean {
    return other instanceof FormItemPath && other.refString === this.refString;
  }
}
