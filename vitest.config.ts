import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 20000,
    environmentMatchGlobs: [
      ['apps/web/**', 'jsdom'],
      ['apps/api/**', 'node'],
      ['apps/worker/**', 'node'],
    ],
    setupFiles: ['./apps/web/test/setup.ts'],
  },
});
