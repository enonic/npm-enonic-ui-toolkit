import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/preact-vite';
import { themes } from 'storybook/theming';

import './storybook.css';

const isDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

// The packages render their English without an `I18nProvider`; an application's provider is what
// a story of translation would add.
const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    docs: { theme: isDark ? themes.dark : themes.light },
  },
  decorators: [
    withThemeByClassName({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: isDark ? 'dark' : 'light',
    }),
  ],
};

export default preview;
