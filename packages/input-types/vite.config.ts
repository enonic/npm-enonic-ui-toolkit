import { defineConfig } from 'vite-plus';

// Lint, format and test configuration is the workspace root's; a package configures its build.
export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    // Nothing may be bundled from node_modules: a resolvable devDependency would otherwise be
    // inlined silently — a frozen copy of a sibling or react shipping inside dist.
    deps: { onlyBundle: [] },
    outDir: 'dist',
    format: 'esm',
    platform: 'neutral', // browser code, but no DOM-only assumption at build time
    target: 'es2023',
    dts: true,
    clean: true,
    sourcemap: true,
    publint: true,
    report: false,
  },
});
