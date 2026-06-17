// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// ── Purge any stale localhost:5000 cache entries left by old service workers ──
// This runs once on every page load and silently removes bad cached responses.
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(cacheName => {
      caches.open(cacheName).then(cache => {
        cache.keys().then(requests => {
          requests.forEach(req => {
            if (req.url.includes('localhost:5000') || req.url.includes('127.0.0.1:5000')) {
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
