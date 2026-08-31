import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

const source = (name: string): string =>
  fileURLToPath(new URL(`packages/${name}/src/index.ts`, import.meta.url));

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

  // Run on commit by the hook dispatcher; `vp check --fix` so lint autofixes ride along.
  staged: {
    '*.{ts,tsx}': 'vp check --fix',
    '*.{json,md,yml,yaml}': 'vp fmt',
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

  // The workspace builds and tests on Preact; `react` is what package sources import.
  // These aliases govern lint and tests only — `vp pack` emits `react` as a bare external,
  // and `react`/`react-dom`/`preact` become optional peers with the first component.
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/client': 'preact/compat/client',
      'react/jsx-runtime': 'preact/jsx-runtime',
      // Siblings resolve to source in tests, mirroring the root tsconfig `paths`, so a test
      // needs no build and never runs against a stale dist.
      '@enonic/ui-types': source('ui-types'),
      '@enonic/ui-utils': source('ui-utils'),
      '@enonic/ui-kit': source('ui-kit'),
      '@enonic/input-types': source('input-types'),
    },
    dedupe: ['preact', 'preact/compat'],
  },
});
