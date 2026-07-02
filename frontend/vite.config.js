import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest lets us use a fully custom SW (src/sw.js) so we can
      // add push notification handlers while keeping all the Workbox caching.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      devOptions: { enabled: false, type: 'module' },
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

      // workbox options used during injectManifest build
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,webp,json}'],
        // Bump this string whenever you need to force-clear all user caches
        injectionPoint: 'self.__WB_MANIFEST',
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
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Silently ignore backend restarts / ECONNRESET in dev
            if (err.code !== 'ECONNRESET') console.warn('[vite proxy /api]', err.message);
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code !== 'ECONNRESET') console.warn('[vite proxy /socket.io]', err.message);
          });
        },
      },
    },
  },

  resolve: { alias: { '@': path.resolve(__dirname, './src') } },

  build: { outDir: 'build', sourcemap: false },
});
