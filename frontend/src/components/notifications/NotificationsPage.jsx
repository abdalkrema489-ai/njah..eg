// src/components/notifications/NotificationsPage.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../../api/index';
import { useNotifStore } from '../../context/store';
import { useTranslation } from '../../i18n/index';
import { Card, Btn, SectionHeader, EmptyState, Spinner } from '../shared/UI';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

const TYPE_ICONS = {
  reminder:       '⏰',
  deadline:       '📋',
  achievement:    '🏆',
  level_up:       '⬆️',
  chat:           '💬',
  board:          '📌',
  weekly_summary: '📊',
  default:        '🔔',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setAll } = useNotifStore();
  const { t } = useTranslation();

  const indicatorRef = usePullToRefresh(() => {
    qc.invalidateQueries(['notifications']);
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsAPI.list({ limit: 50 }),
    
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount   = data?.data?.unreadCount   || 0;

  // Sync to global store when data loads (TanStack Query v5 removed onSuccess from useQuery)
  useEffect(() => {
    if (data?.data) setAll(data.data.notifications || [], data.data.unreadCount || 0);
  }, [data]);

  const { mutate: markOne }  = useMutation({
    mutationFn: notificationsAPI.markRead,
    onSuccess:  () => qc.invalidateQueries(['notifications']),
  });
  const { mutate: markAll }  = useMutation({
    mutationFn: notificationsAPI.markAll,
    onSuccess:  () => { qc.invalidateQueries(['notifications']); toast.success(t('toast.allRead')); },
  });
  const { mutate: remove }   = useMutation({
    mutationFn: notificationsAPI.remove,
    onSuccess:  () => qc.invalidateQueries(['notifications']),
  });

  const grouped = notifications.reduce((acc, n) => {
    const dateKey = format(new Date(n.created_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(n);
    return acc;
  }, {});

  return (
    <div style={{ position: 'relative' }}>
      <div ref={indicatorRef} style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%) rotate(0deg)', fontSize: 24, opacity: 0, transition: 'opacity 0.2s', zIndex: 999, pointerEvents: 'none' }}>🔄</div>
      <SectionHeader
        icon="🔔"
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
        action={
          unreadCount > 0
            ? <Btn size="sm" onClick={() => markAll()}>✓ Mark all read</Btn>
            : null
        }
      />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="floating-panel">
          <EmptyState
            icon="🔔"
            title="Silence is Golden"
            subtitle="Your neural interface is clear. No active alerts or pending tasks detected."
          />
        </div>
      ) : (
        Object.entries(grouped).map(([dateKey, items]) => (
          <div key={dateKey}>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text4)',
              textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, paddingLeft: 4 }}>
              {format(new Date(dateKey), 'EEEE, MMMM d').toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence>
                {items.map((n, i) => (
                  <motion.div key={n.id} layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1,  x: 0     }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    onClick={() => {
                      if (!n.is_read) markOne(n.id);
                      const data = n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : {};
                      const link = data?.link || data?.groupId ? `/groups/${data.groupId}` : null;
                      const TYPE_LINKS = {
                        'grade':       `/groups/${data?.groupId || ''}`,
                        'broadcast':   `/groups/${data?.groupId || ''}`,
                        'earning':     '/payment',
                        'absence':     '/students',
                        'reminder':    '/planner',
                        'summary':     '/analytics',
                        'achievement': '/achievements',
                      };
                      const target = link || TYPE_LINKS[n.type];
                      if (target) navigate(target);
                    }}
                    className="floating-card"
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 16,
                      padding: '20px 24px',
                      borderRadius: 18,
                      background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(124,58,237,0.05)',
                      border: `1px solid ${n.is_read ? 'var(--border)' : 'rgba(124,58,237,0.2)'}`,
                      borderLeft: n.is_read ? '4px solid var(--border)' : '4px solid var(--primary)',
                      cursor: n.is_read ? 'default' : 'pointer',
                      opacity: n.is_read ? 0.7 : 1,
                      transition: 'all 0.25s var(--ease)',
                    }}
                  >
                    {/* Icon */}
                    <div style={{ 
                      fontSize: 26, flexShrink: 0, 
                      width: 48, height: 48, 
                      borderRadius: 14, 
                      background: n.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(124,58,237,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {TYPE_ICONS[n.type] || TYPE_ICONS.default}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{
                        fontWeight: 900,
                        fontSize: 15, marginBottom: 4, lineHeight: 1.4,
                        color: n.is_read ? 'var(--text2)' : 'var(--text)',
                        fontFamily: 'var(--font-head)',
                        letterSpacing: '-0.01em'
                      }}>{n.title}</div>
                      {n.body && (
                        <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.6, marginBottom: 6, fontWeight: 500 }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {format(new Date(n.created_at), 'HH:mm')} PROTOCOL · {n.type.toUpperCase()}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <div style={{ width: 10, height: 10, borderRadius: '50%',
                        background: 'var(--primary)', flexShrink: 0, marginTop: 4,
                        boxShadow: '0 0 10px var(--primary)' }} />
                    )}

                    {/* Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); remove(n.id); }}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text4)',
                        width: 32, height: 32, borderRadius: 10,
                        cursor: 'pointer', fontSize: 12, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', padding: 0 }}
                      onMouseEnter={e => { e.target.style.background = 'var(--danger)'; e.target.style.color = '#fff'; }}
                      onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'var(--text4)'; }}
                    >✕</button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
