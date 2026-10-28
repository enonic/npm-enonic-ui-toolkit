import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNotifications, type Notifications } from './create-notifications';
import { LONG_LIFETIME_MS, SHORT_LIFETIME_MS, VISIBLE_LIMIT } from './notifications';

let store: Notifications;

function messages(): string[] {
  return store.notifications.get().map(({ message }) => message);
}

function tones(): string[] {
  return store.notifications.get().map(({ tone }) => tone);
}

function show(message: string): () => void {
  return store.notify('info', message);
}

function fill(): void {
  for (let index = 0; index < VISIBLE_LIMIT; index++) {
    show(`message ${index}`);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  store = createNotifications();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('notify', () => {
  it('shows the notification and returns its dismiss', () => {
    const dismiss = store.notify('success', 'Saved');
    expect(messages()).toEqual(['Saved']);

    dismiss();
    expect(messages()).toEqual([]);
  });

  it('shows one just like it once, and hands back the dismiss of the one already up', () => {
    store.notify('error', 'Could not start', { autoHide: false });
    const dismiss = store.notify('error', 'Could not start', { autoHide: false });
    expect(messages()).toEqual(['Could not start']);

    dismiss();
    expect(messages()).toEqual([]);
  });

  it('hands back the dismiss of a duplicate waiting in the queue', () => {
    fill();
    show('waiting');
    const dismiss = show('waiting');

    dismiss();
    vi.advanceTimersByTime(SHORT_LIFETIME_MS);

    expect(messages()).toEqual([]);
  });

  it('tells the same message in two tones apart', () => {
    store.notify('error', 'Busy');
    store.notify('success', 'Busy');

    expect(tones()).toEqual(['error', 'success']);
  });

  it('spends no id on one it dropped', () => {
    show('Saved');
    show('Saved');
    show('Deleted');

    expect(store.notifications.get().map(({ id }) => id)).toEqual([1, 2]);
  });

  it('carries the actions through', () => {
    const onClick = vi.fn();

    store.notify('success', 'Deleted', { actions: [{ label: 'Undo', onClick }] });

    expect(store.notifications.get()[0]?.actions).toEqual([{ label: 'Undo', onClick }]);
  });
});

describe('lifetimes', () => {
  it('hides an info notification after the short lifetime', () => {
    show('Saved');

    vi.advanceTimersByTime(SHORT_LIFETIME_MS - 1);
    expect(messages()).toEqual(['Saved']);

    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });

  it('keeps an error up for the long lifetime', () => {
    store.notify('error', 'Could not start');

    vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    expect(messages()).toEqual(['Could not start']);

    vi.advanceTimersByTime(LONG_LIFETIME_MS - SHORT_LIFETIME_MS);
    expect(messages()).toEqual([]);
  });

  it('leaves a notification that does not auto-hide alone', () => {
    store.notify('info', 'Working', { autoHide: false });

    vi.advanceTimersByTime(LONG_LIFETIME_MS * 2);
    expect(messages()).toEqual(['Working']);
  });

  it('hides after the lifetime it was given', () => {
    store.notify('info', 'Saved', { lifetimeMs: 1000 });

    vi.advanceTimersByTime(999);
    expect(messages()).toEqual(['Saved']);

    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });

  it('shows a notification asked to live no time at all for the tone lifetime instead', () => {
    store.notify('info', 'Saved', { lifetimeMs: 0 });

    vi.advanceTimersByTime(SHORT_LIFETIME_MS - 1);
    expect(messages()).toEqual(['Saved']);

    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });
});

describe('pause and resume', () => {
  const idOf = (message: string): number =>
    store.notifications.get().find((notification) => notification.message === message)!.id;

  it('holds the notification while it is paused', () => {
    show('Saved');
    vi.advanceTimersByTime(1000);
    store.pause(idOf('Saved'));

    vi.advanceTimersByTime(SHORT_LIFETIME_MS * 2);

    expect(messages()).toEqual(['Saved']);
  });

  it('resumes with the time that was left', () => {
    show('Saved');
    vi.advanceTimersByTime(4000);
    store.pause(idOf('Saved'));
    store.resume(idOf('Saved'));

    vi.advanceTimersByTime(999);
    expect(messages()).toEqual(['Saved']);

    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });

  it('stays paused while the notification next to it comes and goes', () => {
    show('Saved');
    const dismissOther = show('Deleted');
    store.pause(idOf('Saved'));

    dismissOther();
    show('Installed');
    vi.advanceTimersByTime(SHORT_LIFETIME_MS * 2);

    expect(messages()).toEqual(['Saved']);
  });

  it('ignores a pause of what has no lifetime running', () => {
    store.notify('info', 'Working', { autoHide: false });
    store.pause(idOf('Working'));
    store.resume(idOf('Working'));
    store.pause(99);

    vi.advanceTimersByTime(LONG_LIFETIME_MS * 2);
    expect(messages()).toEqual(['Working']);
  });
});

describe('the queue', () => {
  it('promotes a queued notification and starts its lifetime then, not when it was raised', () => {
    show('first');
    vi.advanceTimersByTime(1000);
    show('second');
    vi.advanceTimersByTime(1000);
    show('third');
    show('fourth');

    expect(messages()).toEqual(['first', 'second', 'third']);

    // `first` expires at 5000 and `fourth` takes its place, so its own lifetime runs to 10000.
    vi.advanceTimersByTime(3000);
    expect(messages()).toEqual(['second', 'third', 'fourth']);

    vi.advanceTimersByTime(4999);
    expect(messages()).toEqual(['fourth']);

    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });

  it('lets nothing raised later overtake what is already waiting', () => {
    fill();
    show('waiting');
    show('later');

    vi.advanceTimersByTime(SHORT_LIFETIME_MS);

    expect(messages()).toEqual(['waiting', 'later']);
  });

  it('waits for a stack that will not clear on its own to be closed by hand', () => {
    const dismissFirst = store.notify('info', 'first', { autoHide: false });
    store.notify('info', 'second', { autoHide: false });
    store.notify('info', 'third', { autoHide: false });
    show('waiting');

    vi.advanceTimersByTime(SHORT_LIFETIME_MS * 4);
    expect(messages()).toEqual(['first', 'second', 'third']);

    dismissFirst();
    expect(messages()).toEqual(['second', 'third', 'waiting']);
  });

  it('never shows more than the limit at once', () => {
    fill();
    show('one more');

    expect(messages()).toHaveLength(VISIBLE_LIMIT);
  });
});

describe('dismiss', () => {
  it('drops the notification and leaves the rest to live out their own lifetimes', () => {
    const dismissFirst = show('Saved');
    show('Deleted');

    dismissFirst();
    expect(messages()).toEqual(['Deleted']);

    vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    expect(messages()).toEqual([]);
  });

  it('is a no-op the second time', () => {
    const dismiss = show('Saved');
    show('Deleted');

    dismiss();
    dismiss();

    expect(messages()).toEqual(['Deleted']);
  });
});

describe('owners', () => {
  it('lets two owners each say the same thing, and keep their own dismiss', () => {
    store.notify('info', 'Installed', { owner: 'app:users' });
    const dismissTheirs = store.notify('info', 'Installed', { owner: 'app:applications' });
    expect(messages()).toEqual(['Installed', 'Installed']);

    dismissTheirs();
    expect(store.notifications.get().map(({ owner }) => owner)).toEqual(['app:users']);
  });

  it('takes down everything one owner raised, and nothing else', () => {
    store.notify('info', 'Saved', { owner: 'app:users' });
    store.notify('info', 'Deleted', { owner: 'app:users' });
    store.notify('info', 'Installed', { owner: 'app:applications' });
    store.notify('info', 'Unowned');

    store.dismissOwned('app:users');

    expect(messages()).toEqual(['Installed', 'Unowned']);
  });

  it("reaches an owner's notification still waiting in the queue", () => {
    fill();
    store.notify('info', 'queued', { owner: 'app:users', autoHide: false });

    store.dismissOwned('app:users');
    vi.advanceTimersByTime(SHORT_LIFETIME_MS);

    expect(messages()).toEqual([]);
  });
});

describe('clear', () => {
  it('empties the queue behind the stack as well', () => {
    fill();
    show('queued');

    store.clear();
    vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    expect(messages()).toEqual([]);

    show('queued');
    expect(messages()).toEqual(['queued']);
  });
});

describe('onClose', () => {
  it('is called once, whichever way the notification leaves', () => {
    const byDismiss = vi.fn();
    const byLifetime = vi.fn();
    const byClear = vi.fn();
    const fromQueue = vi.fn();

    const dismiss = store.notify('info', 'dismissed', { onClose: byDismiss });
    store.notify('info', 'expired', { onClose: byLifetime });
    store.notify('info', 'cleared', { autoHide: false, onClose: byClear });
    store.notify('info', 'queued', { onClose: fromQueue });

    dismiss();
    dismiss();
    expect(byDismiss).toHaveBeenCalledTimes(1);
    expect(fromQueue).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    expect(byLifetime).toHaveBeenCalledTimes(1);

    store.clear();
    expect(byClear).toHaveBeenCalledTimes(1);
    expect(fromQueue).toHaveBeenCalledTimes(1);
  });

  it('is not called for a duplicate that was never shown', () => {
    const onClose = vi.fn();

    store.notify('info', 'Saved');
    store.notify('info', 'Saved', { onClose })();

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('notifications', () => {
  it('reports the stack on screen changing, and never on subscribe', () => {
    const listener = vi.fn();
    store.notifications.listen(listener);
    expect(listener).not.toHaveBeenCalled();

    show('Saved');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.lastCall?.[0]).toBe(store.notifications.get());
  });

  it('stays quiet for a change to the queue alone', () => {
    fill();
    const listener = vi.fn();
    store.notifications.listen(listener);

    const dismissQueued = show('queued');
    dismissQueued();

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops reporting once unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = store.notifications.listen(listener);

    unsubscribe();
    show('Saved');

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps one store apart from another', () => {
    const other = createNotifications();

    show('mine');
    other.notify('info', 'theirs');

    expect(messages()).toEqual(['mine']);
    expect(other.notifications.get().map(({ message }) => message)).toEqual(['theirs']);
  });
});
