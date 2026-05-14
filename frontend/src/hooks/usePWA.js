// src/hooks/usePWA.js
// Centralised PWA state: online status, install prompt, standalone mode
import { useState, useEffect } from 'react';

export function usePWA() {
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [isStandalone,  setIsStandalone]  = useState(false);
  const [canInstall,    setCanInstall]    = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Standalone / installed detection
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(mq.matches || window.navigator.standalone === true);

    const mqHandler = (e) => setIsStandalone(e.matches);
    mq.addEventListener('change', mqHandler);

    // Online/offline
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    // Install prompt
    const promptHandler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', promptHandler);
    window.addEventListener('appinstalled', () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    });

    return () => {
      mq.removeEventListener('change', mqHandler);
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('beforeinstallprompt', promptHandler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    return outcome === 'accepted';
  };

  return { isOnline, isStandalone, canInstall, promptInstall };
}
