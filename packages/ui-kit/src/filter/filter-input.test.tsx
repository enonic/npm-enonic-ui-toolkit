// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/preact';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { type ReactElement, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FilterField } from './filter-fields';
import { FilterInput } from './filter-input';
import { EMPTY_FILTER, type FilterQuery } from './filter-query';

const ID_PROVIDER: FilterField = {
  id: 'idProvider',
  label: 'ID provider',
  values: [
    { id: 'ldap', label: 'Company directory', count: 7 },
    { id: 'entraid', label: 'Entra ID', count: 3 },
    { id: 'guests', label: 'Guests', count: 0 },
  ],
};

const STATUS: FilterField = {
  id: 'status',
  label: 'Status',
  multiple: false,
  values: [
    { id: 'enabled', label: 'Enabled' },
    { id: 'disabled', label: 'Disabled' },
  ],
};

const SCOPE: FilterField = {
  id: 'scope',
  label: 'Scope',
  notice: 'Projects could not be loaded',
  values: [
    { id: 'system', label: 'System roles', count: 2 },
    { id: 'project:intranet', label: 'intranet', count: 1, group: 'Project roles' },
  ],
};

type HarnessProps = {
  fields?: readonly FilterField[];
  initial?: FilterQuery;
  onChange?: (query: FilterQuery) => void;
};

const Harness = ({
  fields = [ID_PROVIDER, STATUS],
  initial = EMPTY_FILTER,
  onChange,
}: HarnessProps): ReactElement => {
  const [query, setQuery] = useState<FilterQuery>(initial);

  return (
    <div>
      <button type="button">Elsewhere</button>
      <FilterInput
        fields={fields}
        value={query}
        onChange={(next) => {
          setQuery(next);
          onChange?.(next);
        }}
        placeholder="Search users"
      />
    </div>
  );
};

type Mounted = {
  user: UserEvent;
  input: HTMLInputElement;
  tags: () => string[];
};

function mount(props: HarnessProps = {}): Mounted {
  render(<Harness {...props} />);
  const user = userEvent.setup();
  const input = screen.getByRole('combobox');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('The filter renders no text input');
  }

  return {
    user,
    input,
    tags: () =>
      screen
        .queryAllByRole('button', { name: /^Remove / })
        .map((cross) => cross.getAttribute('aria-label')?.replace(/^Remove /, '') ?? ''),
  };
}

const listbox = (): HTMLElement | null => screen.queryByRole('listbox');
const attr = (element: Element | null, name: string): string | null =>
  element?.getAttribute(name) ?? null;
const options = (): string[] =>
  screen
    .queryAllByRole('option')
    .map((option) => option.textContent?.replace(/\(\d+\)$/, '') ?? '');

afterEach(cleanup);

