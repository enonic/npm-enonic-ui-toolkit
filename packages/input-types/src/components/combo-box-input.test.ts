import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValueTypes } from '../data';
import type { ComboBoxConfig } from '../descriptor/input-type-config';
import { ComboBoxDescriptor } from '../descriptor/option-descriptors';
import { Occurrences } from '../schema';
import type { SelfManagedComponentProps } from '../types';
import { ComboBoxInput } from './combo-box-input';

const mocks = vi.hoisted(() => ({
  useState: vi.fn((initial: unknown) => [
    typeof initial === 'function' ? (initial as () => unknown)() : initial,
    vi.fn(),
  ]),
  useMemo: vi.fn((factory: () => unknown) => factory()),
  useCallback: vi.fn((callback: unknown) => callback),
  useI18n: vi.fn(() => (key: string) => key),
  useValidationVisibility: vi.fn(() => 'all'),
}));

vi.mock('react', () => ({
  useState: mocks.useState,
  useMemo: mocks.useMemo,
  useCallback: mocks.useCallback,
}));

// ? Component mocks are string tags — the element tree is inspected, never rendered
vi.mock('lucide-react', () => ({
  Square: () => null,
  X: () => null,
}));

vi.mock('@enonic/ui', () => ({
  Combobox: {
    Root: 'Combobox.Root',
    Content: 'Combobox.Content',
    Control: 'Combobox.Control',
    Search: 'Combobox.Search',
    SearchIcon: 'Combobox.SearchIcon',
    Input: 'Combobox.Input',
    Apply: 'Combobox.Apply',
    Toggle: 'Combobox.Toggle',
    Popup: 'Combobox.Popup',
  },
  Listbox: { Content: 'Listbox.Content', Item: 'Listbox.Item' },
  cn: (...tokens: unknown[]) => tokens.filter(Boolean).join(' '),
  FilledSquareCheck: 'FilledSquareCheck',
  IconButton: 'IconButton',
}));

vi.mock('../i18n/use-phrases', () => ({
  useInputTypesPhrases: () => (key: string) => key,
}));

vi.mock('../context/validation-visibility', () => ({
  useValidationVisibility: mocks.useValidationVisibility,
}));

vi.mock('./field-error', () => ({ FieldError: 'FieldError' }));

vi.mock('./sortable-grid-list', () => ({ SortableGridList: 'SortableGridList' }));

type ComboBoxInputProps = SelfManagedComponentProps<ComboBoxConfig>;

function makeProps(overrides: Partial<ComboBoxInputProps> = {}): ComboBoxInputProps {
  return {
    occurrenceIds: [],
    values: [],
    onChange: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    occurrences: Occurrences.minmax(1, 3),
    config: { options: [{ label: 'Alpha', value: 'a' }] },
    input: null as never,
    enabled: true,
    errors: [],
    ...overrides,
  };
}

function getElementProps(
  type: string,
  overrides: Partial<ComboBoxInputProps> = {},
): Record<string, any> {
  const element = ComboBoxInput(makeProps(overrides)) as { props: { children: any[] } };
  const child = element.props.children.find((c) => c && c.type === type);
  if (!child) {
    throw new Error(`${type} was not rendered`);
  }
  return child.props;
}

describe('ComboBoxInput', () => {
  describe('selection', () => {
    beforeEach(() => {
      mocks.useState.mockReset();
      mocks.useState.mockImplementation((initial: unknown) => [
        typeof initial === 'function' ? (initial as () => unknown)() : initial,
        vi.fn(),
      ]);
    });

    it('removes what was deselected, last first, and adds what was picked', () => {
      const onAdd = vi.fn();
      const onRemove = vi.fn();
      const values = [
        ValueTypes.STRING.newValue('a'),
        ValueTypes.STRING.newValue('b'),
        ValueTypes.STRING.newValue('c'),
      ];

      getElementProps('Combobox.Root', {
        values,
        onAdd,
        onRemove,
        occurrences: Occurrences.minmax(0, 0),
      }).onSelectionChange(['b', 'd']);

      expect(onRemove.mock.calls).toEqual([[2], [0]]);
      expect(onAdd).toHaveBeenCalledExactlyOnceWith(ValueTypes.STRING.newValue('d'));
    });

    it('keys the rows by occurrence, so two equal values stay two rows', () => {
      const values = [ValueTypes.STRING.newValue('a'), ValueTypes.STRING.newValue('a')];
      const { keyExtractor } = getElementProps('SortableGridList', {
        occurrenceIds: ['occurrence-0', 'occurrence-1'],
        values,
        occurrences: Occurrences.minmax(0, 2),
      });

      expect(values.map((value, index) => keyExtractor(value, index))).toEqual([
        'occurrence-0',
        'occurrence-1',
      ]);
    });
  });

  describe('descriptor integration', () => {
    it('should parse config options correctly', () => {
      const config = ComboBoxDescriptor.readConfig({
        options: [
          { value: 'Label 1', '@value': 'key1' },
          { value: 'Label 2', '@value': 'key2' },
        ],
      });

      expect(config.options).toEqual([
        { label: 'Label 1', value: 'key1' },
        { label: 'Label 2', value: 'key2' },
      ]);
    });
  });

  describe('validation visibility', () => {
    beforeEach(() => {
      mocks.useState.mockReset();
      mocks.useState.mockImplementation((initial: unknown) => [
        typeof initial === 'function' ? (initial as () => unknown)() : initial,
        vi.fn(),
      ]);
      mocks.useValidationVisibility.mockReturnValue('all');
    });

    it('does not surface the occurrence error on untouched new content in interactive mode', () => {
      mocks.useValidationVisibility.mockReturnValue('interactive');
      expect(getElementProps('Combobox.Root').error).toBe(false);
    });

    it('surfaces the occurrence error for an empty required field once validation is fully visible', () => {
      expect(getElementProps('Combobox.Root').error).toBe(true);
    });

    it('surfaces the occurrence error on new content once the field has been interacted with', () => {
      mocks.useValidationVisibility.mockReturnValue('interactive');
      mocks.useState
        .mockImplementationOnce(() => [undefined, vi.fn()])
        .mockImplementationOnce(() => [true, vi.fn()]);
      expect(getElementProps('Combobox.Root').error).toBe(true);
    });

    it('marks the field touched on selection change', () => {
      const setTouched = vi.fn();
      mocks.useState
        .mockImplementationOnce(() => [undefined, vi.fn()])
        .mockImplementationOnce(() => [false, setTouched]);
      getElementProps('Combobox.Root').onSelectionChange([]);
      expect(setTouched).toHaveBeenCalledWith(true);
    });
  });
});
