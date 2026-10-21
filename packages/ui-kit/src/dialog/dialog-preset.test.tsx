// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DialogPreset } from './dialog-preset';

// `@enonic/ui` takes its focus trap from its own folder, and the trap's CommonJS build requires
// `react` past the Preact alias. The mock is aimed at the file `@enonic/ui` resolves.
const focusTrap = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  return createRequire(require.resolve('@enonic/ui')).resolve('focus-trap-react');
});
vi.mock(focusTrap, () => ({
  FocusTrap: ({ children }: { children: ReactNode }) => children,
}));

afterEach(cleanup);

const Confirm = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}): ReactElement => {
  const [open, setOpen] = useState(true);
  return (
    <DialogPreset.Confirm
      open={open}
      onOpenChange={setOpen}
      title="Archive"
      question="Archive the item?"
      confirmLabel="Archive"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

function mount() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<Confirm onConfirm={onConfirm} onCancel={onCancel} />);
  return { onConfirm, onCancel, user: userEvent.setup() };
}

const dialog = (): HTMLElement | null => screen.queryByRole('dialog');

describe('DialogPreset.Confirm', () => {
  it('cancels on Cancel', async () => {
    const { onCancel, onConfirm, user } = mount();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it('cancels on Escape', async () => {
    const { onCancel, user } = mount();

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledOnce();
    expect(dialog()).toBeNull();
  });

  it('cancels on a click on the mask', async () => {
    const { onCancel, onConfirm, user } = mount();
    const mask = document.querySelector('[data-component="Dialog.Overlay"]');
    if (!(mask instanceof HTMLElement)) {
      throw new Error('The dialog renders no mask');
    }

    await user.click(mask);

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it('confirms on the confirm button without cancelling', async () => {
    const { onCancel, onConfirm, user } = mount();

    await user.click(screen.getByRole('button', { name: 'Archive' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });
});
