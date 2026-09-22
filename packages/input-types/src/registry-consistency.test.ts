import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@enonic/ui', () => ({ Input: () => null, TextArea: () => null }));
vi.mock('lucide-react', () => ({
  GripVertical: () => null,
  Plus: () => null,
  Square: () => null,
  X: () => null,
}));
vi.mock('@dnd-kit/core', () => ({
  DndContext: () => null,
  KeyboardSensor: class KeyboardSensor {},
  MouseSensor: class MouseSensor {},
  TouchSensor: class TouchSensor {},
  closestCenter: () => undefined,
  useSensor: () => undefined,
  useSensors: () => [],
}));
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: () => null,
  rectSortingStrategy: () => undefined,
  sortableKeyboardCoordinates: () => undefined,
  useSortable: () => ({}),
}));
import { registerBuiltInTypes } from './register-built-in-types';
import { inputTypeRegistry } from './registry';

describe('Registry consistency', () => {
  beforeEach(() => {
    registerBuiltInTypes();
  });

  afterEach(() => {
    for (const [name] of inputTypeRegistry.getAll()) {
      inputTypeRegistry.unregister(name);
    }
  });

  it('every definition contains a descriptor', () => {
    for (const [name, definition] of inputTypeRegistry.getAll()) {
      expect(definition.descriptor, `Definition "${name}" has no descriptor`).toBeDefined();
    }
  });

  it('getDefinition mirrors getAll entries', () => {
    for (const [name, definition] of inputTypeRegistry.getAll()) {
      expect(inputTypeRegistry.getDefinition(name), `"${name}" lookup mismatch`).toEqual(
        definition,
      );
    }
  });

  it('internal descriptor-only definitions are allowed', () => {
    for (const [, definition] of inputTypeRegistry.getAll()) {
      if (definition.mode === 'internal' && definition.component == null) {
        expect(definition.descriptor.name).toBeTruthy();
      }
    }
  });

  it('component-bearing definitions are a subset of all definitions', () => {
    const all = inputTypeRegistry.getAll();
    let componentCount = 0;

    for (const [, definition] of all) {
      if (definition.component) componentCount++;
    }

    expect(componentCount).toBeGreaterThan(0);
    expect(componentCount).toBeLessThanOrEqual(all.size);
  });

  it('built-in single mode is only used for single-value input types', () => {
    expect(inputTypeRegistry.getDefinition('Checkbox')?.mode).toBe('single');
    expect(inputTypeRegistry.getDefinition('RadioButton')?.mode).toBe('single');
    expect(inputTypeRegistry.getDefinition('TextLine')?.mode).toBe('list');
  });
});
