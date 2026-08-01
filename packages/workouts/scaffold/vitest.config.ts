import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Materialised into every workout workspace. Client checkpoints need a DOM;
 * server ones do not, so the environment is chosen per file by extension. That
 * used to be `environmentMatchGlobs`, which vitest deprecated in 3.2; two
 * projects split by extension is the replacement and keeps the authoring rule
 * the same — name a checkpoint `.test.tsx` and it gets a DOM.
 *
 * The server project transforms with SWC rather than esbuild. Nest and TypeORM
 * read constructor parameter types back at runtime through `design:paramtypes`,
 * and esbuild does not emit decorator metadata at all, so dependency injection
 * silently resolves to undefined under it. The client project stays on esbuild,
 * which is faster and handles JSX without any of this.
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
        plugins: [
          swc.vite({
            jsc: {
              parser: { syntax: 'typescript', decorators: true },
              transform: { legacyDecorator: true, decoratorMetadata: true },
              target: 'es2022',
            },
            module: { type: 'es6' },
          }),
        ],
        test: { ...shared, name: 'server', include: ['tests/**/*.test.ts'], environment: 'node' },
      },
      {
        esbuild: { jsx: 'automatic' },
        test: { ...shared, name: 'client', include: ['tests/**/*.test.tsx'], environment: 'jsdom' },
      },
    ],
  },
});
