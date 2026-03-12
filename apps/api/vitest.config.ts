import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    setupFiles:  ['./src/__tests__/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        lines:     70,
        functions: 70,
        branches:  65,
      },
      include: ['src/services/**', 'src/routes/**', 'src/utils/**'],
      exclude: ['src/lib/**', 'src/middleware/**'],
    },
    exclude: ['dist/**', 'node_modules/**']
  },
});
