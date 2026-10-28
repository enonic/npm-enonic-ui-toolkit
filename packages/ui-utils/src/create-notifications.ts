import type { Readable, ToastTone } from '@enonic/ui-types';

import {
  admit,
  EMPTY_STATE,
  findDuplicate,
  lifetimeFor,
  type NotificationData,
  type NotificationOptions,
  type NotificationsState,
  remove,
} from './notifications';

export type Notifications = {
  /**
   * Shows a toast and returns its dismiss. One just like it — same tone, message and owner — is
   * not shown twice: the dismiss of the one already up comes back instead, and its options stand.
   */
  notify(tone: ToastTone, message: string, options?: NotificationOptions): () => void;
  dismiss(id: number): void;
  /** Takes down everything one owner raised — a mount being revoked. */
  dismissOwned(owner: string): void;
  clear(): void;
  /** Holds an auto-hiding toast's lifetime — while it is hovered or focused. */
  pause(id: number): void;
  /** Resumes with the time that was left, not a fresh lifetime. */
  resume(id: number): void;
  /** What is on screen, in order; what is queued behind it is not shown until it is. */
  notifications: Readable<readonly NotificationData[]>;
};

type Timer = {
  remainingMs: number;
  startedAt?: number;
  id?: ReturnType<typeof setTimeout>;
};

/**
 * A toast stack's state: the entries on screen, the queue behind them, each entry's lifetime and
 * its pause. An application creates one, hands it to the stack component and to every host it
 * creates for a mount; the toolkit holds no instance.
 */
export function createNotifications(): Notifications {
  let state = EMPTY_STATE;
  let lastId = 0;
  const timers = new Map<number, Timer>();
  const listeners = new Set<(value: readonly NotificationData[]) => void>();

  function dismiss(id: number): void {
    settle(remove(state, id));
  }

  function startTimer(id: number): void {
    const timer = timers.get(id);
    if (timer == null || timer.id != null) {
      return;
    }

    if (timer.remainingMs <= 0) {
      dismiss(id);
      return;
    }

    timer.startedAt = Date.now();
    timer.id = setTimeout(() => dismiss(id), timer.remainingMs);
  }

  // One pass after every change: a notification promoted out of the queue starts its lifetime
  // here, so it gets the full one rather than what was left of the one it replaced.
  function syncTimers(): void {
    const shown = new Set(state.visible.map(({ id }) => id));

    timers.forEach((timer, id) => {
      if (shown.has(id)) {
        return;
      }
      if (timer.id != null) {
        clearTimeout(timer.id);
      }
      timers.delete(id);
    });

    state.visible.forEach(({ id, autoHide, lifetimeMs }) => {
      if (!autoHide || timers.has(id)) {
        return;
      }

      timers.set(id, { remainingMs: lifetimeMs });
      startTimer(id);
    });
  }

  function settle(next: NotificationsState): void {
    const previous = state;
    state = next;
    syncTimers();

    if (next.visible !== previous.visible) {
      listeners.forEach((listener) => listener(next.visible));
    }

    const kept = new Set([...next.visible, ...next.queued].map(({ id }) => id));
    [...previous.visible, ...previous.queued]
      .filter(({ id }) => !kept.has(id))
      .forEach(({ onClose }) => onClose?.());
  }

  return {
    notify(tone, message, options = {}) {
      const { autoHide = true, lifetimeMs, actions = [], owner, onClose } = options;

      const duplicate = findDuplicate(state, { tone, message, owner });
      if (duplicate != null) {
        return () => dismiss(duplicate.id);
      }

      lastId += 1;
      const notification: NotificationData = {
        id: lastId,
        tone,
        message,
        autoHide,
        lifetimeMs: lifetimeFor(tone, lifetimeMs),
        actions,
        owner,
        onClose,
      };

      settle(admit(state, notification));

      return () => dismiss(notification.id);
    },

    dismiss,

    dismissOwned(owner) {
      [...state.visible, ...state.queued]
        .filter((notification) => notification.owner === owner)
        .forEach(({ id }) => dismiss(id));
    },

    clear() {
      settle(EMPTY_STATE);
    },

    pause(id) {
      const timer = timers.get(id);
      if (timer?.id == null || timer.startedAt == null) {
        return;
      }

      clearTimeout(timer.id);
      timer.remainingMs = Math.max(0, timer.remainingMs - (Date.now() - timer.startedAt));
      timer.id = undefined;
      timer.startedAt = undefined;
    },

    resume(id) {
      startTimer(id);
    },

    notifications: {
      get: () => state.visible,
      listen: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
  };
}
