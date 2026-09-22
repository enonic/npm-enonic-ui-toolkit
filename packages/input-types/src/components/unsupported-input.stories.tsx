import type { Meta, StoryObj } from '@storybook/preact-vite';

import { InputBuilder } from '../schema';
import { InputTypeName } from '../schema';
import { Occurrences } from '../schema';
import { UnsupportedInput, type UnsupportedInputProps } from './unsupported-input';

function makeInput(
  typeName = 'FancyWidget',
): InstanceType<typeof InputBuilder>['build'] extends () => infer R ? R : never {
  return new InputBuilder()
    .setName('myUnsupported')
    .setInputType(new InputTypeName(typeName, false))
    .setLabel('Unsupported')
    .setOccurrences(Occurrences.minmax(0, 1))
    .setHelpText('')
    .setInputTypeConfig({})
    .build();
}

const meta: Meta<UnsupportedInputProps> = {
  title: 'InputTypes/UnsupportedInput',
  component: UnsupportedInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<UnsupportedInputProps>;

const defaultArgs: UnsupportedInputProps = {
  input: makeInput(),
};

export const Default: Story = {
  name: 'Examples / Default',
  args: { ...defaultArgs },
};

export const LongTypeName: Story = {
  name: 'Examples / Long Type Name',
  args: {
    ...defaultArgs,
    input: makeInput('com.vendor.app:super-duper-custom-extra-long-input-type-name'),
  },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
};
