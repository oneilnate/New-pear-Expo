import { defineConfig } from 'vitest/config';
import { reactNative } from 'vitest-native';

export default defineConfig({
  plugins: [reactNative()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    // Exclude Playwright e2e tests — they run via playwright test, not vitest
    // Exclude api/ subdirectory — it has its own vitest config and pnpm workspace
    exclude: ['e2e/**', 'node_modules/**', 'api/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'lcov'],
      // Thresholds scoped to src/services/** only at scaffold stage.
      // src/modules/food hooks + types are stubs until F2/F3 writes backend-contract tests.
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
      include: ['src/services/**'],
      exclude: [
        'src/app/**',
        'src/types/**',
        'src/services/__mocks__/**',
        'src/modules/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
