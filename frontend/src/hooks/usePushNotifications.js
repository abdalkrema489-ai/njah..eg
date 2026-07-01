// src/hooks/usePushNotifications.js
// Initializes push notifications for both:
//   - Native Capacitor (Android/iOS) via FCM
//   - Web/PWA via VAPID (service worker PushManager)
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import client from '../api/index';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** Convert a base64 string to a Uint8Array (required by PushManager.subscribe) */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/**
 * usePushNotifications — initializes push notifications.
 *
 * • Native platform (Capacitor): requests FCM token, saves to backend.
 * • Web/PWA: subscribes via PushManager (VAPID), saves subscription to backend.
 *   Skipped silently if VITE_VAPID_PUBLIC_KEY is not set.
 *
 * @param {string|null} userId — current authenticated user ID
 */
export function usePushNotifications(userId) {
  useEffect(() => {
    if (!userId) return;

    // ── Native (Android / iOS via Capacitor) ─────────────────
    if (Capacitor.isNativePlatform()) {
      let cleanup = () => {};

      async function initNativePush() {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');

          const permission = await PushNotifications.requestPermissions();
          if (permission.receive !== 'granted') {
            console.warn('[Push] Native permission not granted');
            return;
          }

          await PushNotifications.register();

          const regListener = await PushNotifications.addListener('registration', async (token) => {
            try {
              await client.post('/users/push-token', {
                token:    token.value,
                platform: Capacitor.getPlatform(),
              });
              console.info('[Push] Native token registered:', token.value.slice(0, 20) + '…');
            } catch (err) {
              console.warn('[Push] Failed to save native token:', err.message);
            }
          });

          const errListener = await PushNotifications.addListener('registrationError', (err) => {
            console.error('[Push] Native registration error:', err.error);
          });

          const fgListener = await PushNotifications.addListener(
            'pushNotificationReceived',
            (notification) => {
              console.info('[Push] Foreground notification:', notification.title);
            }
          );

          const tapListener = await PushNotifications.addListener(
            'pushNotificationActionPerformed',
            (action) => {
              const link = action.notification.data?.link;
              if (link) window.location.href = link;
            }
          );

          cleanup = async () => {
            await regListener.remove();
            await errListener.remove();
            await fgListener.remove();
            await tapListener.remove();
          };
        } catch (err) {
          console.warn('[Push] Native push not available:', err.message);
        }
      }

      initNativePush();
      return () => { cleanup(); };
    }

    // ── Web / PWA (VAPID via PushManager) ────────────────────
    if (!VAPID_PUBLIC_KEY) {
      // VITE_VAPID_PUBLIC_KEY not configured — web push silently disabled
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.info('[Push] PushManager not supported in this browser');
      return;
    }

    async function initWebPush() {
      try {
        // Request permission first — don't subscribe if not granted
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          console.info('[Push] Web notification permission:', perm);
          return;
        }

        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // Save / upsert subscription to backend
        await client.post('/users/push-subscription', {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
            auth:   btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
          },
        });

        console.info('[Push] Web push subscription registered');
      } catch (err) {
        console.warn('[Push] Web push setup failed:', err.message);
      }
    }

    initWebPush();
  }, [userId]);
}
