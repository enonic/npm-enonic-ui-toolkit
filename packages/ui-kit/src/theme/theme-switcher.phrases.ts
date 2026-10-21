/**
 * The switcher's own English, keyed `enonic.uiKit.themeSwitcher.<name>`: the tooltip names the
 * theme picked, the accessible name what a click does. See `uiKitPhrases`.
 */
export const themeSwitcherPhrases = {
  'enonic.uiKit.themeSwitcher.light': 'Light theme',
  'enonic.uiKit.themeSwitcher.dark': 'Dark theme',
  'enonic.uiKit.themeSwitcher.system': 'System preference',
  'enonic.uiKit.themeSwitcher.switchToDark': 'Switch to dark theme',
  'enonic.uiKit.themeSwitcher.switchToSystem': 'Use system theme',
  'enonic.uiKit.themeSwitcher.switchToLight': 'Switch to light theme',
} as const;

export type ThemeSwitcherPhraseKey = keyof typeof themeSwitcherPhrases;
