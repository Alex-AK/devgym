import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `data/` holds the runtime databases and the materialised workout
    // workspaces. A workspace carries the checkpoint suites of the workout
    // being attempted, and those are written to fail until the user solves
    // them — so collecting them here would break `pnpm verify` for anyone
    // with an attempt open.
    exclude: ['**/node_modules/**', '**/dist/**', 'data/**'],
  },
});
