import { defineConfig } from 'vite-plus';

/**
 * Workspace-level configuration: linting, formatting and tests run once over every package.
 * Building is per package — each one carries its own `pack` config, and `vp run -r build`
 * walks them in dependency order.
 */
export default defineConfig({
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ['**/dist/**', '**/*.d.ts'],
  },

  fmt: {
    singleQuote: true,
    sortImports: true,
    ignorePatterns: ['**/dist/**', '.github/**'],
  },

  // `vp run -r <task>` walks the packages in dependency order; caching package.json scripts is
  // what makes a second `build` free when nothing changed.
  run: {
    cache: { scripts: true },
  },

  test: {
    environment: 'node',
    include: ['packages/*/src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
  },

  // Every package is Preact; `react` is what the ecosystem's types and libraries import.
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/client': 'preact/compat/client',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
    dedupe: ['preact', 'preact/compat'],
  },
});
