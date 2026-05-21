import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/webhook\//, /\.[a-z]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'DocAgen',
        short_name: 'DocAgen',
        description: 'Gestão de agendamento clínico profissional',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/admin/dashboard',
        scope: '/',
        lang: 'pt',
        icons: [
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Hoje',
            short_name: 'Hoje',
            description: 'Ver agendamentos de hoje',
            url: '/admin/agendamentos/hoje',
            icons: [{ src: '/shortcut-hoje.png', sizes: '96x96' }],
          },
          {
            name: 'Nova Marcação',
            short_name: 'Marcar',
            description: 'Marcar nova consulta',
            url: '/admin/agendamentos/novo',
            icons: [{ src: '/shortcut-novo.png', sizes: '96x96' }],
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
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
    dedupe: ['react', 'react-dom'],
    alias: {
      '@clinicaplus/ui': path.resolve(__dirname, '../../packages/ui/src/index.tsx'),
      '@clinicaplus/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@clinicaplus/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: [],
  },
  build: {
    chunkSizeWarningLimit: 1000,
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

