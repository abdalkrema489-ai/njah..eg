import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true, suppressWarnings: true },
      injectRegister: 'auto',
      includeAssets: [
        'favicon.ico', 'apple-touch-icon.png',
        'pwa-192x192.png', 'pwa-512x512.png',
      ],

      // ── Web App Manifest ──────────────────────────────────────
      manifest: {
        name: 'نجاح — منصة التعلم الذكية',
        short_name: 'نجاح',
        description: 'منصة التعلم الذكية للطلاب المصريين — مدعومة بالذكاء الاصطناعي',
        theme_color: '#6366F1',
        background_color: '#030308',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/?source=pwa',
        lang: 'ar',
        dir: 'rtl',
        categories: ['education'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'المحادثة الذكية',
            short_name: 'Najah AI',
            url: '/ai',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'المخطط الدراسي',
            short_name: 'جدول',
            url: '/planner',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'المجموعات',
            short_name: 'مجموعات',
            url: '/groups',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        prefer_related_applications: false,
      },

      // ── Workbox Strategies ────────────────────────────────────
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,webp,json}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Bump this version string whenever you need to force-clear all user caches
        cacheId: 'najah-v2',

        runtimeCaching: [
          // API → Network-first (serves cache when offline)
          {
            urlPattern: ({ url }) => url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'najah-api-v2',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts → Cache-first (works offline)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Images → Stale-while-revalidate
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'najah-images-v1',
              expiration: { maxEntries: 150, maxAgeSeconds: 2592000 },
            },
          },
          // Firebase Storage files → Cache-first
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-v1',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // JS/CSS chunks → Stale-while-revalidate
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'najah-static-v1',
              expiration: { maxEntries: 60, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],

  define: { 'process.env': {} },

  server: {
    port: 3000,
    allowedHosts: process.env.VITE_NGROK === 'true'
      ? true
      : ['postmalarial-linearly-milly.ngrok-free.dev'],
    proxy: {
      '/api':       { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },

  resolve: { alias: { '@': path.resolve(__dirname, './src') } },

  build: { outDir: 'build', sourcemap: false },
});
