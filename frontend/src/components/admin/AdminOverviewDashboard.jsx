// src/components/admin/AdminOverviewDashboard.jsx — Admin overview panel
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../context/store';
import { useTranslation } from '../../i18n/index';
import { Card, StatCard, Spinner } from '../shared/UI';

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item:      { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } },
};

export default function AdminOverviewDashboard() {
  const { user, token } = useAuthStore();
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/admin/stats', { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s]) => {
      setStats(s);
      setLoading(false);
    });
  }, [token]);

  const name = typeof user?.name === 'string' ? user.name.split(' ')[0] : (isAr ? 'مدير' : 'Admin');
  const hr = new Date().getHours();
  const greet = isAr
    ? (hr < 12 ? 'صباح الخير' : 'مساء الخير')
    : (hr < 12 ? 'Good Morning' : 'Good Evening');

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;
  }

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="visible" style={{ padding: 24 }}>

      {/* Welcome Banner */}
      <motion.div variants={stagger.item} style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,146,60,0.08))',
        borderRadius: 20, padding: '32px 36px', marginBottom: 28,
        border: '1px solid rgba(245,158,11,0.2)',
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
          🛡 {greet}, {name}!
        </h1>
        <p style={{ fontSize: 15, opacity: 0.7 }}>
          {isAr ? 'لوحة تحكم المدير — نظرة عامة على المنصة' : 'Admin Dashboard — Platform Overview'}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={stagger.item} style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        <StatCard icon="👥" label={isAr ? 'إجمالي المستخدمين' : 'Total Users'}       value={stats?.totalUsers ?? '—'} />
        <StatCard icon="👨‍🏫" label={isAr ? 'المعلمين' : 'Teachers'}                  value={stats?.totalTeachers ?? '—'} />
        <StatCard icon="📚" label={isAr ? 'المجموعات' : 'Groups'}                    value={stats?.totalGroups ?? '—'} />
        <StatCard icon="💰" label={isAr ? 'إجمالي الإيرادات' : 'Total Revenue'}       value={stats?.totalRevenue ? `${stats.totalRevenue} EGP` : '—'} />
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={stagger.item}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          {isAr ? '⚡ إجراءات سريعة' : '⚡ Quick Actions'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { icon: '👥', label: isAr ? 'إدارة المستخدمين' : 'Manage Users',    path: '/students' },
            { icon: '📊', label: isAr ? 'التحليلات' : 'Analytics',              path: '/analytics' },
            { icon: '💬', label: isAr ? 'الرسائل' : 'Messages',                 path: '/chat' },
            { icon: '⚙️', label: isAr ? 'الإعدادات' : 'Settings',              path: '/settings' },
          ].map((a, i) => (
            <motion.a
              key={i} href={a.path}
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 20px', borderRadius: 14,
                background: 'var(--surface)', border: '1px solid var(--border)',
                textDecoration: 'none', color: 'var(--text)',
                cursor: 'pointer', transition: 'box-shadow 0.2s',
              }}
            >
              <span style={{ fontSize: 24 }}>{a.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</span>
            </motion.a>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}