describe('FilterInput', () => {
  describe('opening', () => {
    it('opens the fields on a click, not on focus alone', async () => {
      const { user, input } = mount();

      input.focus();
      expect(listbox()).toBeNull();

      await user.click(input);
      expect(options()).toEqual(['ID provider', 'Status']);
    });

    it('opens on a keystroke and narrows the fields by it', async () => {
      const { user, input } = mount();

      await user.type(input, 'stat');
      expect(options()).toEqual(['Status']);
    });

    it('takes a click on the box as a click on the input', async () => {
      const { user, input } = mount();
      const box = document.querySelector('[data-component="FilterInput"]');
      if (!(box instanceof HTMLElement)) {
        throw new Error('The filter renders no box');
      }

      await user.click(box);
      expect(document.activeElement).toBe(input);
      expect(listbox()).not.toBeNull();
    });

    it('stays closed when there are no fields and nothing is typed', async () => {
      const { user, input } = mount({ fields: [] });

      await user.click(input);
      expect(listbox()).toBeNull();
    });
  });

  describe('text terms', () => {
    it('adds typed text as a tag on Enter and clears the input', async () => {
      const { user, input, tags } = mount();

      await user.type(input, 'alice{Enter}');
      expect(tags()).toEqual(['alice']);
      expect(input.value).toBe('');
    });

    it('reads a second spelling of the same word as the same tag, and says nothing of it', async () => {
      const onChange = vi.fn();
      const { user, input, tags } = mount({ onChange });

      await user.type(input, 'Alice{Enter}');
      await user.type(input, 'alice{Enter}');
      expect(tags()).toEqual(['Alice']);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(input.value).toBe('');
    });

    it('takes the last tag back on Backspace in the empty input', async () => {
      const { user, input, tags } = mount({
        initial: [
          { kind: 'text', text: 'alice' },
          { kind: 'text', text: 'ward' },
        ],
      });

      await user.type(input, '{Backspace}');
      expect(tags()).toEqual(['alice']);
    });
  });

  describe('field terms', () => {
    it('enters a field on pick and shows its values by hits, the empty one disabled', async () => {
      const { user, input } = mount();

      await user.click(input);
      await user.click(screen.getByRole('option', { name: /ID provider/ }));

      expect(options()).toEqual(['Company directory', 'Entra ID', 'Guests']);
      expect(attr(screen.getByRole('option', { name: /Guests/ }), 'aria-disabled')).toBe('true');
      expect(attr(input, 'aria-label')).toBe('ID provider: Pick a value');
      expect(attr(listbox(), 'aria-label')).toBe('ID provider');
      expect(attr(listbox(), 'aria-multiselectable')).toBe('true');
    });

    it('enters a field once its label and a colon are typed', async () => {
      const { user, input } = mount();

      await user.type(input, 'id provider:');
      expect(options()).toEqual(['Company directory', 'Entra ID', 'Guests']);
      expect(input.value).toBe('');
    });

    it('reads a pasted `Field: value` as the field with the value typed', async () => {
      const { user, input, tags } = mount();

      await user.click(input);
      await user.paste('ID provider: entra');
      expect(options()).toEqual(['Entra ID']);

      await user.keyboard('{Enter}');
      expect(tags()).toEqual(['ID provider: Entra ID']);
    });

    it('highlights the first value when the list opens from the input, and the one typed to', async () => {
      const { user, input } = mount();

      await user.type(input, 'ID provider:');
      expect(attr(screen.getByRole('option', { name: /Company directory/ }), 'data-active')).toBe(
        'true',
      );

      await user.type(input, 'entra');
      expect(attr(screen.getByRole('option', { name: /Entra ID/ }), 'data-active')).toBe('true');
    });

    it('highlights no field while a search term is typed', async () => {
      const { user, input } = mount();

      await user.click(input);
      expect(attr(screen.getByRole('option', { name: /ID provider/ }), 'data-active')).toBe('true');

      await user.type(input, 'id');
      expect(attr(screen.getByRole('option', { name: /ID provider/ }), 'data-active')).toBeNull();
    });

    it('toggles the highlighted value on Enter — the same one again, not the next', async () => {
      const { user, input, tags } = mount();

      await user.type(input, 'ID provider:{Enter}');
      expect(tags()).toEqual(['ID provider: Company directory']);
      expect(options()).toEqual(['Company directory', 'Entra ID', 'Guests']);

      await user.keyboard('{Enter}');
      expect(tags()).toEqual([]);
      expect(listbox()).not.toBeNull();
    });

    it('keeps a value picked from a narrowed list highlighted once the list widens again', async () => {
      const { user, input, tags } = mount();

      await user.type(input, 'ID provider:entra{Enter}');
      expect(tags()).toEqual(['ID provider: Entra ID']);
      expect(options()).toEqual(['Company directory', 'Entra ID', 'Guests']);
      expect(attr(screen.getByRole('option', { name: /Entra ID/ }), 'data-active')).toBe('true');

      await user.keyboard('{Enter}');
      expect(tags()).toEqual([]);
    });

    it('picks the highlighted value on Enter with nothing typed, and keeps the values open', async () => {
      const { user, input, tags } = mount();

      await user.type(input, 'ID provider:{Enter}');
      expect(tags()).toEqual(['ID provider: Company directory']);
      expect(options()).toEqual(['Company directory', 'Entra ID', 'Guests']);

      await user.click(screen.getByRole('option', { name: /Entra ID/ }));
      expect(tags()).toEqual(['ID provider: Company directory', 'ID provider: Entra ID']);
      expect(listbox()).not.toBeNull();
    });

    it('keeps a value picked from the keyboard focused, so the next arrow reaches the next value', async () => {
      const { user, input, tags } = mount();

      await user.type(input, 'ID provider:');
      await user.keyboard('{ArrowDown}{Enter}');
      expect(tags()).toEqual(['ID provider: Company directory']);
      expect(document.activeElement).toBe(
        screen.getByRole('option', { name: /Company directory/ }),
      );

      await user.keyboard('{ArrowDown}{Enter}');
      expect(tags()).toEqual(['ID provider: Company directory', 'ID provider: Entra ID']);
      expect(listbox()).not.toBeNull();
    });

    it('takes a value back when it is picked again', async () => {
      const { user, input, tags } = mount({
        initial: [{ kind: 'field', field: 'idProvider', value: 'ldap' }],
      });

      await user.type(input, 'ID provider:');
      expect(attr(screen.getByRole('option', { name: /Company directory/ }), 'aria-selected')).toBe(
        'true',
      );

      await user.click(screen.getByRole('option', { name: /Company directory/ }));
      expect(tags()).toEqual([]);
    });

    it('swaps the value of a single-choice field', async () => {
      const { user, input, tags } = mount({
        initial: [{ kind: 'field', field: 'status', value: 'enabled' }],
      });

      await user.type(input, 'Status:');
      expect(attr(listbox(), 'aria-multiselectable')).toBeNull();

      await user.click(screen.getByRole('option', { name: /Disabled/ }));
      expect(tags()).toEqual(['Status: Disabled']);
      expect(screen.getByText('Replaced Status: Enabled with Status: Disabled')).toBeTruthy();
    });

    it('drops every held value of a single-choice field on a swap', async () => {
      const withLocked = {
        ...STATUS,
        values: [...STATUS.values, { id: 'locked', label: 'Locked' }],
      };
      const { user, input, tags } = mount({
        fields: [withLocked],
        initial: [
          { kind: 'field', field: 'status', value: 'enabled' },
          { kind: 'field', field: 'status', value: 'disabled' },
        ],
      });

      await user.type(input, 'Status:');
      await user.click(screen.getByRole('option', { name: /Locked/ }));
      expect(tags()).toEqual(['Status: Locked']);
    });

    it('says when nothing matches and keeps the field on Enter', async () => {
      const { user, input, tags } = mount();

      await user.type(input, 'ID provider:zzz');
      expect(options()).toEqual([]);
      expect(screen.getByText('No matches')).toBeTruthy();

      await user.keyboard('{Enter}');
      expect(tags()).toEqual([]);
      expect(attr(input, 'aria-label')).toBe('ID provider: Pick a value');
    });

    it('shows the field’s notice above its values and groups them under a labelled heading', async () => {
      const { user, input } = mount({ fields: [SCOPE] });

      await user.type(input, 'Scope:');
      expect(screen.getByText('Projects could not be loaded')).toBeTruthy();

      const group = screen.getByRole('group', { name: 'Project roles' });
      expect(
        within(group)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['intranet(1)']);
    });

    it('steps out of the field on Escape and closes on the second', async () => {
      const { user, input } = mount();

      await user.type(input, 'ID provider:');
      await user.keyboard('{Escape}');
      expect(options()).toEqual(['ID provider', 'Status']);

      await user.keyboard('{Escape}');
      expect(listbox()).toBeNull();
    });

    it('closes on Escape from inside the list and stays closed', async () => {
      const { user, input } = mount();

      await user.click(input);
      await user.keyboard('{ArrowDown}');
      await vi.waitFor(() => {
        expect(document.activeElement?.getAttribute('role')).toBe('option');
      });

      await user.keyboard('{Escape}');
      expect(listbox()).toBeNull();
      expect(document.activeElement).toBe(input);
    });

    it('stops a held Backspace at the empty input', async () => {
      const { user, input, tags } = mount({ initial: [{ kind: 'text', text: 'alice' }] });

      await user.type(input, 'ab');
      await user.keyboard('{Backspace>4/}');
      expect(input.value).toBe('');
      expect(tags()).toEqual(['alice']);
    });

    it('steps out of the field on Backspace in the empty input', async () => {
      const { user, input } = mount();

      await user.type(input, 'ID provider:{Backspace}');
      expect(options()).toEqual(['ID provider', 'Status']);
    });

    it('drops a field no value was picked for when the filter is left', async () => {
      const { user, input } = mount();

      await user.type(input, 'ID provider:');
      await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
      expect(attr(input, 'aria-label')).toBe('Search users');
    });

    it('keeps the field when a tag’s cross or the Filter button is clicked', async () => {
      const { user, input, tags } = mount({ initial: [{ kind: 'text', text: 'alice' }] });

      await user.type(input, 'ID provider:');
      await user.click(screen.getByRole('button', { name: 'Filter' }));
      expect(attr(input, 'aria-label')).toBe('ID provider: Pick a value');

      await user.click(screen.getByRole('button', { name: 'Remove alice' }));
      expect(tags()).toEqual([]);
      expect(attr(input, 'aria-label')).toBe('ID provider: Pick a value');
    });
  });

  describe('props', () => {
    it('keeps its own query from defaultValue when uncontrolled', async () => {
      const onChange = vi.fn();
      render(
        <FilterInput
          fields={[ID_PROVIDER]}
          defaultValue={[{ kind: 'text', text: 'alice' }]}
          onChange={onChange}
        />,
      );
      const user = userEvent.setup();

      await user.type(screen.getByRole('combobox'), 'ward{Enter}');
      expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
      expect(onChange).toHaveBeenLastCalledWith([
        { kind: 'text', text: 'alice' },
        { kind: 'text', text: 'ward' },
      ]);
    });

    it('shows the tags read-only: no input, no crosses, no clearing', async () => {
      render(
        <FilterInput
          fields={[ID_PROVIDER]}
          value={[{ kind: 'text', text: 'alice' }]}
          onChange={vi.fn()}
          readOnly
        />,
      );
      const user = userEvent.setup();

      expect(screen.getByText('alice')).toBeTruthy();
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Clear the filter' })).toBeNull();

      await user.click(screen.getByText('alice'));
      expect(listbox()).toBeNull();
    });

    it('reads as invalid with error', () => {
      render(<FilterInput fields={[ID_PROVIDER]} value={EMPTY_FILTER} onChange={vi.fn()} error />);

      expect(attr(screen.getByRole('combobox'), 'aria-invalid')).toBe('true');
      expect(document.querySelector('[data-component="FilterInput"]')?.className).toContain(
        'border-error',
      );
    });

    it('says a field is loading instead of "no matches"', async () => {
      const { user, input } = mount({ fields: [{ ...ID_PROVIDER, values: [], loading: true }] });

      await user.type(input, 'ID provider:');
      expect(screen.getByText('Loading…')).toBeTruthy();
      expect(screen.queryByText('No matches')).toBeNull();
    });
  });

  describe('tags', () => {
    it('walks into the tags with ArrowLeft and takes one back with Delete', async () => {
      const { user, input, tags } = mount({
        initial: [
          { kind: 'text', text: 'alice' },
          { kind: 'field', field: 'idProvider', value: 'ldap' },
        ],
      });

      await user.click(input);
      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Remove ID provider: Company directory' }),
      );

      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove alice' }));

      await user.keyboard('{ArrowRight}{Delete}');
      expect(tags()).toEqual(['alice']);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove alice' }));

      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(input);
    });

    it('keeps the crosses out of the tab order', () => {
      mount({ initial: [{ kind: 'text', text: 'alice' }] });

      expect(attr(screen.getByRole('button', { name: 'Remove alice' }), 'tabindex')).toBe('-1');
    });

    it('announces what was added and removed', async () => {
      const { user, input } = mount();

      await user.type(input, 'alice{Enter}');
      expect(screen.getByText('Added alice')).toBeTruthy();

      await user.keyboard('{Backspace}');
      expect(screen.getByText('Removed alice')).toBeTruthy();
    });

    it('clears everything from the cross at the edge', async () => {
      const onChange = vi.fn();
      const { user, tags } = mount({
        initial: [
          { kind: 'text', text: 'alice' },
          { kind: 'field', field: 'idProvider', value: 'ldap' },
        ],
        onChange,
      });

      await user.click(screen.getByRole('button', { name: 'Clear the filter' }));
      expect(tags()).toEqual([]);
      expect(onChange).toHaveBeenLastCalledWith([]);
      expect(screen.getByText('Filter cleared')).toBeTruthy();
    });

    it('announces a clearing that only dropped typed text', async () => {
      const { user, input } = mount();

      await user.type(input, 'ali');
      await user.click(screen.getByRole('button', { name: 'Clear the filter' }));
      expect(input.value).toBe('');
      expect(screen.getByText('Filter cleared')).toBeTruthy();
    });

    it('speaks a second clearing again', async () => {
      const { user, input } = mount();

      await user.type(input, 'ali');
      await user.click(screen.getByRole('button', { name: 'Clear the filter' }));
      const first = screen.getByText('Filter cleared');

      await user.type(input, 'x');
      await user.click(screen.getByRole('button', { name: 'Clear the filter' }));
      expect(screen.getByText('Filter cleared')).not.toBe(first);
    });

    it('leaves a composing Enter to the IME', async () => {
      const { user, input, tags } = mount();

      await user.type(input, 'alice');
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }),
      );
      expect(tags()).toEqual([]);
    });
  });
});
