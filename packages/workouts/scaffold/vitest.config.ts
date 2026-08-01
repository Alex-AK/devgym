import { defineConfig } from 'vitest/config';

/**
 * Materialised into every workout workspace. Client checkpoints need a DOM;
 * server ones do not, so the environment is chosen per file by extension.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Testing Library only registers its auto-cleanup when a global afterEach
    // exists. Without this, one client test's DOM leaks into the next and
    // getByRole starts reporting duplicate matches.
    globals: true,
    environmentMatchGlobs: [
      ['**/*.test.tsx', 'jsdom'],
      ['**/*.test.ts', 'node'],
    ],
    // A workout is a timed exercise, not a build: fail fast rather than hang.
    testTimeout: 10_000,
    hookTimeout: 10_000,
    reporters: ['json'],
  },
});
