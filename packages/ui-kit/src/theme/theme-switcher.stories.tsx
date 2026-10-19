import { readTheme, subscribeTheme } from '@enonic/ui-utils';
import type { Meta, StoryObj } from '@storybook/preact-vite';
import { type ReactElement, useSyncExternalStore } from 'react';

import { ThemeSwitcher } from './theme-switcher';
import { useResolvedTheme } from './use-resolved-theme';

const meta: Meta<typeof ThemeSwitcher> = {
  title: 'UiKit/ThemeSwitcher',
  component: ThemeSwitcher,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ThemeSwitcher>;

const Playground = (): ReactElement => {
  const picked = useSyncExternalStore(subscribeTheme, readTheme);
  const painted = useResolvedTheme();

  return (
    <div className="flex flex-col items-center gap-y-4 p-4">
      <div className="text-subtle max-w-120 text-sm">
        The switcher cycles light, dark and system, and stores the pick under{' '}
        <code>enonic:theme</code>. Open this story in a second tab and switch in one: the other
        follows. On system, change the OS appearance: the painted theme follows with no click.
        Remove the entry in the devtools, from another tab: the pick falls back to system.
      </div>
      <ThemeSwitcher />
      <div
        className={
          painted === 'dark'
            ? 'rounded-md border border-white/20 bg-black px-6 py-4 text-sm text-white'
            : 'rounded-md border border-black/20 bg-white px-6 py-4 text-sm text-black'
        }
      >
        Picked: <strong>{picked}</strong> · Painted: <strong>{painted}</strong>
      </div>
    </div>
  );
};

export const Default: Story = {
  render: () => <Playground />,
};
