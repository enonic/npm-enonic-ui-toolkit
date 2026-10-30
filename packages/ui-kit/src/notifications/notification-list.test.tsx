// @vitest-environment happy-dom
import { createNotifications, type Notifications, SHORT_LIFETIME_MS } from '@enonic/ui-utils';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationList } from './notification-list';

let store: Notifications;
let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  vi.useFakeTimers();
  store = createNotifications();
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const messages = () =>
  screen.queryAllByRole('status').map((toast) => toast.querySelector('p')?.textContent);

const closeOf = (message: string) =>
  screen
    .getAllByRole('status')
    .find((toast) => toast.querySelector('p')?.textContent === message)!
    .querySelector<HTMLButtonElement>('button[aria-label="Close notification"]')!;

describe('NotificationList', () => {
  it('renders what the store shows, in order, and follows a change', async () => {
    render(<NotificationList notifications={store} />);
    expect(messages()).toEqual([]);

    await act(() => {
      store.notify('success', 'Saved');
      store.notify('error', 'Could not start');
    });
    expect(messages()).toEqual(['Saved', 'Could not start']);

    await act(() => {
      vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    });
    expect(messages()).toEqual(['Could not start']);
  });

  it('is a labelled region, with the polite and the assertive announcements apart', async () => {
    await act(() => {
      store.notify('info', 'Reindexing');
      store.notify('warning', 'Running out of space');
    });
    const { container } = render(<NotificationList notifications={store} />);

    expect(screen.getByRole('region', { name: 'Notifications' })).toBeTruthy();
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Reindexing');
    expect(container.querySelector('[aria-live="assertive"]')?.textContent).toBe(
      'Running out of space',
    );
  });

  it('dismisses through the close button', async () => {
    await act(() => {
      store.notify('info', 'Saved', { autoHide: false });
    });
    render(<NotificationList notifications={store} />);

    await user.click(screen.getByRole('button', { name: 'Close notification' }));

    expect(messages()).toEqual([]);
    expect(store.notifications.get()).toEqual([]);
  });

  it('renders the actions, and an action taken runs and dismisses the toast', async () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    await act(() => {
      store.notify('success', 'Deleted', {
        autoHide: false,
        actions: [{ label: 'Undo', onClick }],
        onClose,
      });
    });
    render(<NotificationList notifications={store} />);

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(messages()).toEqual([]);
    expect(store.notifications.get()).toEqual([]);
  });

  it('dismisses the toast even when its action throws', async () => {
    const onClose = vi.fn();
    await act(() => {
      store.notify('success', 'Deleted', {
        autoHide: false,
        actions: [
          {
            label: 'Undo',
            onClick: () => {
              throw new Error('boom');
            },
          },
        ],
        onClose,
      });
    });
    render(<NotificationList notifications={store} />);

    await expect(user.click(screen.getByRole('button', { name: 'Undo' }))).rejects.toThrow('boom');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(messages()).toEqual([]);
    expect(store.notifications.get()).toEqual([]);
  });

  it('pauses the lifetime while hovered and resumes it after', async () => {
    await act(() => {
      store.notify('info', 'Saved');
    });
    render(<NotificationList notifications={store} />);
    // The handlers sit on the wrapper, where a browser fires enter and leave for the toast inside.
    const wrapper = screen.getByRole('status').parentElement!;

    await user.hover(wrapper);
    await act(() => {
      vi.advanceTimersByTime(SHORT_LIFETIME_MS * 2);
    });
    expect(messages()).toEqual(['Saved']);

    await user.unhover(wrapper);
    await act(() => {
      vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    });
    expect(messages()).toEqual([]);
  });

  it('pauses the lifetime while an action has the focus', async () => {
    await act(() => {
      store.notify('success', 'Deleted', { actions: [{ label: 'Undo', onClick: () => {} }] });
    });
    render(<NotificationList notifications={store} />);

    await user.tab();
    await user.tab();
    expect(document.activeElement?.textContent).toBe('Undo');

    await act(() => {
      vi.advanceTimersByTime(SHORT_LIFETIME_MS * 2);
    });
    expect(messages()).toEqual(['Deleted']);
  });

  it('keeps a focused toast up when the pointer leaves it inside a shadow root', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = host.attachShadow({ mode: 'open' });
    await act(() => {
      store.notify('success', 'Deleted', { actions: [{ label: 'Undo', onClick: () => {} }] });
    });
    render(<NotificationList notifications={store} />, { container: root as unknown as Element });
    const undo = root.querySelector('button')!;
    const wrapper = root.querySelector('[role="status"]')!.parentElement!;

    await user.hover(wrapper);
    undo.focus();
    expect(document.activeElement).toBe(host);
    expect(root.activeElement).toBe(undo);
    await user.unhover(wrapper);

    await act(() => {
      vi.advanceTimersByTime(SHORT_LIFETIME_MS * 2);
    });
    expect(store.notifications.get().map(({ message }) => message)).toEqual(['Deleted']);

    host.remove();
  });

  it('hands the focus of a toast closed from the keyboard to the toast next to it', async () => {
    await act(() => {
      store.notify('info', 'first', { autoHide: false });
      store.notify('success', 'second', {
        autoHide: false,
        actions: [{ label: 'Undo', onClick: () => {} }],
      });
      store.notify('info', 'third', { autoHide: false });
    });
    render(<NotificationList notifications={store} />);

    closeOf('first').focus();
    await user.keyboard('{Enter}');
    expect(messages()).toEqual(['second', 'third']);
    expect(document.activeElement).toBe(closeOf('second'));

    closeOf('third').focus();
    await user.keyboard('{Enter}');
    expect(messages()).toEqual(['second']);
    expect(document.activeElement).toBe(closeOf('second'));
  });

  it('hands the focus of the last toast back to where the stack was entered from', async () => {
    const before = document.body.appendChild(document.createElement('button'));
    before.textContent = 'before';
    await act(() => {
      store.notify('success', 'Deleted', {
        autoHide: false,
        actions: [{ label: 'Undo', onClick: () => {} }],
      });
    });
    render(<NotificationList notifications={store} />);

    before.focus();
    await user.tab();
    await user.tab();
    expect(document.activeElement?.textContent).toBe('Undo');
    await user.keyboard('{Enter}');

    expect(messages()).toEqual([]);
    expect(document.activeElement).toBe(before);

    before.remove();
  });

  it('leaves a focus outside the stack alone when a toast is closed', async () => {
    const elsewhere = document.body.appendChild(document.createElement('button'));
    await act(() => {
      store.notify('info', 'first', { autoHide: false });
      store.notify('info', 'second', { autoHide: false });
    });
    render(<NotificationList notifications={store} />);
    elsewhere.focus();

    await act(() => {
      fireEvent.click(closeOf('first'));
    });

    expect(messages()).toEqual(['second']);
    expect(document.activeElement).toBe(elsewhere);

    elsewhere.remove();
  });

  it('takes the class and the component name it is given', async () => {
    const { container } = render(
      <NotificationList notifications={store} className="fixed right-4 bottom-4" />,
    );
    const region = container.firstElementChild!;

    expect(region.getAttribute('data-component')).toBe('NotificationList');
    expect(region.classList.contains('fixed')).toBe(true);
    expect(region.classList.contains('pointer-events-none')).toBe(true);
  });
});
