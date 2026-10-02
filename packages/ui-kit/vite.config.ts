import { defineConfig } from 'vite-plus';

// Lint, format and test configuration is the workspace root's; a package configures its build.
export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    // One file per module, so `sideEffects: false` lets a consumer's bundler drop what it never
    // imports; a single bundled chunk keeps every unannotated top-level `forwardRef` and context.
    unbundle: true,
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
