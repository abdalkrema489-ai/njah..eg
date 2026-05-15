// src/hooks/usePushNotifications.js
// Capacitor Push Notifications — request permission, register token, handle events
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import client from '../api/index';

/**
 * usePushNotifications — initialize FCM push notifications on native platforms.
 * Automatically skips on web (PWA push is handled separately via VAPID).
 *
 * @param {string|null} userId — current authenticated user ID
 *
 * Usage in App.jsx:
 *   import { usePushNotifications } from './hooks/usePushNotifications';
 *   // Inside the component:
 *   usePushNotifications(user?.id);
 */
export function usePushNotifications(userId) {
  useEffect(() => {
    // Only run on Capacitor native (Android / iOS)
    if (!userId || !Capacitor.isNativePlatform()) return;

    let cleanup = () => {};

    async function initPush() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // 1. Request permission
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== 'granted') {
          console.warn('[Push] Permission not granted');
          return;
        }

        // 2. Register with FCM / APNs
        await PushNotifications.register();

        // 3. Receive token → send to backend
        const regListener = await PushNotifications.addListener('registration', async (token) => {
          try {
            await client.post('/users/push-token', {
              token:    token.value,
              platform: Capacitor.getPlatform(), // 'android' | 'ios'
            });
            console.info('[Push] Token registered:', token.value.slice(0, 20) + '…');
          } catch (err) {
            console.warn('[Push] Failed to save token:', err.message);
          }
        });

        // 4. Handle registration errors
        const errListener = await PushNotifications.addListener('registrationError', (err) => {
          console.error('[Push] Registration error:', err.error);
        });

        // 5. Foreground notification received
        const fgListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            console.info('[Push] Foreground notification:', notification.title);
          }
        );

        // 6. User tapped notification → navigate to link
        const tapListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            const data = action.notification.data;
            if (data?.link) {
              window.location.href = data.link;
            }
          }
        );

        cleanup = async () => {
          await regListener.remove();
          await errListener.remove();
          await fgListener.remove();
          await tapListener.remove();
        };

      } catch (err) {
        console.warn('[Push] Not available:', err.message);
      }
    }

    initPush();
    return () => { cleanup(); };
  }, [userId]);
}
