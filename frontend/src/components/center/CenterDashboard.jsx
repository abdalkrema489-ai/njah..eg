// src/components/center/CenterDashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/index';
import { useAuthStore } from '../../context/store';
import { Spinner } from '../shared/UI';
import { analyticsAPI } from '../../api/index';

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item:      { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } },
};

export default function CenterDashboard() {
  const { user } = useAuthStore();
  const { lang } = useTranslation();
  const isAr     = lang === 'ar';
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['center-analytics'],
    queryFn:  () => analyticsAPI.getSummary?.() || Promise.resolve({ data: {} }),
    staleTime: 5 * 60 * 1000,
  });
  const stats = data?.data || {};

  const statCards = [
    { icon: '👥', label: isAr ? 'إجمالي الطلاب'     : 'Total Students',    value: stats.totalStudents    || 0, color: '#6366F1', bg: 'rgba(99,102,241,0.1)'   },
    { icon: '👨‍🏫', label: isAr ? 'المدرسين النشطين'  : 'Active Teachers',   value: stats.activeTeachers   || 0, color: '#10B981', bg: 'rgba(16,185,129,0.1)'   },
    { icon: '📚', label: isAr ? 'الفصول النشطة'     : 'Active Classes',    value: stats.activeGroups     || 0, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'   },
    { icon: '💰', label: isAr ? 'إيرادات هذا الشهر' : 'Monthly Revenue',   value: `${stats.monthlyRevenue || 0} EGP`, color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
  ];

  const quickActions = [
    { icon: '👨‍🏫', label: isAr ? 'إدارة المدرسين' : 'Manage Teachers',  path: '/students', color: '#6366F1' },
    { icon: '📚', label: isAr ? 'إنشاء فصل'      : 'Create Class',     path: '/groups',   color: '#10B981' },
    { icon: '📊', label: isAr ? 'التقارير'        : 'Reports',          path: '/analytics',color: '#F59E0B' },
    { icon: '💳', label: isAr ? 'المدفوعات'       : 'Payments',         path: '/payment',  color: '#06B6D4' },
    { icon: '✉️', label: isAr ? 'الرسائل'         : 'Messages',         path: '/chat',     color: '#EC4899' },
    { icon: '⚙️', label: isAr ? 'الإعدادات'       : 'Settings',         path: '/settings', color: '#8B5CF6' },
  ];

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="visible" style={{ padding: '0 4px' }}>

      {/* Header */}
      <motion.div variants={stagger.item}
        style={{ padding: '28px 36px', borderRadius: 24, marginBottom: 28, background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <p style={{ fontSize: 12, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
          🏫 {isAr ? 'لوحة تحكم السنتر' : 'Center Dashboard'}
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>
          {isAr ? `مرحباً، ${user?.name?.split(' ')[0] || 'مدير'}` : `Welcome, ${user?.name?.split(' ')[0] || 'Manager'}`}
        </h1>
        <p style={{ fontSize: 14, opacity: 0.85 }}>
          {isAr ? 'إدارة السنتر التعليمي بكفاءة عالية.' : 'Manage your educational center efficiently.'}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={stagger.item}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 16, marginBottom: 28 }}>
        {isLoading ? (
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : statCards.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4, scale: 1.02 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'default' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: '-0.03em', fontFamily: 'var(--font-head)' }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={stagger.item}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 18, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em' }}>
          ⚡ {isAr ? 'إجراءات سريعة' : 'Quick Actions'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 12 }}>
          {quickActions.map((a, i) => (
            <motion.button key={a.path}
              onClick={() => navigate(a.path)}
              whileHover={{ y: -4, scale: 1.04 }} whileTap={{ scale: 0.96 }}
              style={{ padding: '18px 12px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: a.color, borderRadius: '16px 16px 0 0' }} />
              <span style={{ fontSize: 26 }}>{a.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{a.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
