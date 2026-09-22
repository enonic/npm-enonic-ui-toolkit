import type { InputTypeConfig } from './descriptor/input-type-config';
import type { InputTypeDescriptor } from './descriptor/input-type-descriptor';
import type { InputTypeDefinition } from './types';

/**
 * The input types a form can render, by registration name, case-insensitively. A value, not a
 * global: each bundle registers into its own, `inputTypeRegistry` being the one the components
 * read unless a provider hands them another.
 */
export class InputTypeRegistry {
  private readonly entries = new Map<string, InputTypeDefinition>();

  getDefinition<C extends InputTypeConfig = InputTypeConfig>(
    name: string,
  ): InputTypeDefinition<C> | undefined {
    return this.entries.get(name.toLowerCase()) as InputTypeDefinition<C> | undefined;
  }

  getDescriptor<C extends InputTypeConfig = InputTypeConfig>(
    name: string,
  ): InputTypeDescriptor<C> | undefined {
    return this.getDefinition<C>(name)?.descriptor;
  }

  has(name: string): boolean {
    return this.entries.has(name.toLowerCase());
  }

  /** Registers a type; an existing name is kept unless `force`, so an application overrides on purpose. */
  registerType<C extends InputTypeConfig>(definition: InputTypeDefinition<C>, force = false): void {
    const key = definition.descriptor.name.toLowerCase();
    if (this.entries.has(key) && !force) {
      console.warn(
        `InputTypeRegistry: "${definition.descriptor.name}" is already registered. Use force to override.`,
      );
      return;
    }
    this.entries.set(key, definition as InputTypeDefinition);
  }

  unregister(name: string): boolean {
    return this.entries.delete(name.toLowerCase());
  }

  getAll(): Map<string, InputTypeDefinition> {
    return new Map(this.entries);
  }
}

export function createInputTypeRegistry(): InputTypeRegistry {
  return new InputTypeRegistry();
}

/** The registry the components read when no `InputTypeRegistryProvider` names another. */
export const inputTypeRegistry = createInputTypeRegistry();
