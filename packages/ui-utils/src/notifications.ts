import type { NotifyOptions, ToastTone } from '@enonic/ui-types';

export type NotificationAction = {
  label: string;
  onClick: () => void;
};

/** What a toast is raised with: the host contract's options, and what an application's own may add. */
export type NotificationOptions = NotifyOptions & {
  actions?: readonly NotificationAction[];
  /** Who raised it, where something can be revoked — a mount's extension key. */
  owner?: string;
  /**
   * Called once when the toast leaves the stack, whichever way it goes. Never for one dropped as a
   * duplicate: it was not shown, and the one already up keeps its own `onClose`.
   */
  onClose?: () => void;
};

/** One entry on the stack — Mantine's name, since `Notification` is the DOM's and `Toast` is `@enonic/ui`'s. */
export type NotificationData = {
  id: number;
  tone: ToastTone;
  message: string;
  autoHide: boolean;
  lifetimeMs: number;
  actions: readonly NotificationAction[];
  owner?: string;
  onClose?: () => void;
};

export type NotificationsState = {
  visible: readonly NotificationData[];
  queued: readonly NotificationData[];
};

export const EMPTY_STATE: NotificationsState = { visible: [], queued: [] };

/** Beyond this many at once the stack covers the screen it is reporting on. */
export const VISIBLE_LIMIT = 3;

export const SHORT_LIFETIME_MS = 5000;

export const LONG_LIFETIME_MS = 30_000;

/** The longest wait `setTimeout` keeps: past a signed 32-bit delay it fires at once. */
export const MAX_LIFETIME_MS = 2 ** 31 - 1;

export function isUrgent(tone: ToastTone): boolean {
  return tone === 'error' || tone === 'warning';
}

/**
 * The requested lifetime, or the tone's own — a warning or an error is worth reading twice. Only a
 * positive finite one is taken, and no further than `setTimeout` can wait: it waits no time at
 * all for zero, for `Infinity` and for anything past `MAX_LIFETIME_MS`.
 */
export function lifetimeFor(tone: ToastTone, requestedMs?: number): number {
  if (requestedMs != null && Number.isFinite(requestedMs) && requestedMs > 0) {
    return Math.min(requestedMs, MAX_LIFETIME_MS);
  }

  return isUrgent(tone) ? LONG_LIFETIME_MS : SHORT_LIFETIME_MS;
}

/**
 * Acting on several items reports one failure per item; three identical toasts say it once. Owners
 * are told apart: two mounts saying the same thing each keep an entry they can take down.
 */
export function findDuplicate(
  { visible, queued }: NotificationsState,
  candidate: Pick<NotificationData, 'tone' | 'message' | 'owner'>,
): NotificationData | undefined {
  return [...visible, ...queued].find(
    ({ tone, message, owner }) =>
      tone === candidate.tone && message === candidate.message && owner === candidate.owner,
  );
}

/** Shows the notification, or queues it while the stack is full. Deduplication is the caller's. */
export function admit(
  state: NotificationsState,
  notification: NotificationData,
): NotificationsState {
  if (state.visible.length < VISIBLE_LIMIT) {
    return { ...state, visible: [...state.visible, notification] };
  }

  return { ...state, queued: [...state.queued, notification] };
}

/** Drops the notification and promotes the head of the queue into the space it left. */
export function remove(state: NotificationsState, id: number): NotificationsState {
  const visible = state.visible.filter((notification) => notification.id !== id);

  if (visible.length === state.visible.length) {
    return { ...state, queued: state.queued.filter((notification) => notification.id !== id) };
  }

  const [next, ...queued] = state.queued;

  return next === undefined ? { ...state, visible } : { visible: [...visible, next], queued };
}
