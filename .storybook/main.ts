import type { StorybookConfig } from '@storybook/preact-vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * One Storybook for the workspace: every package's stories, rendered on Preact the way the
 * tests run. `react` is aliased to `preact/compat` here as in the root Vite config, and the
 * packages that carry `require('react')` are pre-bundled together so one Preact instance serves
 * them all — two would leave hooks without their context.
 */
const config: StorybookConfig = {
  stories: ['../packages/*/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: '@storybook/preact-vite',
  viteFinal(viteConfig) {
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias as Record<string, string>),
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/client': 'preact/compat/client',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
    };
    viteConfig.resolve.dedupe = [
      ...(viteConfig.resolve.dedupe ?? []),
      'preact',
      'preact/compat',
      'preact/hooks',
      'preact/jsx-runtime',
    ];
    viteConfig.optimizeDeps ??= {};
    viteConfig.optimizeDeps.include = [
      ...(viteConfig.optimizeDeps.include ?? []),
      'preact',
      'preact/hooks',
      'preact/compat',
      '@enonic/ui',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      'lucide-react',
    ];
    viteConfig.plugins ??= [];
    viteConfig.plugins.push(tailwindcss());
    return viteConfig;
  },
};

export default config;
