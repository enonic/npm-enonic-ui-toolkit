/** The name an input type is registered under; an application's own carries the `custom:` prefix. */
export class InputTypeName {
  private static readonly CUSTOM_PREFIX = 'custom:';

  private readonly name: string;
  private readonly custom: boolean;

  constructor(name: string, custom = false) {
    this.name = name;
    this.custom = custom;
  }

  static parseInputTypeName(str: string): InputTypeName {
    return str.startsWith(InputTypeName.CUSTOM_PREFIX)
      ? new InputTypeName(str.substring(InputTypeName.CUSTOM_PREFIX.length), true)
      : new InputTypeName(str, false);
  }

  getName(): string {
    return this.name;
  }

  isBuiltIn(): boolean {
    return !this.custom;
  }

  toString(): string {
    return this.custom ? InputTypeName.CUSTOM_PREFIX + this.name : this.name;
  }

  toJson(): string {
    return this.toString();
  }

  equals(other: unknown): boolean {
    return (
      other instanceof InputTypeName && other.name === this.name && other.custom === this.custom
    );
  }
}
