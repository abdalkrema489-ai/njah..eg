// src/components/pwa/MobileBottomNav.jsx
// Mobile-only bottom navigation — role-aware, 44px touch targets, haptic feedback
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore, useUIStore } from '../../context/store';
import { haptic } from '../../utils/haptics';

// ── nav items per role ─────────────────────────────────────────
const NAV = {
  student: [
    { to: '/',        icon: '🏠', ar: 'الرئيسية', en: 'Home'    },
    { to: '/groups',  icon: '👥', ar: 'مجموعاتي', en: 'Groups'  },
    { to: '/ai',      icon: '✨', ar: 'AI',        en: 'AI'      },
    { to: '/notes',   icon: '📝', ar: 'ملاحظات',  en: 'Notes'   },
    { to: '/profile', icon: '👤', ar: 'حسابي',    en: 'Profile' },
  ],
  teacher: [
    { to: '/',               icon: '🏠', ar: 'الرئيسية', en: 'Home'    },
    { to: '/groups',         icon: '👥', ar: 'فصولي',    en: 'Classes' },
    { to: '/ai',             icon: '✨', ar: 'AI',        en: 'AI'      },
    { to: '/teacher/wallet', icon: '💰', ar: 'المحفظة',  en: 'Wallet'  },
    { to: '/profile',        icon: '👤', ar: 'حسابي',    en: 'Profile' },
  ],
  center_owner: [
    { to: '/',          icon: '🏠', ar: 'الرئيسية',  en: 'Home'      },
    { to: '/groups',    icon: '👥', ar: 'الفصول',    en: 'Classes'   },
    { to: '/analytics', icon: '📊', ar: 'التقارير',  en: 'Analytics' },
    { to: '/payment',   icon: '💳', ar: 'الإيرادات', en: 'Revenue'   },
    { to: '/profile',   icon: '👤', ar: 'حسابي',     en: 'Profile'   },
  ],
};

export default function MobileBottomNav() {
  const { user, isAuthenticated } = useAuthStore();
  const { language } = useUIStore();
  const location = useLocation();
  const isAr = language === 'ar';

  if (!isAuthenticated) return null;

  const role  = user?.role === 'teacher'      ? 'teacher'
              : user?.role === 'center_owner' ? 'center_owner'
              : 'student';
  const items = NAV[role] || NAV.student;

  return (
    <>
      {/* Spacer so page content isn't hidden behind the nav */}
      <div style={{ height: 72 }} className="mobile-nav-spacer" />

      <nav
        className="mobile-bottom-nav"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          height:          `calc(64px + env(safe-area-inset-bottom))`,
          paddingBottom:   'env(safe-area-inset-bottom)',
          background:      'rgba(10, 10, 20, 0.95)',
          backdropFilter:  'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderTop:       '1px solid rgba(255,255,255,0.08)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-around',
          zIndex:          1000,
          boxShadow:       '0 -8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {items.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => haptic.light()}
              style={{
                flex:           1,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            3,
                // ✅ WCAG minimum 44×44px touch target
                minHeight:      44,
                minWidth:       44,
                padding:        '8px 4px',
                position:       'relative',
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Active pill background */}
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  style={{
                    position:     'absolute',
                    top:          6,
                    width:        44,
                    height:       36,
                    borderRadius: 12,
                    background:   'rgba(99,102,241,0.18)',
                    border:       '1px solid rgba(99,102,241,0.3)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon with scale animation */}
              <motion.span
                style={{
                  fontSize:   22,
                  position:   'relative',
                  zIndex:     1,
                  filter:     isActive ? 'none' : 'grayscale(60%) opacity(0.55)',
                  transition: 'filter 0.2s',
                }}
                animate={{ scale: isActive ? 1.2 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                whileTap={{ scale: 0.85 }}
              >
                {item.icon}
              </motion.span>

              {/* Label */}
              <span style={{
                fontSize:      10,
                fontWeight:    isActive ? 700 : 500,
                color:         isActive ? '#818CF8' : 'rgba(255,255,255,0.4)',
                letterSpacing: '0.01em',
                position:      'relative',
                zIndex:        1,
                transition:    'color 0.2s',
              }}>
                {isAr ? item.ar : item.en}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
