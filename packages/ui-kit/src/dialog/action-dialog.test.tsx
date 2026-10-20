// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/preact';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { type ReactElement, type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionDialog } from './action-dialog';
import { useCloseGuard } from './use-close-guard';

// ! `@enonic/ui` takes its focus trap from its own folder, and the trap's CommonJS build requires
// ! `react` past the Preact alias. The mock is aimed at the file `@enonic/ui` resolves.
const focusTrap = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  return createRequire(require.resolve('@enonic/ui')).resolve('focus-trap-react');
});
vi.mock(focusTrap, () => ({
  FocusTrap: ({ children }: { children: ReactNode }) => children,
}));

type HarnessProps = {
  onAside?: () => void;
  withHeldClose?: boolean;
  withAction?: 'held' | 'closing';
};

const Harness = ({ onAside, withHeldClose, withAction }: HarnessProps): ReactElement => {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('Ada');
  const guard = useCloseGuard({ dirty: name !== 'Ada', open, onOpenChange: setOpen });

  return (
    <ActionDialog.Root open={open} onOpenChange={guard.onOpenChange}>
      <ActionDialog.Portal>
        <ActionDialog.Overlay />
        <ActionDialog.Content>
          <ActionDialog.DefaultHeader title="Edit profile" withClose />
          {withHeldClose && (
            <ActionDialog.DefaultClose
              aria-label="Hold"
              onClick={(event) => event.preventDefault()}
            />
          )}
          <button type="button" onPointerDown={onAside} onClick={onAside}>
            Aside
          </button>
          <ActionDialog.Body>
            <input
              aria-label="Name"
              value={name}
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </ActionDialog.Body>
          {withAction !== undefined && (
            <ActionDialog.Action
              label="Publish"
              onClick={(event) => withAction === 'held' && event.preventDefault()}
            />
          )}
          <ActionDialog.Footer
            confirmLabel="Save"
            closeOnCancel={false}
            onCancel={guard.requestClose}
            onConfirm={() => undefined}
            question={
              guard.asking
                ? {
                    text: 'Discard unsaved changes?',
                    confirmLabel: 'Discard',
                    onKeep: guard.keep,
                    onConfirm: guard.discard,
                  }
                : undefined
            }
          />
        </ActionDialog.Content>
      </ActionDialog.Portal>
    </ActionDialog.Root>
  );
};

type Mounted = {
  user: UserEvent;
  input: HTMLInputElement;
};

async function mountAsking(props: HarnessProps = {}): Promise<Mounted> {
  render(<Harness {...props} />);
  const user = userEvent.setup();
  const input = screen.getByRole('textbox', { name: 'Name' });
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('The dialog renders no name input');
  }

  await user.type(input, 'x');
  await user.keyboard('{Escape}');
  expect(question()).not.toBeNull();

  return { user, input };
}

const closeButton = (): HTMLElement => screen.getByRole('button', { name: 'Close' });
const dialog = (): HTMLElement | null => screen.queryByRole('dialog');
const question = (): HTMLElement | null => screen.queryByText('Discard unsaved changes?');

afterEach(cleanup);

describe('ActionDialog close question', () => {
  it('asks on the X, and closes on the X clicked again', async () => {
    const { user } = await mountAsking();
    await user.click(screen.getByText('Edit profile'));
    expect(question()).toBeNull();

    await user.click(closeButton());
    expect(question()).not.toBeNull();

    await user.click(closeButton());
    expect(dialog()).toBeNull();
  });

  it('keeps editing on a click on the title, and returns the focus to the field', async () => {
    const { user, input } = await mountAsking();

    await user.click(screen.getByText('Edit profile'));
    expect(question()).toBeNull();
    expect(dialog()).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('keeps editing on a click on a control, which does not react', async () => {
    const onAside = vi.fn();
    const { user, input } = await mountAsking({ onAside });

    await user.click(screen.getByRole('button', { name: 'Aside' }));
    expect(onAside).not.toHaveBeenCalled();
    expect(question()).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('keeps editing on a click on the mask', async () => {
    const { user, input } = await mountAsking();
    const mask = document.querySelector('[data-component="Dialog.Overlay"]');
    if (!(mask instanceof HTMLElement)) {
      throw new Error('The dialog renders no mask');
    }

    await user.click(mask);
    expect(question()).toBeNull();
    expect(dialog()).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('keeps editing on a click on the mask after an X that did not close', async () => {
    const { user } = await mountAsking({ withHeldClose: true });
    const mask = document.querySelector('[data-component="Dialog.Overlay"]');
    if (!(mask instanceof HTMLElement)) {
      throw new Error('The dialog renders no mask');
    }

    await user.click(screen.getByRole('button', { name: 'Hold' }));
    expect(dialog()).not.toBeNull();

    await user.click(mask);
    expect(question()).toBeNull();
    expect(dialog()).not.toBeNull();
  });

  it('keeps editing on Escape', async () => {
    const { user } = await mountAsking();

    await user.keyboard('{Escape}');
    expect(question()).toBeNull();
    expect(dialog()).not.toBeNull();
  });

  it('closes on the question’s own confirm', async () => {
    const { user } = await mountAsking();

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(dialog()).toBeNull();
  });

  it('closes on the X with nothing to lose', async () => {
    render(<Harness />);
    const user = userEvent.setup();

    await user.click(closeButton());
    expect(question()).toBeNull();
    expect(dialog()).toBeNull();
  });
});

describe('ActionDialog close question, from the footer', () => {
  async function mountDirty(props: HarnessProps = {}): Promise<UserEvent> {
    render(<Harness {...props} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'x');
    return user;
  }

  it('closes on Save with unsaved edits, without asking', async () => {
    const user = await mountDirty();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(question()).toBeNull();
    expect(dialog()).toBeNull();
  });

  it('asks on Cancel with unsaved edits', async () => {
    const user = await mountDirty();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(question()).not.toBeNull();
    expect(dialog()).not.toBeNull();
  });

  it('closes on Cancel with nothing to lose', async () => {
    render(<Harness />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dialog()).toBeNull();
  });

  it('closes on an action with unsaved edits, without asking', async () => {
    const user = await mountDirty({ withAction: 'closing' });

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(question()).toBeNull();
    expect(dialog()).toBeNull();
  });

  it('stays open, unasked, on an action that held its own click', async () => {
    const user = await mountDirty({ withAction: 'held' });

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(question()).toBeNull();
    expect(dialog()).not.toBeNull();
  });
});

describe('useCloseGuard', () => {
  const Guarded = ({ open }: { open: boolean }): ReactElement => {
    const guard = useCloseGuard({ dirty: true, open, onOpenChange: () => undefined });
    return (
      <>
        <button type="button" onClick={guard.requestClose}>
          Close
        </button>
        {guard.asking && <p>Discard unsaved changes?</p>}
      </>
    );
  };

  it('starts a reopened dialog without the question', async () => {
    const { rerender } = render(<Guarded open />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(question()).not.toBeNull();

    rerender(<Guarded open={false} />);
    rerender(<Guarded open />);

    await waitFor(() => expect(question()).toBeNull());
  });
});
