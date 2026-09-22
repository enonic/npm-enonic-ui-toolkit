import type { Meta, StoryObj } from '@storybook/preact-vite';

import { InputBuilder } from '../schema';
import { InputTypeName } from '../schema';
import { Occurrences } from '../schema';
import type { InputLabelRootProps } from './input-label';
import { InputLabel } from './input-label';

function makeInput(overrides: { label?: string; helpText?: string; minOccurrences?: number } = {}) {
  return new InputBuilder()
    .setName('myInput')
    .setInputType(new InputTypeName('TextLine', false))
    .setLabel(overrides.label ?? '')
    .setOccurrences(Occurrences.minmax(overrides.minOccurrences ?? 0, 1))
    .setHelpText(overrides.helpText ?? '')
    .setInputTypeConfig({})
    .build();
}

const meta: Meta<InputLabelRootProps> = {
  title: 'Components/InputLabel',
  component: InputLabel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<InputLabelRootProps>;

export const LabelOnly: Story = {
  name: 'Examples / Label Only',
  render: () => <InputLabel input={makeInput({ label: 'Full Name' })} />,
};

export const RequiredLabel: Story = {
  name: 'Examples / Required Label',
  render: () => <InputLabel input={makeInput({ label: 'Full Name', minOccurrences: 1 })} />,
};

export const DescriptionOnly: Story = {
  name: 'Examples / Description Only',
  render: () => (
    <InputLabel
      input={makeInput({ helpText: 'Enter your full legal name as it appears on your ID.' })}
    />
  ),
};

export const LabelAndDescription: Story = {
  name: 'Examples / Label and Description',
  render: () => (
    <InputLabel
      input={makeInput({
        label: 'Full Name',
        helpText: 'Enter your full legal name as it appears on your ID.',
      })}
    />
  ),
};

export const WithActionLabelAndDescription: Story = {
  name: 'Examples / With Action (Label + Description)',
  render: () => (
    <InputLabel
      input={makeInput({
        label: 'Full Name',
        helpText: 'Enter your full legal name as it appears on your ID.',
      })}
    >
      <InputLabel.Action variant="solid">Expand All</InputLabel.Action>
    </InputLabel>
  ),
};

export const WithActionLabelOnly: Story = {
  name: 'Examples / With Action (Label Only)',
  render: () => (
    <InputLabel input={makeInput({ label: 'Full Name' })}>
      <InputLabel.Action variant="solid">Expand All</InputLabel.Action>
    </InputLabel>
  ),
};

export const AllVariants: Story = {
  name: 'States / All Variants',
  render: () => (
    <div className="w-80 space-y-6 p-4">
      <div>
        <h3 className="mb-3 font-medium text-sm">Label Only</h3>
        <InputLabel
          input={makeInput({ label: 'Full Name' })}
          className="rounded border border-bdr-subtle border-dashed p-2"
        />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Required Label</h3>
        <InputLabel
          input={makeInput({ label: 'Full Name', minOccurrences: 1 })}
          className="rounded border border-bdr-subtle border-dashed p-2"
        />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Description Only</h3>
        <InputLabel
          input={makeInput({ helpText: 'Enter your full legal name.' })}
          className="rounded border border-bdr-subtle border-dashed p-2"
        />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Label + Description</h3>
        <InputLabel
          input={makeInput({ label: 'Full Name', helpText: 'Enter your full legal name.' })}
          className="rounded border border-bdr-subtle border-dashed p-2"
        />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Label + Description + Action</h3>
        <InputLabel
          input={makeInput({ label: 'Full Name', helpText: 'Enter your full legal name.' })}
          className="rounded border border-bdr-subtle border-dashed p-2"
        >
          <InputLabel.Action variant="solid">Expand All</InputLabel.Action>
        </InputLabel>
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Label + Action (no description)</h3>
        <InputLabel
          input={makeInput({ label: 'Full Name' })}
          className="rounded border border-bdr-subtle border-dashed p-2"
        >
          <InputLabel.Action variant="solid">Expand All</InputLabel.Action>
        </InputLabel>
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Description + Action (no label)</h3>
        <InputLabel
          input={makeInput({ helpText: 'Enter your full legal name.' })}
          className="rounded border border-bdr-subtle border-dashed p-2"
        >
          <InputLabel.Action variant="solid">Expand All</InputLabel.Action>
        </InputLabel>
      </div>
    </div>
  ),
};
