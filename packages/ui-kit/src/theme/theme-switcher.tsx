import { Button, cn, Tooltip, usePhrases } from '@enonic/ui';
import type { Theme } from '@enonic/ui-types';
import { readTheme, subscribeTheme, writeTheme } from '@enonic/ui-utils';
import { Moon, Sun, SunMoon } from 'lucide-react';
import { type ReactElement, useSyncExternalStore } from 'react';

import { type ThemeSwitcherPhraseKey, themeSwitcherPhrases } from './theme-switcher.phrases';

export type ThemeSwitcherProps = {
  className?: string;
  'data-component'?: string;
};

const THEME_SWITCHER_NAME = 'ThemeSwitcher';

const NEXT_THEME: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };

const TITLE_KEYS: Record<Theme, ThemeSwitcherPhraseKey> = {
  light: 'enonic.uiKit.themeSwitcher.light',
  dark: 'enonic.uiKit.themeSwitcher.dark',
  system: 'enonic.uiKit.themeSwitcher.system',
};

const ACTION_KEYS: Record<Theme, ThemeSwitcherPhraseKey> = {
  light: 'enonic.uiKit.themeSwitcher.switchToDark',
  dark: 'enonic.uiKit.themeSwitcher.switchToSystem',
  system: 'enonic.uiKit.themeSwitcher.switchToLight',
};

const ICON_CLASS_NAME = 'absolute transition-all duration-300';
const SHOWN_CLASS_NAME = 'scale-100 rotate-0 opacity-100';
const HIDDEN_CLASS_NAME = 'scale-0 -rotate-90 opacity-0';

const iconClassName = (shown: boolean): string =>
  cn(ICON_CLASS_NAME, shown ? SHOWN_CLASS_NAME : HIDDEN_CLASS_NAME);

/**
 * Cycles the theme the admin applications share — light, dark, system — and shows the one picked.
 * It reads and writes the stored theme itself, so every switcher and every page follows a click,
 * here or in another tab; what an application paints comes from `useResolvedTheme`.
 */
const ThemeSwitcher = ({
  className,
  'data-component': componentName = THEME_SWITCHER_NAME,
}: ThemeSwitcherProps): ReactElement => {
  const theme = useSyncExternalStore(subscribeTheme, readTheme);
  const t = usePhrases(themeSwitcherPhrases);

  return (
    <Tooltip value={t(TITLE_KEYS[theme])} delay={300} asChild>
      <Button
        data-component={componentName}
        size="sm"
        variant="text"
        aria-label={t(ACTION_KEYS[theme])}
        onClick={() => writeTheme(NEXT_THEME[theme])}
        className={cn('relative size-9 rounded-sm p-0', className)}
      >
        <Sun className={iconClassName(theme === 'light')} size={16} strokeWidth={1.5} />
        <Moon className={iconClassName(theme === 'dark')} size={16} strokeWidth={1.5} />
        <SunMoon className={iconClassName(theme === 'system')} size={18} strokeWidth={1.5} />
      </Button>
    </Tooltip>
  );
};

ThemeSwitcher.displayName = THEME_SWITCHER_NAME;

export { ThemeSwitcher };
