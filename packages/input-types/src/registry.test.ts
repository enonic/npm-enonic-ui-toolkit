import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeoPointInput } from './components/geo-point-input';
import { TagInput } from './components/tag-input';
import { TextLineInput } from './components/text-line-input';
import { ValueTypes } from './data';
import type { InputTypeDescriptor } from './descriptor/input-type-descriptor';
import { registerBuiltInTypes } from './register-built-in-types';
import { inputTypeRegistry } from './registry';
import type {
  InputTypeComponent,
  InputTypeDefinition,
  SelfManagedInputTypeComponent,
} from './types';

vi.mock('@enonic/ui', () => ({
  Input: () => null,
}));
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

function stubDescriptor(name: string): InputTypeDescriptor {
  return {
    name,
    getValueType: () => ValueTypes.STRING,
    readConfig: () => ({}),
    createDefaultValue: () => ValueTypes.STRING.newNullValue(),
    validate: () => [],
    valueBreaksRequired: (v) => v.isNull(),
  };
}

describe('InputTypeRegistry', () => {
  beforeEach(() => {
    registerBuiltInTypes();
  });

  afterEach(() => {
    for (const [name] of inputTypeRegistry.getAll()) {
      inputTypeRegistry.unregister(name);
    }
  });

  describe('registerType', () => {
    it('registers a list definition atomically', () => {
      const descriptor = stubDescriptor('Custom');
      const component: InputTypeComponent = () => null;
      const definition: InputTypeDefinition = { mode: 'list', descriptor, component };

      inputTypeRegistry.registerType(definition);

      expect(inputTypeRegistry.getDefinition('Custom')).toEqual(definition);
      expect(inputTypeRegistry.getDescriptor('Custom')).toBe(descriptor);
    });

    it('registers descriptor-only internal definitions', () => {
      const descriptor = stubDescriptor('SelfManaged');

      inputTypeRegistry.registerType({ mode: 'internal', descriptor });

      expect(inputTypeRegistry.getDefinition('SelfManaged')).toEqual({
        mode: 'internal',
        descriptor,
      });
    });

    it('warns on duplicate registration without force', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const original = inputTypeRegistry.getDefinition('TextLine');

      inputTypeRegistry.registerType({
        mode: 'list',
        descriptor: stubDescriptor('TextLine'),
        component: () => null,
      });

      expect(inputTypeRegistry.getDefinition('TextLine')).toBe(original);
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it('overwrites an existing definition with force', () => {
      const descriptor = stubDescriptor('TextLine');
      const component: InputTypeComponent = () => null;

      inputTypeRegistry.registerType({ mode: 'single', descriptor, component }, true);

      expect(inputTypeRegistry.getDefinition('TextLine')).toEqual({
        mode: 'single',
        descriptor,
        component,
      });
    });

    it('accepts internal components when mode is internal', () => {
      const descriptor = stubDescriptor('Combo');
      const component: SelfManagedInputTypeComponent = () => null;

      inputTypeRegistry.registerType({ mode: 'internal', descriptor, component });

      expect(inputTypeRegistry.getDefinition('Combo')).toEqual({
        mode: 'internal',
        descriptor,
        component,
      });
    });
  });

  describe('built-in definitions', () => {
    it('registers expected built-in modes', () => {
      expect(inputTypeRegistry.getDefinition('TextLine')?.mode).toBe('list');
      expect(inputTypeRegistry.getDefinition('Checkbox')?.mode).toBe('single');
      expect(inputTypeRegistry.getDefinition('Tag')?.mode).toBe('internal');
      expect(inputTypeRegistry.getDefinition('ComboBox')?.mode).toBe('internal');
      expect(inputTypeRegistry.getDefinition('PrincipalSelector')?.mode).toBe('internal');
    });

    it('registers TextLine, GeoPoint, and Tag with components', () => {
      expect(inputTypeRegistry.getDefinition('TextLine')?.component).toBe(TextLineInput);
      expect(inputTypeRegistry.getDefinition('GeoPoint')?.component).toBe(GeoPointInput);
      expect(inputTypeRegistry.getDefinition('Tag')?.component).toBe(TagInput);
    });

    it('registers ComboBox with component', () => {
      expect(inputTypeRegistry.getDefinition('ComboBox')?.component).toBeDefined();
    });
  });

  describe('lookup', () => {
    it('resolves definitions regardless of case', () => {
      expect(inputTypeRegistry.getDefinition('textline')).toBe(
        inputTypeRegistry.getDefinition('TextLine'),
      );
      expect(inputTypeRegistry.getDefinition('TEXTLINE')).toBe(
        inputTypeRegistry.getDefinition('TextLine'),
      );
    });

    it('returns undefined for unknown definitions', () => {
      expect(inputTypeRegistry.getDefinition('unknown')).toBeUndefined();
      expect(inputTypeRegistry.getDescriptor('unknown')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns a copy, not the internal map', () => {
      const all = inputTypeRegistry.getAll();

      all.delete('textline');

      expect(inputTypeRegistry.has('TextLine')).toBe(true);
    });

    it('returns definition objects for every registered type', () => {
      for (const [name, definition] of inputTypeRegistry.getAll()) {
        expect(inputTypeRegistry.getDefinition(name)).toEqual(definition);
      }
    });
  });

  describe('unregister', () => {
    it('removes definitions case-insensitively', () => {
      expect(inputTypeRegistry.unregister('TEXTLINE')).toBe(true);
      expect(inputTypeRegistry.getDefinition('TextLine')).toBeUndefined();
      expect(inputTypeRegistry.getDescriptor('TextLine')).toBeUndefined();
    });

    it('returns false for unknown definitions', () => {
      expect(inputTypeRegistry.unregister('NonExistent')).toBe(false);
    });
  });
});
