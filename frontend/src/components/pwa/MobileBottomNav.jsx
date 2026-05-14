// src/components/pwa/MobileBottomNav.jsx
// Mobile-only bottom navigation (shows only on small screens, hidden on desktop)
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore, useUIStore } from '../../context/store';

const NAV_ITEMS_STUDENT = [
  { to: '/',        icon: '🏠', labelAr: 'الرئيسية', labelEn: 'Home' },
  { to: '/ai',      icon: '🎓', labelAr: 'Najah AI',  labelEn: 'AI' },
  { to: '/planner', icon: '📅', labelAr: 'جدول',       labelEn: 'Planner' },
  { to: '/notes',   icon: '📝', labelAr: 'ملاحظات',   labelEn: 'Notes' },
  { to: '/profile', icon: '👤', labelAr: 'حسابي',      labelEn: 'Profile' },
];

const NAV_ITEMS_TEACHER = [
  { to: '/',              icon: '🏠', labelAr: 'الرئيسية', labelEn: 'Home' },
  { to: '/groups',        icon: '👥', labelAr: 'مجموعات',  labelEn: 'Groups' },
  { to: '/ai',            icon: '🎓', labelAr: 'AI',        labelEn: 'AI' },
  { to: '/teacher-wallet',icon: '💰', labelAr: 'المحفظة',  labelEn: 'Wallet' },
  { to: '/profile',       icon: '👤', labelAr: 'حسابي',    labelEn: 'Profile' },
];

export default function MobileBottomNav() {
  const { user, isAuthenticated } = useAuthStore();
  const { language } = useUIStore();
  const location = useLocation();
  const isAr = language === 'ar';

  if (!isAuthenticated) return null;

  const items = user?.role === 'teacher' ? NAV_ITEMS_TEACHER : NAV_ITEMS_STUDENT;

  return (
    <>
      {/* Spacer so content doesn't hide behind nav */}
      <div style={{ height: 72 }} className="mobile-nav-spacer" />

      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(10, 10, 20, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: 'calc(64px + env(safe-area-inset-bottom))',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {items.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                textDecoration: 'none',
                padding: '8px 4px',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  style={{
                    position: 'absolute',
                    top: 6,
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: 'rgba(99,102,241,0.18)',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.span
                style={{
                  fontSize: 22,
                  position: 'relative',
                  zIndex: 1,
                  filter: isActive ? 'none' : 'grayscale(60%) opacity(0.6)',
                  transition: 'filter 0.2s',
                }}
                whileTap={{ scale: 0.85 }}
              >
                {item.icon}
              </motion.span>
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#818CF8' : 'rgba(255,255,255,0.4)',
                letterSpacing: '0.01em',
                position: 'relative',
                zIndex: 1,
                transition: 'color 0.2s',
              }}>
                {isAr ? item.labelAr : item.labelEn}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
