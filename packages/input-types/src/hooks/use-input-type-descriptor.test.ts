import type { InputConfigJson } from '@enonic/ui-types';
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
import { ValueTypes } from '../data';
import type { TextLineConfig } from '../descriptor/input-type-config';
import { registerBuiltInTypes } from '../register-built-in-types';
import { inputTypeRegistry } from '../registry';
import { type Input, InputBuilder } from '../schema';
import { InputTypeName } from '../schema';
import { Occurrences } from '../schema';

function makeInput(typeName: string, config: InputConfigJson | undefined = {}): Input {
  return new InputBuilder()
    .setName('testField')
    .setInputType(new InputTypeName(typeName, false))
    .setLabel('Test')
    .setOccurrences(Occurrences.minmax(0, 1))
    .setInputTypeConfig(config)
    .build();
}

describe('useInputTypeDescriptor — logic', () => {
  beforeEach(() => {
    registerBuiltInTypes();
  });

  afterEach(() => {
    for (const [name] of inputTypeRegistry.getAll()) {
      inputTypeRegistry.unregister(name);
    }
  });

  describe('known type lookup', () => {
    it('returns descriptor and config for TextLine', () => {
      const input = makeInput('TextLine', { maxLength: [{ value: 100 }] });
      const descriptor = inputTypeRegistry.getDescriptor<TextLineConfig>(
        input.getInputType().getName(),
      );

      expect(descriptor).toBeDefined();
      expect(descriptor?.name).toBe('TextLine');
      expect(descriptor?.getValueType()).toBe(ValueTypes.STRING);

      const config = descriptor?.readConfig(input.getInputTypeConfig() ?? {});
      expect(config?.maxLength).toBe(100);
    });

    it('parses config correctly for TextLine with regexp', () => {
      const input = makeInput('TextLine', { regexp: [{ value: '^[A-Z]+$' }] });
      const descriptor = inputTypeRegistry.getDescriptor<TextLineConfig>(
        input.getInputType().getName(),
      );

      const config = descriptor?.readConfig(input.getInputTypeConfig() ?? {});
      expect(config?.regexp).toBeInstanceOf(RegExp);
      expect(config?.regexp?.source).toBe('^[A-Z]+$');
    });
  });

  describe('unknown type', () => {
    it('returns undefined for unregistered type', () => {
      const input = makeInput('UnknownWidget');
      const descriptor = inputTypeRegistry.getDescriptor(input.getInputType().getName());
      expect(descriptor).toBeUndefined();
    });
  });

  describe('case-insensitive lookup', () => {
    it('resolves descriptor regardless of case', () => {
      const lower = makeInput('textline');
      const upper = makeInput('TEXTLINE');
      const mixed = makeInput('TextLine');

      const d1 = inputTypeRegistry.getDescriptor(lower.getInputType().getName());
      const d2 = inputTypeRegistry.getDescriptor(upper.getInputType().getName());
      const d3 = inputTypeRegistry.getDescriptor(mixed.getInputType().getName());

      expect(d1).toBeDefined();
      expect(d1).toBe(d2);
      expect(d2).toBe(d3);
    });
  });

  describe('config parsing produces typed config', () => {
    it('returns empty-like config for empty raw config', () => {
      const input = makeInput('TextLine', {});
      const descriptor = inputTypeRegistry.getDescriptor<TextLineConfig>(
        input.getInputType().getName(),
      );

      const config = descriptor?.readConfig(input.getInputTypeConfig() ?? {});
      expect(config?.regexp).toBeUndefined();
      expect(config?.maxLength).toBe(-1);
      expect(config?.showCounter).toBe(false);
    });

    it('handles undefined config gracefully', () => {
      const input = makeInput('TextLine', undefined);
      const descriptor = inputTypeRegistry.getDescriptor<TextLineConfig>(
        input.getInputType().getName(),
      );

      const config = descriptor?.readConfig(input.getInputTypeConfig() ?? {});
      expect(config?.regexp).toBeUndefined();
      expect(config?.maxLength).toBe(-1);
      expect(config?.showCounter).toBe(false);
    });
  });
});
