import type { Meta, StoryObj } from '@storybook/preact-vite';

import { ValueTypes } from '../data';
import type { DateTimeConfig } from '../descriptor';
import { type Input, InputBuilder } from '../schema';
import { InputTypeName } from '../schema';
import { Occurrences } from '../schema';
import type { InputTypeComponentProps } from '../types';
import { DateTimeInput } from './date-time-input';

function makeConfig(overrides: Partial<DateTimeConfig> = {}): DateTimeConfig {
  return { default: undefined, ...overrides };
}

function makeInput(): Input {
  return new InputBuilder()
    .setName('myDateTime')
    .setInputType(new InputTypeName('DateTime', false))
    .setLabel('Date Time')
    .setOccurrences(Occurrences.minmax(0, 1))
    .setHelpText('')
    .setInputTypeConfig({})
    .build();
}

const meta: Meta<InputTypeComponentProps<DateTimeConfig>> = {
  title: 'InputTypes/DateTimeInput',
  component: DateTimeInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: { description: 'Current field value (Value object)' },
    onChange: { description: 'Callback fired when the value changes' },
    config: { description: 'DateTime config: default' },
    input: { description: 'Input descriptor (name, label, occurrences, etc.)' },
    enabled: { control: 'boolean', description: 'Whether the input is interactive' },
    index: { description: 'Occurrence index within the form' },
    errors: { description: 'Array of validation error objects' },
  },
};

export default meta;

type Story = StoryObj<InputTypeComponentProps<DateTimeConfig>>;

const defaultArgs: InputTypeComponentProps<DateTimeConfig> = {
  value: ValueTypes.LOCAL_DATE_TIME.newNullValue(),
  onChange: (v) => console.log('onChange', v.getString()),
  onBlur: () => console.log('onBlur'),
  config: makeConfig(),
  input: makeInput(),
  enabled: true,
  index: 0,
  errors: [],
};

export const Default: Story = {
  name: 'Examples / Default',
  args: { ...defaultArgs },
};

export const WithValue: Story = {
  name: 'Examples / With Value',
  args: {
    ...defaultArgs,
    value: ValueTypes.LOCAL_DATE_TIME.newValue('2025-06-15T14:30'),
  },
};

export const WithDefaultButton: Story = {
  name: 'Examples / With Default Button',
  args: {
    ...defaultArgs,
    config: makeConfig({ default: new Date(2025, 0, 1, 9, 0) }),
  },
};

export const Disabled: Story = {
  name: 'States / Disabled',
  args: {
    ...defaultArgs,
    value: ValueTypes.LOCAL_DATE_TIME.newValue('2025-06-15T14:30'),
    enabled: false,
  },
};

export const WithError: Story = {
  name: 'States / With Error',
  args: {
    ...defaultArgs,
    errors: [{ message: 'Value is not a valid date-time' }],
  },
};

export const AllStates: Story = {
  name: 'States / All States',
  render: () => (
    <div className="w-96 space-y-6 p-4">
      <div>
        <h3 className="mb-3 font-medium text-sm">Empty</h3>
        <DateTimeInput {...defaultArgs} />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">With Value</h3>
        <DateTimeInput
          {...defaultArgs}
          value={ValueTypes.LOCAL_DATE_TIME.newValue('2025-06-15T14:30')}
        />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Disabled</h3>
        <DateTimeInput
          {...defaultArgs}
          value={ValueTypes.LOCAL_DATE_TIME.newValue('2025-06-15T14:30')}
          enabled={false}
        />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">With Default Button</h3>
        <DateTimeInput
          {...defaultArgs}
          config={makeConfig({ default: new Date(2025, 0, 1, 9, 0) })}
        />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Error</h3>
        <DateTimeInput {...defaultArgs} errors={[{ message: 'Value is not a valid date-time' }]} />
      </div>
    </div>
  ),
};
