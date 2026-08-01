import { defineConfig } from 'vitest/config';

/**
 * Materialised into every workout workspace. Client checkpoints need a DOM;
 * server ones do not, so the environment is chosen per file by extension. That
 * used to be `environmentMatchGlobs`, which vitest deprecated in 3.2; two
 * projects split by extension is the replacement and keeps the authoring rule
 * the same — name a checkpoint `.test.tsx` and it gets a DOM.
 */
const shared = {
  // Testing Library only registers its auto-cleanup when a global afterEach
  // exists. Without this, one client test's DOM leaks into the next and
  // getByRole starts reporting duplicate matches.
  globals: true,
  // A workout is a timed exercise, not a build: fail fast rather than hang.
  testTimeout: 10_000,
  hookTimeout: 10_000,
};

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    reporters: ['json'],
    projects: [
      {
        esbuild: { jsx: 'automatic' },
        test: { ...shared, name: 'server', include: ['tests/**/*.test.ts'], environment: 'node' },
      },
      {
        esbuild: { jsx: 'automatic' },
        test: { ...shared, name: 'client', include: ['tests/**/*.test.tsx'], environment: 'jsdom' },
      },
    ],
  },
});
