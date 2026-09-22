/**
 * The three string-backed values a property can hold besides text: a node id, an attachment name,
 * a link. Each is its own class so a `Value` can tell them apart, and each is just its string.
 */

/** The id of a node — XP's `Reference`. */
export class Reference {
  private readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  getNodeId(): string {
    return this.nodeId;
  }

  toString(): string {
    return this.nodeId;
  }

  equals(other: unknown): boolean {
    return other instanceof Reference && other.nodeId === this.nodeId;
  }
}

/** The name of a binary attached to a node — XP's `BinaryReference`. */
export class BinaryReference {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: unknown): boolean {
    return other instanceof BinaryReference && other.value === this.value;
  }
}

/** A path or url — XP's `Link`. */
export class Link {
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  getPath(): string {
    return this.path;
  }

  toString(): string {
    return this.path;
  }

  equals(other: unknown): boolean {
    return other instanceof Link && other.path === this.path;
  }
}
