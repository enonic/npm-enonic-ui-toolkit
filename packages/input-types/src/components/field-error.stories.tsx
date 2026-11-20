import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useId, useState } from 'react';

import { FieldError } from './field-error';

const meta: Meta<typeof FieldError> = {
  title: 'Form/FieldError',
  component: FieldError,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FieldError>;

export const Default: Story = {
  name: 'Examples / Default',
  render: () => <FieldError message="Value does not match the required pattern" />,
};

export const LongMessage: Story = {
  name: 'Examples / Long Message',
  render: () => (
    <div className="w-64">
      <FieldError message="This is a much longer error message that wraps to multiple lines to verify the icon stays aligned at the top of the text block" />
    </div>
  ),
};

export const NoMessage: Story = {
  name: 'States / No Message',
  render: () => <FieldError message={undefined} />,
};

function DismissibleDemo() {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <div className="flex flex-col gap-y-3 p-4">
        <div className="max-w-120 text-sm text-subtle">
          Dismissed. Reload the story to bring it back.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-3 p-4">
      <div className="max-w-120 text-sm text-subtle">
        Click the X to dismiss. The `onDismiss` prop renders the close affordance and lets the
        parent clear the message — used for transient errors (e.g. translation failures).
      </div>
      <FieldError message="Translation failed for this field" onDismiss={() => setVisible(false)} />
    </div>
  );
}

export const Dismissible: Story = {
  name: 'Features / Dismissible',
  render: () => <DismissibleDemo />,
};

function ValidationDemo() {
  const id = useId();
  const errorId = `${id}-error`;
  const [value, setValue] = useState('Valid value');
  const message = value.trim() ? undefined : 'This field is required';

  return (
    <div className="flex w-80 flex-col gap-y-2 p-4">
      <label htmlFor={id}>Required value</label>
      <input
        id={id}
        value={value}
        required
        aria-invalid={!!message || undefined}
        aria-describedby={message ? errorId : undefined}
        onChange={(event) => setValue(event.currentTarget.value)}
        className="rounded-sm border border-bdr-subtle bg-surface-neutral px-3 py-2 text-main"
      />
      <FieldError id={errorId} message={message} announce={false} />
      <p className="text-sm text-subtle">
        VoiceOver with Chrome reads this field's changed error description. Clear the value, enter a
        value and clear it again. FieldError does not queue a second announcement in this example.
      </p>
    </div>
  );
}

export const ValidationAnnouncement: Story = {
  name: 'Features / Validation announcement',
  render: () => <ValidationDemo />,
};

export const AllVariants: Story = {
  name: 'States / All Variants',
  render: () => (
    <div className="w-80 space-y-6 p-4">
      <div>
        <h3 className="mb-3 font-medium text-sm">Required field</h3>
        <FieldError message="This field is required" />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Occurrence min breach</h3>
        <FieldError message="At least 2 occurrences are required" />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">Occurrence max breach</h3>
        <FieldError message="Maximum 3 occurrences allowed" />
      </div>
      <div>
        <h3 className="mb-3 font-medium text-sm">No error (nothing visible)</h3>
        <FieldError message={undefined} />
      </div>
    </div>
  ),
};
