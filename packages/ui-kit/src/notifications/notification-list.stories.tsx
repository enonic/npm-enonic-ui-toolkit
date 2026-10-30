import { Button } from '@enonic/ui';
import type { ToastTone } from '@enonic/ui-types';
import { createNotifications } from '@enonic/ui-utils';
import type { Meta, StoryObj } from '@storybook/preact-vite';
import type { ReactElement } from 'react';

import { NotificationList } from './notification-list';

const meta: Meta<typeof NotificationList> = {
  title: 'UiKit/NotificationList',
  component: NotificationList,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof NotificationList>;

const notifications = createNotifications();

const MESSAGES: Record<ToastTone, string> = {
  info: 'Reindexing the repository',
  success: 'The content was saved',
  warning: 'The repository is running out of space',
  error: 'The application could not be started',
};

let counter = 0;

const Playground = (): ReactElement => (
  <div className="flex min-h-screen flex-col gap-4 p-6">
    <div className="text-subtle max-w-120 text-sm">
      Every button raises a toast on one store. Three show at once and the rest queue; an info or a
      success lives five seconds, a warning or an error thirty; hovering or focusing a toast holds
      it; an action taken dismisses it. The same message twice is one toast. A toast closed from the
      keyboard hands its focus to the toast next to it, or back to the button that raised it. The
      list sits where the story puts it, bottom right.
    </div>
    <div className="flex flex-wrap gap-2">
      {(Object.keys(MESSAGES) as ToastTone[]).map((tone) => (
        <Button
          key={tone}
          variant="outline"
          onClick={() => notifications.notify(tone, MESSAGES[tone])}
        >
          {tone}
        </Button>
      ))}
      <Button
        variant="outline"
        onClick={() => {
          counter += 1;
          const item = counter;
          notifications.notify('success', `Item ${item} was deleted`, {
            actions: [
              {
                label: 'Undo',
                onClick: () => notifications.notify('info', `Item ${item} was restored`),
              },
            ],
          });
        }}
      >
        with an action
      </Button>
      <Button
        variant="outline"
        onClick={() => notifications.notify('info', 'Working, this stays up', { autoHide: false })}
      >
        no auto-hide
      </Button>
      <Button variant="outline" onClick={() => notifications.clear()}>
        clear
      </Button>
    </div>
    <NotificationList
      notifications={notifications}
      className="fixed right-6 bottom-6 w-full max-w-115 px-2 sm:px-0"
    />
  </div>
);

export const Default: Story = {
  render: () => <Playground />,
};
