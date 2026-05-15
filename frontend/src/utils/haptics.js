// src/utils/haptics.js
// Cross-platform haptic feedback: Capacitor on native, Web Vibration API in browser
import { Capacitor } from '@capacitor/core';

export const haptic = {
  /** Light tap — nav press, minor action */
  light: () => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics')
        .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
        .catch(() => {});
    } else {
      navigator.vibrate?.(25);
    }
  },

  /** Medium tap — button press, form submit */
  medium: () => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics')
        .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Medium }))
        .catch(() => {});
    } else {
      navigator.vibrate?.(50);
    }
  },

  /** Heavy — destructive action, important confirmation */
  heavy: () => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics')
        .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Heavy }))
        .catch(() => {});
    } else {
      navigator.vibrate?.(80);
    }
  },

  /** Success notification pattern */
  success: () => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics')
        .then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }))
        .catch(() => {});
    } else {
      navigator.vibrate?.([30, 30, 30]);
    }
  },

  /** Warning notification pattern */
  warning: () => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics')
        .then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Warning }))
        .catch(() => {});
    } else {
      navigator.vibrate?.([50, 30, 50]);
    }
  },

  /** Error notification pattern */
  error: () => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics')
        .then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Error }))
        .catch(() => {});
    } else {
      navigator.vibrate?.([100, 50, 100]);
    }
  },
};

// Usage:
// import { haptic } from '../../utils/haptics';
// onClick={() => { haptic.light(); doAction(); }}
// onSuccess: haptic.success()
// onError: haptic.error()
