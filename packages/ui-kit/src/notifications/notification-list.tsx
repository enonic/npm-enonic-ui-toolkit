import { cn, Toast, usePhrases } from '@enonic/ui';
import { isUrgent, type Notifications } from '@enonic/ui-utils';
import { type ReactElement, useCallback, useSyncExternalStore } from 'react';

import { notificationListPhrases } from './notification-list.phrases';

export type NotificationListProps = {
  /** The store the application created with `createNotifications`. */
  notifications: Pick<Notifications, 'notifications' | 'dismiss' | 'pause' | 'resume'>;
  /** Where the stack sits: the application places it, since where the corner is depends on the shell. */
  className?: string;
  'data-component'?: string;
};

const NOTIFICATION_LIST_NAME = 'NotificationList';

/**
 * The toasts on screen, one `Toast` each with its actions and a close, and two `aria-live` regions
 * that announce them. Hover and focus pause a toast's lifetime, so an action is never pulled out
 * from under a pointer or a keyboard user halfway to it; an action taken dismisses the toast.
 */
const NotificationList = ({
  notifications: store,
  className,
  'data-component': componentName = NOTIFICATION_LIST_NAME,
}: NotificationListProps): ReactElement => {
  const readable = store.notifications;
  const subscribe = useCallback((onChange: () => void) => readable.listen(onChange), [readable]);
  const read = useCallback(() => readable.get(), [readable]);
  const notifications = useSyncExternalStore(subscribe, read);
  const t = usePhrases(notificationListPhrases);

  return (
    <div
      data-component={componentName}
      role="region"
      aria-label={t('enonic.uiKit.notifications.label')}
      className={cn('pointer-events-none', className)}
    >
      {/* ! Announced reliably only if the region predates its content, so these stay mounted and
          ! the toasts themselves are silenced with `aria-live="off"`. */}
      <div className="sr-only" aria-live="polite">
        {notifications
          .filter(({ tone }) => !isUrgent(tone))
          .map(({ id, message }) => (
            <p key={id}>{message}</p>
          ))}
      </div>
      <div className="sr-only" aria-live="assertive">
        {notifications
          .filter(({ tone }) => isUrgent(tone))
          .map(({ id, message }) => (
            <p key={id}>{message}</p>
          ))}
      </div>

      <div className="flex flex-col items-center gap-2.5">
        {notifications.map(({ id, tone, message, actions }) => (
          <div
            key={id}
            className="pointer-events-auto w-full"
            onMouseEnter={() => store.pause(id)}
            onMouseLeave={({ currentTarget }) =>
              !currentTarget.contains(document.activeElement) && store.resume(id)
            }
            onFocusCapture={() => store.pause(id)}
            onBlurCapture={({ currentTarget }) =>
              !currentTarget.matches(':hover') && store.resume(id)
            }
          >
            <Toast
              open
              withClose
              role="status"
              aria-live="off"
              onOpenChange={(open) => !open && store.dismiss(id)}
            >
              <Toast.Icon tone={tone} />
              <Toast.Description>{message}</Toast.Description>
              {actions.map(({ label, onClick }, index) => (
                <Toast.Button
                  key={`${index}-${label}`}
                  onClick={() => {
                    onClick();
                    store.dismiss(id);
                  }}
                >
                  {label}
                </Toast.Button>
              ))}
            </Toast>
          </div>
        ))}
      </div>
    </div>
  );
};

NotificationList.displayName = NOTIFICATION_LIST_NAME;

export { NotificationList };
