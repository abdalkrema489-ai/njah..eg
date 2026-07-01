// src/sw.js — Custom Service Worker for Najah PWA
// Handles: offline caching (via Workbox), web push notifications, notification clicks.
// Built by vite-plugin-pwa using injectManifest strategy.
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute, Route } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NetworkOnly } from 'workbox-strategies';

// ── Precache all static assets (injected by Vite at build time) ──
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// ── Runtime Caching ───────────────────────────────────────────

// Google Fonts stylesheets — Cache First
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Google Fonts webfonts — Cache First
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 31536000 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Images — StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'najah-images-v2',
    plugins: [
      new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 2592000 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Firebase Storage — Cache First
registerRoute(
  ({ url }) => url.origin === 'https://firebasestorage.googleapis.com',
  new CacheFirst({
    cacheName: 'firebase-storage-v2',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 604800 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// JS/CSS — StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'najah-static-v2',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 86400 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// Railway API — NetworkFirst
registerRoute(
  ({ url }) => url.hostname.includes('railway.app') && url.pathname.startsWith('/api'),
  new NetworkFirst({
    cacheName: 'najah-api-v2',
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 300 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// ── Web Push Notification Handler ────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'نجاح', body: event.data.text(), link: '/' };
  }

  const { title = 'نجاح', body = '', link = '/', icon = '/pwa-192x192.png' } = payload;

  const options = {
    body,
    icon,
    badge: '/pwa-192x192.png',
    tag: 'najah-notification',          // collapses duplicate notifications
    renotify: true,
    vibrate: [200, 100, 200],
    data: { link },
    actions: [
      { action: 'open', title: 'فتح التطبيق' },
      { action: 'dismiss', title: 'رفض' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click Handler ────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const link = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app window already open — focus it and navigate
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus();
            client.navigate(link);
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(link);
        }
      })
  );
});
