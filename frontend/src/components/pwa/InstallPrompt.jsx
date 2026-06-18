// src/components/pwa/InstallPrompt.jsx
// "Add to Home Screen" install button + update notification
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, useAuthStore } from '../../context/store';

export default function InstallPrompt() {
  const { language } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const isAr = language === 'ar';

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall]       = useState(false);
  const [showUpdate, setShowUpdate]         = useState(false);
  const [installed, setInstalled]           = useState(false);
  const [isMobile, setIsMobile]             = useState(() => window.innerWidth < 1100);

  useEffect(() => {
    const checkResize = () => setIsMobile(window.innerWidth < 1100);
    window.addEventListener('resize', checkResize);

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Capture the browser's install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 10 seconds
      setTimeout(() => setShowInstall(true), 10000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setShowInstall(false);
      setInstalled(true);
    });

    // Listen for SW update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('resize', checkResize);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleUpdate = () => {
    window.location.reload();
    setShowUpdate(false);
  };

  if (installed) return null;

  return (
    <>
      {/* ── Install Banner ── */}
      <AnimatePresence>
        {showInstall && (
          <motion.div
            initial={{ y: 120, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 120, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: (isMobile && isAuthenticated) ? 'calc(84px + env(safe-area-inset-bottom))' : (isMobile ? 32 : 20),
              left: '50%',
              width: 'calc(100% - 32px)', maxWidth: 440,
              background: 'linear-gradient(135deg, rgba(15,12,41,0.97), rgba(30,27,75,0.97))',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: isMobile ? 16 : 24, padding: isMobile ? 12 : 20,
              boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
              backdropFilter: 'blur(20px)',
              zIndex: 9999,
              display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16,
              direction: isAr ? 'rtl' : 'ltr',
            }}
          >
            {/* App icon */}
            <div style={{
              width: isMobile ? 40 : 56, height: isMobile ? 40 : 56, borderRadius: isMobile ? 12 : 16, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 22 : 28, boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}>
              🎓
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 13.5 : 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>
                {isAr ? 'ثبّت تطبيق نجاح!' : 'Install Najah App!'}
              </div>
              <div style={{ fontSize: isMobile ? 10.5 : 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                {isAr
                  ? 'شاشة رئيسية · يعمل بدون إنترنت · تجربة أسرع'
                  : 'Home screen · Works offline · Faster experience'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
              <button
                onClick={() => setShowInstall(false)}
                style={{
                  padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: isMobile ? 8 : 10, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  fontSize: isMobile ? 11 : 12, cursor: 'pointer', fontWeight: 600,
                }}
              >
                {isAr ? 'لاحقاً' : 'Later'}
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleInstall}
                style={{
                  padding: isMobile ? '6px 14px' : '8px 18px', borderRadius: isMobile ? 8 : 10, border: 'none',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  color: '#fff', fontSize: isMobile ? 11.5 : 13, fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                }}
              >
                {isAr ? 'ثبّت ⬇️' : 'Install ⬇️'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Update Available Banner ── */}
      <AnimatePresence>
        {showUpdate && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            style={{
              position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
              width: 'calc(100% - 32px)', maxWidth: 420,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderRadius: 16, padding: '14px 20px', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
              direction: isAr ? 'rtl' : 'ltr',
            }}
          >
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
              🔄 {isAr ? 'تحديث جديد متاح!' : 'New update available!'}
            </span>
            <button
              onClick={handleUpdate}
              style={{
                padding: '6px 16px', borderRadius: 10, border: 'none',
                background: '#fff', color: '#059669',
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
              }}
            >
              {isAr ? 'تحديث الآن' : 'Update Now'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
