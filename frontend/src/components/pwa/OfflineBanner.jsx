// src/components/pwa/OfflineBanner.jsx
// Slim top banner that appears whenever the network drops
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../context/store';

export default function OfflineBanner() {
  const { language } = useUIStore();
  const isAr = language === 'ar';
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [justCameBack, setJustCameBack] = useState(false);

  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      setJustCameBack(true);
      setTimeout(() => setJustCameBack(false), 3000);
    };
    const offline = () => {
      setIsOnline(false);
      setJustCameBack(false);
    };
    window.addEventListener('online',  online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online',  online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const show = !isOnline || justCameBack;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="offline-banner"
          initial={{ y: -52, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -52, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 10000,
            padding: '10px 20px',
            background: isOnline
              ? 'linear-gradient(90deg, #059669, #10B981)'
              : 'linear-gradient(90deg, #B91C1C, #EF4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            direction: isAr ? 'rtl' : 'ltr',
          }}
        >
          <span style={{ fontSize: 16 }}>
            {isOnline ? '✅' : '📡'}
          </span>
          <span style={{
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-ar, inherit)',
          }}>
            {isOnline
              ? (isAr ? 'عاد الاتصال بالإنترنت!' : 'Back online!')
              : (isAr ? 'أنت غير متصل — بعض الميزات تعمل بدون إنترنت' : 'You\'re offline — some features still work')}
          </span>
          {!isOnline && (
            <span style={{
              marginRight: isAr ? 0 : 'auto',
              marginLeft:  isAr ? 'auto' : 0,
              fontSize: 11,
              color: 'rgba(255,255,255,0.7)',
              background: 'rgba(0,0,0,0.2)',
              padding: '3px 10px',
              borderRadius: 99,
            }}>
              {isAr ? '📦 الكاش متاح' : '📦 Cached content available'}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
