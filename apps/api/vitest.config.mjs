import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    setupFiles: ['./src/__tests__/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        'src/services/wa-*': { lines: 85, functions: 85, branches: 80 },
        'src/services/subscricao*': { lines: 90, functions: 90, branches: 85 },
        'src/services/faturas*': { lines: 90, functions: 90, branches: 85 },
        'src/lib/evolutionApi*': { lines: 75, functions: 75, branches: 70 },
        'src/lib/n8nApi*': { lines: 75, functions: 75, branches: 70 },
        'src/lib/n8n-templates*': { lines: 70, functions: 70, branches: 65 },
        'src/routes/whatsapp*': { lines: 80, functions: 80, branches: 75 },
      },
      include: [
        'src/services/**',
        'src/routes/**',
        'src/utils/**',
        'src/lib/evolutionApi.ts',
        'src/lib/n8nApi.ts',
        'src/lib/n8n-templates/**',
      ],
      exclude: [
        'src/__tests__/**',
        'src/test/**',
        'src/seeds/**',
        'src/**/*.d.ts',
        'src/lib/n8n-templates/**',
        'src/lib/config.ts',
        'src/lib/prisma.ts',
        'src/lib/logger.ts',
        'src/lib/redis.ts',
        'src/middleware/**',
      ],
    },
    exclude: ['dist/**', 'node_modules/**'],
  },
});

