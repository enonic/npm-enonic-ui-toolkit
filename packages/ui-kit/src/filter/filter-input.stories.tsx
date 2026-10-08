import type { Meta, StoryObj } from '@storybook/preact-vite';
import { AppWindow, Layers, ShieldLock, ToggleRight } from 'lucide-react';
import { type ReactElement, useRef, useState } from 'react';

import type { FilterField } from './filter-fields';
import { FilterInput, type FilterInputProps } from './filter-input';
import { EMPTY_FILTER, type FilterQuery, textOf, valuesOf } from './filter-query';

const meta: Meta<typeof FilterInput> = {
  title: 'UiKit/FilterInput',
  component: FilterInput,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    fields: { description: 'What the dropdown offers; none leaves a free-text search' },
    value: { description: 'The query, a list of terms in the order they were added' },
    onChange: { description: 'The next query, on every add, remove, toggle or clear' },
    placeholder: { control: 'text', description: 'What the empty input invites' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    error: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof FilterInput>;

//
// * Fields
//

const ID_PROVIDER: FilterField = {
  id: 'idProvider',
  label: 'ID provider',
  icon: ShieldLock,
  values: [
    { id: 'ldap', label: 'Company directory', count: 7 },
    { id: 'entraid', label: 'Entra ID', count: 3 },
    { id: 'guests', label: 'Guests', count: 0 },
  ],
};

const STATUS: FilterField = {
  id: 'status',
  label: 'Status',
  icon: ToggleRight,
  multiple: false,
  values: [
    { id: 'enabled', label: 'Enabled' },
    { id: 'disabled', label: 'Disabled' },
  ],
};

const SCOPE: FilterField = {
  id: 'scope',
  label: 'Scope',
  icon: Layers,
  values: [
    { id: 'system', label: 'System roles', count: 12 },
    { id: 'custom', label: 'Custom roles', count: 4 },
    { id: 'project:intranet', label: 'intranet', count: 3, group: 'Project roles' },
    { id: 'project:shop', label: 'shop', count: 0, group: 'Project roles' },
    { id: 'project:docs', label: 'docs', count: 5, group: 'Project roles' },
  ],
};

const APPLICATION: FilterField = {
  id: 'application',
  label: 'Application',
  icon: AppWindow,
  values: [
    { id: 'com.enonic.app.oidc', label: 'OIDC ID Provider', count: 2 },
    { id: 'com.enonic.app.ldap', label: 'LDAP ID Provider', count: 1 },
    { id: 'com.enonic.app.saml', label: 'SAML ID Provider', disabled: true },
  ],
};

//
// * Harness
//

type HarnessProps = Omit<FilterInputProps, 'value' | 'onChange'> & {
  description: string;
  initial?: FilterQuery;
};

/** The input under a description, with what the list would read off the query underneath. */
function Harness({ description, initial = EMPTY_FILTER, ...props }: HarnessProps): ReactElement {
  const [query, setQuery] = useState<FilterQuery>(initial);
  const fieldIds = props.fields.map(({ id }) => id);

  return (
    <div className="flex w-180 max-w-full flex-col gap-y-4">
      <div className="text-subtle text-sm">{description}</div>
      <FilterInput {...props} value={query} onChange={setQuery} />
      <dl className="text-subtle grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <dt>Text</dt>
        <dd className="text-main">{textOf(query) || '—'}</dd>
        {fieldIds.map((id) => {
          const values = [...valuesOf(query, id)];
          return (
            <Reading key={id} name={id} value={values.length === 0 ? 'any' : values.join(' | ')} />
          );
        })}
        <dt>Terms</dt>
        <dd className="text-main font-mono text-xs">{JSON.stringify(query)}</dd>
      </dl>
    </div>
  );
}

function Reading({ name, value }: { name: string; value: string }): ReactElement {
  return (
    <>
      <dt>{name}</dt>
      <dd className="text-main">{value}</dd>
    </>
  );
}

//
// * Examples
//

export const Default: Story = {
  name: 'Examples / Default',
  render: () => (
    <Harness
      fields={[ID_PROVIDER, STATUS]}
      placeholder="Search users"
      description="Click the input, type, or press an arrow: the fields open. Pick one, or type `ID provider:` — its values open with their hit counts, most first; Guests has none and is disabled. Enter picks the highlighted value; the values stay open, so several can be ticked, and a tick picked again comes off. Typed text with no field entered becomes a tag on Enter. Backspace in the empty input steps out of a field, or takes the last tag back."
    />
  ),
};

export const Prefilled: Story = {
  name: 'Examples / Prefilled',
  render: () => (
    <Harness
      fields={[ID_PROVIDER, STATUS]}
      placeholder="Search users"
      initial={[
        { kind: 'field', field: 'idProvider', value: 'ldap' },
        { kind: 'text', text: 'alice' },
        { kind: 'field', field: 'status', value: 'enabled' },
      ]}
      description="A query handed in: every term is a tag, labelled through the fields. The tags are one tab stop with the input: ArrowLeft at the start of the input walks onto the last cross, arrows move between them, Backspace or Delete takes the tag back. The right-hand cross clears everything."
    />
  ),
};

export const SingleChoice: Story = {
  name: 'Examples / Single Choice',
  render: () => (
    <Harness
      fields={[STATUS]}
      placeholder="Search"
      description="A field with `multiple: false`: one value at a time, and picking another swaps it. Its values carry no `count`, so every one is offered in the field's own order."
    />
  ),
};

export const GroupedValues: Story = {
  name: 'Examples / Grouped Values',
  render: () => (
    <Harness
      fields={[SCOPE]}
      placeholder="Search roles"
      description="Values sharing a `group` are listed together under a labelled heading, after the ungrouped ones. Each run is ordered by hits on its own: shop has none and sinks to the end of Project roles, not to the end of the list."
    />
  ),
};

export const PastedTerm: Story = {
  name: 'Examples / Pasted Term',
  render: () => (
    <Harness
      fields={[ID_PROVIDER, STATUS]}
      placeholder="Search users"
      description="Paste `ID provider: entra` into the input: the field is entered and the text after the colon narrows its values, so Enter picks Entra ID. Typing a word that matches nothing shows a `No matches` row and Enter adds nothing."
    />
  ),
};

export const FreeTextOnly: Story = {
  name: 'Examples / Free Text Only',
  render: () => (
    <Harness
      fields={[]}
      placeholder="Search service accounts"
      description="No fields: the input is a plain search whose words become tags on Enter. Nothing opens, and the Filter button just focuses the input. `Foo` and `foo` are one tag — the matching ignores case, so the terms do too."
    />
  ),
};

export const ManyFields: Story = {
  name: 'Examples / Many Fields',
  render: () => (
    <Harness
      fields={[ID_PROVIDER, STATUS, SCOPE, APPLICATION]}
      description="Typing in the fields stage narrows the fields by label: `app` leaves Application. A value with `disabled` is listed but cannot be picked, whatever its count. The default placeholder is the kit's own."
    />
  ),
};

//
// * States
//

export const ManyTags: Story = {
  name: 'States / Many Tags',
  render: () => (
    <Harness
      fields={[ID_PROVIDER, STATUS, SCOPE]}
      placeholder="Search"
      initial={[
        { kind: 'field', field: 'idProvider', value: 'ldap' },
        { kind: 'field', field: 'idProvider', value: 'entraid' },
        { kind: 'field', field: 'status', value: 'enabled' },
        { kind: 'field', field: 'scope', value: 'project:intranet' },
        { kind: 'text', text: 'alice' },
        { kind: 'text', text: 'ward' },
        { kind: 'text', text: 'administrator' },
      ]}
      description="Enough tags to wrap: only the middle wraps, the Filter button and the clearing cross stay on the first line, at the edges."
    />
  ),
};

export const StaleTerms: Story = {
  name: 'States / Stale Terms',
  render: () => (
    <Harness
      fields={[ID_PROVIDER]}
      placeholder="Search users"
      initial={[
        { kind: 'field', field: 'idProvider', value: 'okta' },
        { kind: 'field', field: 'status', value: 'enabled' },
      ]}
      description="Terms the fields no longer offer — a provider that was removed, a field this list does not have: the tags fall back to the ids, stay readable and can still be removed."
    />
  ),
};

export const WithNotice: Story = {
  name: 'States / With Notice',
  render: () => (
    <Harness
      fields={[{ ...ID_PROVIDER, notice: 'ID providers could not be loaded' }]}
      placeholder="Search users"
      initial={[{ kind: 'field', field: 'idProvider', value: 'ldap' }]}
      description="A field with a `notice`: the values may be short or stale — here the count request failed while a picked provider goes on narrowing the list — and the field says so above them instead of looking complete."
    />
  ),
};

export const Disabled: Story = {
  name: 'States / Disabled',
  render: () => (
    <Harness
      fields={[ID_PROVIDER, STATUS]}
      placeholder="Search users"
      disabled
      initial={[
        { kind: 'field', field: 'idProvider', value: 'ldap' },
        { kind: 'text', text: 'alice' },
      ]}
      description="`disabled`: the tags stay readable, nothing can be added, removed or cleared."
    />
  ),
};

export const Loading: Story = {
  name: 'States / Loading',
  render: () => (
    <Harness
      fields={[{ ...ID_PROVIDER, values: [], loading: true }, STATUS]}
      placeholder="Search users"
      description="A field with `loading`: its values are still on their way, and the dropdown says so instead of `No matches`."
    />
  ),
};

export const Error: Story = {
  name: 'States / Error',
  render: () => (
    <Harness
      fields={[ID_PROVIDER, STATUS]}
      placeholder="Search users"
      error
      initial={[{ kind: 'text', text: 'alice' }]}
      description="`error`: the box reads as invalid and the input carries `aria-invalid`. What is wrong with the query is the caller's to say beside the box."
    />
  ),
};

export const ReadOnly: Story = {
  name: 'States / Read Only',
  render: () => (
    <Harness
      fields={[ID_PROVIDER, STATUS]}
      placeholder="Search users"
      readOnly
      initial={[
        { kind: 'field', field: 'idProvider', value: 'ldap' },
        { kind: 'text', text: 'alice' },
      ]}
      description="`readOnly`: the tags are the whole content — no input, no crosses, no clearing. Unlike `disabled`, nothing is dimmed."
    />
  ),
};

export const Uncontrolled: Story = {
  name: 'States / Uncontrolled',
  render: () => (
    <div className="flex w-180 max-w-full flex-col gap-y-4">
      <div className="text-subtle text-sm">
        No `value`: the input keeps its own query, starting from `defaultValue`, and reports every
        change through `onChange`.
      </div>
      <FilterInput
        fields={[ID_PROVIDER, STATUS]}
        defaultValue={[{ kind: 'text', text: 'alice' }]}
        placeholder="Search users"
      />
    </div>
  ),
};

export const FocusedFromOutside: Story = {
  name: 'States / Focused From Outside',
  render: () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState<FilterQuery>(EMPTY_FILTER);

    return (
      <div className="flex w-180 max-w-full flex-col gap-y-4">
        <div className="text-subtle text-sm">
          The ref is the text input&apos;s: press <kbd className="font-mono">/</kbd> anywhere on
          this page to focus the filter, the way a browse screen binds its shortcut. Focus alone
          opens nothing; a keystroke or an arrow does.
        </div>
        <FocusShortcut inputRef={inputRef} />
        <FilterInput
          ref={inputRef}
          fields={[ID_PROVIDER, STATUS]}
          value={query}
          onChange={setQuery}
          placeholder="Search users"
        />
      </div>
    );
  },
};

function FocusShortcut({
  inputRef,
}: {
  inputRef: { current: HTMLInputElement | null };
}): ReactElement {
  return (
    <div
      className="text-subtle rounded-sm border border-dashed p-6 text-center text-sm outline-none"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === '/') {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      Click here, then press /
    </div>
  );
}
