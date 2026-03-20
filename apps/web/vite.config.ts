import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Trigger Vite restart to clear deps cache
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    // Prevent duplicate React instances from monorepo packages
    dedupe: ['react', 'react-dom'],
    alias: {
      // Point workspace packages directly to their source during dev/build
      // so Vite processes them without needing a dist build first
      '@clinicaplus/ui': path.resolve(__dirname, '../../packages/ui/src/index.tsx'),
      '@clinicaplus/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@clinicaplus/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
    },
  },
  optimizeDeps: {
    // Force Vite to include these workspace packages in pre-bundling
    include: ['@clinicaplus/types', '@clinicaplus/utils'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-ui':    ['lucide-react'],
        }
      }
    }
  },
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.idea/**', '.git/**', '.cache/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/test/**', 'src/**/*.test.tsx', 'src/**/*.test.ts'],
    },
  },
});
