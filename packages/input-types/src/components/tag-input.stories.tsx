import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useMemo } from 'react';

import type { Value } from '../data';
import { ValueTypes } from '../data';
import type { TextLineConfig } from '../descriptor/input-type-config';
import { TagDescriptor } from '../descriptor/tag-descriptor';
import { useOccurrenceManager } from '../hooks/use-occurrence-manager';
import { useInputTypesPhrases } from '../i18n/use-phrases';
import { InputBuilder } from '../schema';
import { InputTypeName } from '../schema';
import { Occurrences } from '../schema';
import { getOccurrenceErrorMessage } from '../utils/validation';
import { FieldError } from './field-error';
import { TagInput } from './tag-input';

type DemoTagInputProps = {
  min: number;
  max: number;
  initialTags?: string[];
  enabled?: boolean;
  config?: TextLineConfig;
  suggestions?: string[];
};

function makeConfig(overrides: Partial<TextLineConfig> = {}): TextLineConfig {
  return { regexp: undefined, maxLength: -1, showCounter: false, ...overrides };
}

function makeInput(min: number, max: number) {
  return new InputBuilder()
    .setName('tags')
    .setInputType(new InputTypeName('Tag', false))
    .setLabel('Add tag')
    .setOccurrences(Occurrences.minmax(min, max))
    .setHelpText('')
    .setInputTypeConfig({})
    .build();
}

function toValues(tags: string[]): Value[] {
  return tags.map((tag) => ValueTypes.STRING.newValue(tag));
}

// ! A module constant, not a default in the destructuring: `useOccurrenceManager` recreates its manager
// ! when `config` changes identity, and a fresh object per render would reset the values on every one.
const DEFAULT_CONFIG = makeConfig();

function DemoTagInput({
  min,
  max,
  initialTags = [],
  enabled = true,
  config = DEFAULT_CONFIG,
  suggestions,
}: DemoTagInputProps) {
  const t = useInputTypesPhrases();
  const input = useMemo(() => makeInput(min, max), [min, max]);
  const occurrences = input.getOccurrences();

  // The hook the form drives the input with: an occurrence keeps its id across moves and removals,
  // so dnd-kit sees the dragged tag land where it was dropped rather than a reshuffled list.
  const { state, add, remove, move, set } = useOccurrenceManager({
    occurrences,
    descriptor: TagDescriptor,
    config,
    initialValues: toValues(initialTags),
    autoSeed: false,
  });
  const occurrenceError = getOccurrenceErrorMessage(occurrences, state.occurrenceValidation, t);

  return (
    <div className="flex w-[32rem] flex-col gap-y-2">
      <TagInput
        occurrenceIds={state.ids}
        values={state.values}
        onChange={(index, value) => set(index, value)}
        onAdd={(value) => {
          if (value != null) {
            add(value);
          }
        }}
        onRemove={remove}
        onMove={move}
        occurrences={occurrences}
        config={config}
        input={input}
        enabled={enabled}
        errors={state.occurrenceValidation}
        suggestTags={
          suggestions
            ? (query) =>
                Promise.resolve(
                  suggestions.filter((suggestion) =>
                    suggestion.toLowerCase().startsWith(query.toLowerCase()),
                  ),
                )
            : undefined
        }
      />
      <FieldError message={occurrenceError} />
    </div>
  );
}

const meta: Meta<typeof TagInput> = {
  title: 'InputTypes/TagInput',
  component: TagInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Examples / Default',
  render: () => <DemoTagInput min={0} max={3} />,
};

export const Multiple: Story = {
  name: 'Examples / Multiple',
  render: () => <DemoTagInput min={0} max={4} initialTags={['alpha', 'beta', 'gamma']} />,
};

export const WithSuggestions: Story = {
  name: 'Examples / With Suggestions',
  render: () => (
    <DemoTagInput
      min={0}
      max={4}
      initialTags={['alpha']}
      suggestions={['alpha', 'alpine', 'alpha beta', 'release/2026', 'feature:tag']}
    />
  ),
};

export const MinViolation: Story = {
  name: 'States / Min Violation',
  render: () => <DemoTagInput min={2} max={4} initialTags={['alpha']} />,
};

export const WithFieldError: Story = {
  name: 'States / With Field Error',
  render: () => (
    <DemoTagInput
      min={1}
      max={4}
      initialTags={['alpha']}
      config={makeConfig({ regexp: /^[A-Z]/ })}
    />
  ),
};

export const MaxViolation: Story = {
  name: 'States / Max Violation',
  render: () => <DemoTagInput min={0} max={2} initialTags={['alpha', 'beta', 'gamma']} />,
};

export const RequiredEmpty: Story = {
  name: 'States / Required Empty',
  render: () => <DemoTagInput min={1} max={3} />,
};

export const Disabled: Story = {
  name: 'States / Disabled',
  render: () => <DemoTagInput min={0} max={4} initialTags={['alpha', 'beta']} enabled={false} />,
};
