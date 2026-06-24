// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// ── In DEV mode: unregister any stale service worker from old production builds.
// This prevents cached Railway-URL assets from being served when running locally.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      console.log('[Dev] Unregistering stale SW:', reg.scope);
      reg.unregister();
    });
  });
}

// ── Purge stale cache entries that reference old API hosts ──
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(cacheName => {
      caches.open(cacheName).then(cache => {
        cache.keys().then(requests => {
          requests.forEach(req => {
            if (
              req.url.includes('localhost:5000') ||
              req.url.includes('127.0.0.1:5000') ||
              (import.meta.env.DEV && req.url.includes('njaheg-backend-production.up.railway.app'))
            ) {
              cache.delete(req);
            }
          });
        });
      });
    });
  });
}

// Register service worker for PWA (skipWaiting + clientsClaim ensures
// the updated SW takes over immediately, purging old caches)
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('إصدار جديد متاح! هل تريد التحديث الآن؟')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    // App is ready to work offline
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
