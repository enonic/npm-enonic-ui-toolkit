// @vitest-environment happy-dom
import { createNotifications, type Notifications, SHORT_LIFETIME_MS } from '@enonic/ui-utils';
import { act, cleanup, render, screen } from '@testing-library/preact';
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
