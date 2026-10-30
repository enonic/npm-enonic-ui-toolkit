import { cn, Toast, usePhrases } from '@enonic/ui';
import { isUrgent, type Notifications } from '@enonic/ui-utils';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { notificationListPhrases } from './notification-list.phrases';

export type NotificationListProps = {
  /** The store the application created with `createNotifications`. */
  notifications: Pick<Notifications, 'notifications' | 'dismiss' | 'pause' | 'resume'>;
  /** Where the stack sits: the application places it, since where the corner is depends on the shell. */
  className?: string;
  'data-component'?: string;
};

const NOTIFICATION_LIST_NAME = 'NotificationList';

// Inside a shadow root `document.activeElement` is the host, so the focus is read from the root
// the element is in.
function activeElementAround(element: Element): Element | null {
  return (element.getRootNode() as Document | ShadowRoot).activeElement;
}

function hasFocus(element: Element): boolean {
  return element.contains(activeElementAround(element));
}

/**
 * The toasts on screen, one `Toast` each with its actions and a close, and two `aria-live` regions
 * that announce them. Hover and focus pause a toast's lifetime, so an action is never pulled out
 * from under a pointer or a keyboard user halfway to it; an action taken dismisses the toast. A
 * toast closed from the keyboard hands its focus to the toast next to it, or back to where the
 * focus came from when the stack was entered.
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

  // ! Announced reliably only if the region predates its content: the regions stay mounted, the
  // ! toasts themselves are silenced with `aria-live="off"`, and what the store held before the
  // ! list mounted enters the regions one render after they appeared.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const announced = mounted ? notifications : [];

  const stack = useRef<HTMLDivElement>(null);
  const wrappers = useRef(new Map<number, HTMLDivElement>());
  const enteredFrom = useRef<HTMLElement | null>(null);

  const rememberEntry = (relatedTarget: EventTarget | null): void => {
    const from = relatedTarget instanceof HTMLElement ? relatedTarget : null;
    if (from == null || !stack.current?.contains(from)) {
      enteredFrom.current = from;
    }
  };

  const dismissFrom = (id: number): void => {
    const wrapper = wrappers.current.get(id);
    if (wrapper != null && hasFocus(wrapper)) {
      const neighbour = wrapper.nextElementSibling ?? wrapper.previousElementSibling;
      const target = neighbour?.querySelector('button') ?? enteredFrom.current;
      if (target?.isConnected) {
        target.focus();
      }
    }
    store.dismiss(id);
  };

  return (
    <div
      data-component={componentName}
      role="region"
      aria-label={t('enonic.uiKit.notifications.label')}
      className={cn('pointer-events-none', className)}
    >
      <div className="sr-only" aria-live="polite">
        {announced
          .filter(({ tone }) => !isUrgent(tone))
          .map(({ id, message }) => (
            <p key={id}>{message}</p>
          ))}
      </div>
      <div className="sr-only" aria-live="assertive">
        {announced
          .filter(({ tone }) => isUrgent(tone))
          .map(({ id, message }) => (
            <p key={id}>{message}</p>
          ))}
      </div>

      <div
        ref={stack}
        className="flex flex-col items-center gap-2.5"
        onFocusCapture={({ relatedTarget }) => rememberEntry(relatedTarget)}
      >
        {notifications.map(({ id, tone, message, actions }) => (
          <div
            key={id}
            ref={(element) => {
              if (element == null) {
                wrappers.current.delete(id);
              } else {
                wrappers.current.set(id, element);
              }
            }}
            className="pointer-events-auto w-full"
            onMouseEnter={() => store.pause(id)}
            onMouseLeave={({ currentTarget }) => !hasFocus(currentTarget) && store.resume(id)}
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
              onOpenChange={(open) => !open && dismissFrom(id)}
            >
              <Toast.Icon tone={tone} />
              <Toast.Description>{message}</Toast.Description>
              {actions.map(({ label, onClick }, index) => (
                <Toast.Button
                  key={`${index}-${label}`}
                  onClick={() => {
                    try {
                      onClick();
                    } finally {
                      dismissFrom(id);
                    }
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
