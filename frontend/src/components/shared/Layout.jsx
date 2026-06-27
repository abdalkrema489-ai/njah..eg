// src/components/shared/Layout.jsx — Najah v6 — i18n + Mobile nav + Notif drawer
// ✅ Full mobile/desktop responsiveness — June 2026
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore, useNotifStore } from '../../context/store';
import MobileBottomNav from '../pwa/MobileBottomNav';
import { useSocket } from '../../hooks/index';
import { useTranslation } from '../../i18n/index';
import { authAPI, notificationsAPI } from '../../api/index';
import { Avatar } from './UI';
// InstitutionSwitcher removed — institution mode is now locked at registration
import toast from 'react-hot-toast';
import CreateGroupWizard from '../groups/CreateGroupWizard';
import GlobalSearch from './GlobalSearch';

/* ── SVG Icon set ──────────────────────────────────────────── */
const Icons = {
  dashboard:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  ai:           () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/></svg>,
  analytics:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  planner:      () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
  notes:        () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  files:        () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  focus:        () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  exam:         () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  quizHistory:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  chat:         () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  messages:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  board:        () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  achievements: ()=> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  notifications:()=> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  profile:      () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  groups:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  tools:        () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  logout:       () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  sun:          () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:         () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  search:       () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  chevron:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  menu:         () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close:        () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  payment:      () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  help:         () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// Nav sections use translation keys — labels resolved at render time
const NAV_SECTIONS_DEF = [
  {
    labelKey: 'Overview',
    items: [
      { key:'dashboard',    path:'/',             Icon: Icons.dashboard,     tKey:'nav.dashboard' },
      { key:'ai',           path:'/ai',           Icon: Icons.ai,            tKey:'nav.ai' },
      { key:'analytics',    path:'/analytics',    Icon: Icons.analytics,     tKey:'nav.analytics' },
    ],
  },
  {
    labelKey: 'Study',
    items: [
      { key:'planner',      path:'/planner',      Icon: Icons.planner,       tKey:'nav.planner' },
      { key:'notes',        path:'/notes',        Icon: Icons.notes,         tKey:'nav.notes' },
      { key:'files',        path:'/files',        Icon: Icons.files,         tKey:'nav.files' },
      { key:'focus',        path:'/focus',        Icon: Icons.focus,         tKey:'nav.focus' },
      { key:'quiz-history', path:'/quiz-history', Icon: Icons.quizHistory,   tKey:'nav.quizHistory' },
      { key:'tools',        path:'/tools',        Icon: Icons.tools,         tKey:'nav.tools' },
    ],
  },
  {
    labelKey: 'Community',
    items: [
      { key:'groups',       path:'/groups',       Icon: Icons.groups,        tKey:'nav.groups' },
      { key:'messages',     path:'/chat',         Icon: Icons.messages,      tKey:'nav.messages', badge: true },
      { key:'board',        path:'/board',        Icon: Icons.board,         tKey:'nav.board' },
      { key:'achievements', path:'/achievements', Icon: Icons.achievements,  tKey:'nav.achievements' },
      { key:'notifications',path:'/notifications',Icon: Icons.notifications, tKey:'nav.notifications', badge: true },
      { key:'wallet',       path:'/wallet',        Icon: Icons.payment,       tKey:'nav.wallet' },
      { key:'payment',      path:'/payment',      Icon: Icons.payment,       tKey:'nav.payment' },
      { key:'support',      path:'/support',      Icon: Icons.help,          tKey:'nav.support' },
      { key:'help',         path:'/help',         Icon: Icons.help,          tKey:'nav.help' },
    ],
  },
];

const TEACHER_SECTIONS_DEF = [
  {
    labelKey: 'Overview',
    items: [
      { key:'dashboard',    path:'/',             Icon: Icons.dashboard,    tKey:'nav.dashboard' },
      { key:'students',     path:'/students',     Icon: Icons.profile,      tKey:'nav.allStudents' },
      { key:'analytics',    path:'/analytics',    Icon: Icons.analytics,    tKey:'nav.analytics' },
    ],
  },
  {
    labelKey: 'Class Tools',
    items: [
      { key:'groups',         path:'/groups',        Icon: Icons.groups,       tKey:'nav.myClasses' },
      { key:'calendar',       path:'/calendar',      Icon: Icons.planner,      tKey:'nav.calendar' },
      { key:'curriculum',     path:'/curriculum',    Icon: Icons.notes,        tKey:'nav.curriculum' },
      { key:'files',          path:'/files',         Icon: Icons.files,        tKey:'nav.resources' },
      { key:'lesson-planner', path:'/lesson-planner',Icon: Icons.notes,        tKey:'nav.lessonPlanner' },
      { key:'exam-builder',   path:'/exam-builder',  Icon: Icons.exam,         tKey:'nav.examBuilder' },
      { key:'essay-grader',   path:'/essay-grader',  Icon: Icons.analytics,    tKey:'nav.essayGrader' },
      { key:'tools',          path:'/tools',         Icon: Icons.tools,        tKey:'nav.tools' },
    ],
  },
  {
    labelKey: 'Communication',
    items: [
      { key:'messages',     path:'/chat',            Icon: Icons.messages,     tKey:'nav.messages', badge: true },
      { key:'notifications',path:'/notifications',   Icon: Icons.notifications,tKey:'nav.notifications', badge: true },
      { key:'wallet',       path:'/teacher/wallet',   Icon: Icons.payment,      tKey:'nav.wallet' },
      { key:'payment',      path:'/payment',          Icon: Icons.payment,      tKey:'nav.payment' },
      { key:'support',      path:'/support',          Icon: Icons.help,         tKey:'nav.support' },
      { key:'help',         path:'/help',             Icon: Icons.help,         tKey:'nav.help' },
    ],
  },
];

const UNIVERSITY_SECTIONS_DEF = [
  {
    labelKey: 'Overview',
    items: [
      { key:'dashboard',    path:'/',             Icon: Icons.dashboard,    tKey:'nav.dashboard' },
      { key:'ai',           path:'/ai',           Icon: Icons.ai,           tKey:'nav.ai' },
      { key:'analytics',    path:'/analytics',    Icon: Icons.analytics,    tKey:'nav.analytics' },
    ],
  },
  {
    labelKey: 'Academic',
    items: [
      { key:'planner',      path:'/planner',      Icon: Icons.planner,      tKey:'nav.planner' },
      { key:'files',        path:'/files',        Icon: Icons.files,        tKey:'nav.files' },
      { key:'groups',       path:'/groups',       Icon: Icons.groups,       tKey:'nav.groups' },
      { key:'notes',        path:'/notes',        Icon: Icons.notes,        tKey:'nav.notes' },
      { key:'tools',        path:'/tools',        Icon: Icons.tools,        tKey:'nav.tools' },
    ],
  },
  {
    labelKey: 'Campus',
    items: [
      { key:'messages',     path:'/chat',         Icon: Icons.messages,     tKey:'nav.messages', badge: true },
      { key:'achievements', path:'/achievements', Icon: Icons.achievements, tKey:'nav.achievements' },
      { key:'notifications',path:'/notifications',Icon: Icons.notifications,tKey:'nav.notifications', badge: true },
      { key:'payment',      path:'/payment',      Icon: Icons.payment,      tKey:'nav.payment' },
      { key:'support',      path:'/support',      Icon: Icons.help,         tKey:'nav.support' },
      { key:'help',         path:'/help',         Icon: Icons.help,         tKey:'nav.help' },
    ],
  },
];

const ADMIN_SECTIONS_DEF = [
  {
    labelKey: 'Overview',
    items: [
      { key:'dashboard',    path:'/',            Icon: Icons.dashboard,  tKey:'nav.dashboard' },
      { key:'analytics',    path:'/analytics',   Icon: Icons.analytics,  tKey:'nav.analytics' },
      { key:'students',     path:'/students',    Icon: Icons.profile,    tKey:'nav.allStudents' },
    ],
  },
  {
    labelKey: 'Management',
    items: [
      { key:'groups',       path:'/groups',      Icon: Icons.groups,    tKey:'nav.myClasses' },
      { key:'files',        path:'/files',       Icon: Icons.files,     tKey:'nav.files' },
      { key:'messages',     path:'/chat',        Icon: Icons.messages,  tKey:'nav.messages', badge: true },
      { key:'notifications',path:'/notifications',Icon: Icons.notifications, tKey:'nav.notifications', badge: true },
      { key:'payment',      path:'/payment',     Icon: Icons.payment,   tKey:'nav.payment' },
      { key:'settings',     path:'/settings',    Icon: Icons.settings,  tKey:'nav.settings' },
    ],
  },
];

const CENTER_SECTIONS_DEF = [
  {
    labelKey: 'center.management',
    items: [
      { key:'dashboard',     path:'/',             Icon: Icons.dashboard,      tKey:'nav.dashboard' },
      { key:'groups',        path:'/groups',        Icon: Icons.groups,         tKey:'nav.classes' },
      { key:'analytics',     path:'/analytics',    Icon: Icons.analytics,      tKey:'nav.analytics' },
      { key:'payment',       path:'/payment',      Icon: Icons.payment,        tKey:'nav.revenue' },
      { key:'messages',      path:'/chat',         Icon: Icons.messages,       tKey:'nav.messages', badge: true },
      { key:'notifications', path:'/notifications',Icon: Icons.notifications,  tKey:'nav.notifications', badge: true },
      { key:'settings',      path:'/settings',     Icon: Icons.tools,          tKey:'nav.settings' },
    ],
  },
];

const ALL_NAV_KEYS = [
  ...NAV_SECTIONS_DEF.flatMap(s => s.items),
  ...TEACHER_SECTIONS_DEF.flatMap(s => s.items),
  ...UNIVERSITY_SECTIONS_DEF.flatMap(s => s.items),
  ...ADMIN_SECTIONS_DEF.flatMap(s => s.items),
  ...CENTER_SECTIONS_DEF.flatMap(s => s.items),
];

/* ── Logo Mark ──────────────────────────────────────────────── */
function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#0284c7"/>
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill="url(#logo-g)"/>
      <path d="M10 26 L18 10 L26 26" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 21 L23 21" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="18" cy="10" r="2" fill="#fff"/>
    </svg>
  );
}

/* ── Reading Progress Bar ────────────────────────────────────── */
function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="reading-progress" style={{ width: `${pct}%` }} />
  );
}

function NotifDrawer({ open, onClose }) {
  const { notifications, markOne } = useNotifStore();
  const isRtl = useUIStore(s => s.language) === 'ar';
  const slideX = isRtl ? '-100%' : '100%';
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 399, background: 'rgba(0,0,0,0.3)' }}
          />
          <motion.div
            className="notif-drawer"
            initial={{ x: slideX, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideX, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-head)' }}>{t('nav.notifications')}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {notifications.filter(n => !n.is_read).length} {t('common.unread')}
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text3)',
              }}>
                <Icons.close />
              </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
                  <p style={{ color: 'var(--text3)', fontSize: 14 }}>{t('common.noNotifications')}</p>
                </div>
              ) : (
                notifications.map(n => (
                  <motion.div key={n.id || n._id}
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                      markOne(n.id || n._id);
                      if (n.type === 'private_message' || n.action_url?.includes('/chat')) {
                       onClose();
                       navigate('/chat');
                      }
                    }}
                    style={{
                      padding: '14px 20px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'background 0.15s',
                      background: n.is_read ? 'transparent' : 'rgba(14, 165, 233, 0.06)',
                      borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--primary-500)',
                    }}
                    whileHover={{ background: 'var(--surface2)' }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0, fontSize: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--surface3)',
                      }}>
                        {n.type === 'achievement' ? '🏆' : n.type === 'message' ? '💬' : n.type === 'assignment' ? '📋' : '🔔'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: 'var(--text)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.title || n.message}
                        </div>
                        {n.message && n.title && (
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, lineHeight: 1.4 }}>
                            {n.message.slice(0, 80)}{n.message.length > 80 ? '…' : ''}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                        </div>
                      </div>
                      {!n.is_read && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-500)', flexShrink: 0, marginTop: 4 }} />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StaticAppBackground() {
  const { institutionMode } = useUIStore();
  // Use user's own najah-bg images (copied from /images folder)
  const bgImage = institutionMode === 'university'
    ? '/images/najah-bg-5.jpeg'   // university campus feel
    : '/images/najah-bg-1.jpeg';  // school setting
  
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Single static background image — no animations */}
      <img 
        src={bgImage}
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100vw', height: '100vh',
          objectFit: 'cover',
          filter: 'blur(25px) brightness(0.45) saturate(1.2)',
          opacity: 0.18,
        }}
      />
      {/* Gradient overlay for readability */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at 30% 20%, transparent 20%, var(--page-bg) 80%)',
      }} />
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────── */
export function Sidebar({ open, onToggle }) {
  const location        = useLocation();
  const navigate        = useNavigate();
  const { unreadCount } = useNotifStore();
  const { user }        = useAuthStore();
  const { lang, toggleLang, t } = useTranslation();
  const { institutionMode, toggleDark, darkMode, language, setLanguage } = useUIStore();
  const isAr = language === 'ar';
  const closeX = isAr ? '100%' : '-100%';

  const isTeacher    = user?.role === 'teacher';
  const isAdmin      = ['school_admin', 'university_admin', 'admin', 'platform_owner'].includes(user?.role) || !!user?.admin_level;
  const isCenterOwner = user?.role === 'center_owner';
  const isUniversity = !isTeacher && !isAdmin && !isCenterOwner && (
    user?.institution_type === 'university' || user?.institutionType === 'university' ||
    ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Postgrad'].includes(user?.grade)
  );
  const sections = isTeacher      ? TEACHER_SECTIONS_DEF
    : isAdmin        ? ADMIN_SECTIONS_DEF
    : isCenterOwner  ? CENTER_SECTIONS_DEF
    : isUniversity   ? UNIVERSITY_SECTIONS_DEF
    : NAV_SECTIONS_DEF;

  const isMobile = useIsMobile();

  return (
    <>
      <StaticAppBackground />
      {/* Mobile overlay — only rendered when sidebar is open on mobile */}
      <AnimatePresence>
        {open && isMobile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onToggle}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(3,3,8,0.78)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 999, // raised to stay below sidebar (1000) but above content
            }}
          />
        )}
      </AnimatePresence>

      <motion.nav
        animate={isMobile
          ? { x: open ? 0 : closeX, width: 272 }
          : { width: open ? 272 : 72, x: 0 }
        }
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        className={`main-sidebar floating-panel${open ? ' open' : ''}`}
        style={{
          height: isMobile ? '100dvh' : 'calc(100vh - 24px)',
          margin: isMobile ? '0' : '12px',
          borderRadius: isMobile ? '0 0 0 0' : undefined,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 0 : undefined,
          insetInlineStart: isMobile ? 0 : undefined,
          zIndex: isMobile ? 1000 : 150,
        }}
      >
        {/* ── Logo / Toggle ───────────────────────────── */}
        <div style={{
          height: 68,
          display: 'flex',
          alignItems: 'center',
          padding: open ? '0 16px' : '0',
          justifyContent: open ? 'space-between' : 'center',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <motion.div
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={onToggle}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <LogoMark size={36} />
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
                >
                  <span style={{
                    fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 19,
                    letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1,
                  }}>Najah</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {t('common.smartLearning')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {open && (
            <button
              onClick={onToggle}
              style={{
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: 'var(--text3)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text3)'; }}
            >
              <Icons.close />
            </button>
          )}
        </div>

        {/* ── Navigation ──────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px 8px' }}>
          {sections.map((section, sIdx) => (
            <div key={section.labelKey || sIdx} style={{ marginBottom: 8 }}>
              <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: sIdx * 0.04 } }} exit={{ opacity: 0 }}
                        style={{
                          fontSize: 10, fontWeight: 900, color: 'var(--text4)',
                          textTransform: 'uppercase', letterSpacing: '0.15em',
                          marginBottom: 12, padding: open ? '0 14px' : '0',
                          textAlign: open ? 'left' : 'center',
                          opacity: 0.7
                        }}
                      >
                        {section.labelKey === 'Study' && institutionMode === 'university' ? 'Academic' : 
                         section.labelKey === 'Community' && institutionMode === 'university' ? 'Campus' :
                         t(section.labelKey) || section.labelKey}
                      </motion.div>
                    )}
              </AnimatePresence>

              {section.items.map(item => {
                const active   = location.pathname === item.path ||
                                 (item.path !== '/' && location.pathname.startsWith(item.path));
                const hasBadge = item.badge && unreadCount > 0;

                return (
                  <motion.div
                    key={item.key}
                    onClick={() => { navigate(item.path); if (open && isMobile) onToggle(); }}
                    whileHover={{ x: active ? 0 : 4, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    data-tip={!open ? item.label : undefined}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: open ? '0 14px' : '0',
                      justifyContent: open ? 'flex-start' : 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      background: active
                        ? 'rgba(14, 165, 233, 0.12)'
                        : 'transparent',
                      color: active ? 'var(--primary-600)' : 'var(--text3)',
                      boxShadow: active ? '0 4px 12px rgba(14, 165, 233, 0.1)' : 'none',
                      transition: 'color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--surface)';
                        e.currentTarget.style.color = 'var(--text2)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text3)';
                      }
                    }}
                  >
                    {/* Active glow indicator */}
                    {active && (
                      <motion.div
                        layoutId="nav-active-dot"
                        style={{
                          position: 'absolute',
                          insetInlineStart: -1,
                          width: 3,
                          height: 22,
                          borderRadius: 4,
                          background: 'linear-gradient(180deg, var(--primary-light), var(--accent-cyan))',
                          boxShadow: '0 0 12px rgba(124,58,237,0.7)',
                        }}
                      />
                    )}

                    <span style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      width: 22, color: 'inherit',
                    }}>
                      <item.Icon />
                    </span>

                    <AnimatePresence>
                      {open && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0, transition: { delay: 0.04 } }}
                          exit={{ opacity: 0, x: -6, transition: { duration: 0.1 } }}
                          style={{
                            fontSize: 13.5, fontWeight: active ? 700 : 500,
                            whiteSpace: 'nowrap', flex: 1, color: 'inherit',
                          }}
                        >
                          {t(item.tKey)}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {hasBadge && (
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        style={{
                          position: open ? 'static' : 'absolute',
                          top: open ? 'auto' : 7, right: open ? 'auto' : 7,
                          minWidth: 17, height: 17, borderRadius: 99,
                          padding: '0 4px',
                          background: 'linear-gradient(135deg, #EF4444, #F43F5E)',
                          color: '#fff', fontSize: 9, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
                        }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Theme/Language toggles ───────────────────── */}
        {open && (
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            {/* Theme Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleDark(); }}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 10,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              <span>{darkMode ? '☀️' : '🌙'}</span>
              <span>{darkMode ? t('settings.light') : t('settings.dark')}</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleLang(); setLanguage(lang === 'ar' ? 'en' : 'ar'); }}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 10,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              <span>🌐</span>
              <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
            </button>
          </div>
        )}

        {/* ── Bottom user strip ────────────────────────── */}
        <SidebarUserStrip open={open} />
      </motion.nav>
    </>
  );
}

function SidebarUserStrip({ open }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { institutionMode } = useUIStore();
  const { t } = useTranslation();
  const isAr = useUIStore(s => s.language) === 'ar';

  const userRole = user?.role || 'student';
  const isTeacher = userRole === 'teacher';
  const isAdmin   = ['school_admin', 'university_admin', 'admin'].includes(userRole) || !!user?.admin_level;

  const roleBadge = isTeacher    ? { label: isAr ? '👨‍🏫 معلم'      : '👨‍🏫 Teacher',    color: '#0EA5E9' }
    : isAdmin      ? { label: isAr ? '🛡 مدير'       : '🛡 Admin',      color: '#F59E0B' }
    : institutionMode === 'university' ? { label: isAr ? '🎓 جامعي'  : '🎓 University', color: '#3B82F6' }
    :                { label: isAr ? '🏫 طالب'       : '🏫 Student',   color: '#6366F1' };
  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: open ? '14px 12px' : '14px 8px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      transition: 'background 0.18s',
    }}
    onClick={() => navigate('/profile')}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar src={user?.avatar_url} name={user?.name} size={34} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            style={{ flex: 1, minWidth: 0 }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.name || 'User'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, flexWrap:'wrap' }}>
              <span style={{
                fontSize: 9.5, fontWeight: 800, padding:'1px 7px', borderRadius:6,
                background: isTeacher ? 'rgba(14,165,233,0.14)' : 'rgba(124,58,237,0.12)',
                color: isTeacher ? '#38BDF8' : 'var(--primary-light)',
                border: `1px solid ${isTeacher ? 'rgba(14,165,233,0.28)' : 'rgba(124,58,237,0.22)'}`,
                textTransform:'uppercase', letterSpacing:'0.08em',
              }}>
                {isTeacher ? '👨‍🏫 ' + t('common.teacher') : '🎓 ' + t('common.student')}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding:'1px 6px', borderRadius:5,
                background: institutionMode === 'university' ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.1)',
                color: institutionMode === 'university' ? '#38BDF8' : '#10b981',
                border: `1px solid ${institutionMode === 'university' ? 'rgba(14,165,233,0.2)' : 'rgba(16,185,129,0.2)'}`,
                textTransform:'uppercase', letterSpacing:'0.06em',
              }}>
                {institutionMode === 'university' ? '🎓 ' + t('common.university') : '🏫 ' + t('common.school')}
              </span>
              {!isTeacher && (
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{t('common.lvl')} {user?.level || 1}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Header ───────────────────────────────────────────────── */
export function Header({ sidebarOpen, onToggle, onOpenNotifs, onOpenWizard }) {
  const { user, logout }                            = useAuthStore();
  const userName                                    = user?.name || 'Explorer';
  const userEmail                                   = user?.email || 'Najah User';
  const { language, setLanguage, toggleDark, darkMode } = useUIStore();
  const { unreadCount }                             = useNotifStore();
  const { lang, toggleLang, t }                     = useTranslation();
  const navigate                                    = useNavigate();
  const location                                    = useLocation();
  const [profileOpen, setProfileOpen]               = useState(false);
  const profileRef                                  = useRef(null);

  const currentNav = ALL_NAV_KEYS.find(n =>
    n.path !== '/' ? location.pathname.startsWith(n.path) : location.pathname === n.path
  );
  const pageLabel = currentNav ? t(currentNav.tKey) : t('nav.dashboard');

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    logout(); navigate('/login');
    toast.success('Signed out. See you soon! 👋');
  };

  useEffect(() => {
    const close = e => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [profileOpen]);

  return (
    <>

      {user && user.email_verified === false && (
        <div style={{
          background: 'linear-gradient(90deg, #f59e0b, #d97706)',
          color: '#fff', padding: '8px 16px', textAlign: 'center',
          fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <span>⚠️ Your email is not verified. Please check your inbox or spam folder.</span>
          <button
            onClick={() => {
               toast.promise(authAPI.forgotPassword(user.email), {
                 loading: 'Sending...',
                 success: 'Verification email sent!',
                 error: 'Failed to send'
               });
            }}
            style={{
              padding: '4px 10px', background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer',
              fontWeight: 800, fontSize: 12,
            }}
          >Resend</button>
        </div>
      )}

      <header 
        className="floating-panel sc-glass"
        style={{
          height: 68,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px 0 16px',
          gap: 12,
          position: 'sticky',
          top: 12,
          zIndex: 500, 
          flexShrink: 0,
          margin: '12px 12px 0 0',
          overflow: 'visible'
        }}
      >
        {/* Menu toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className="header-btn"
        >
          <Icons.menu />
        </motion.button>

        {/* Page label */}
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 16.5, fontWeight: 700,
            fontFamily: 'var(--font-head)',
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            {pageLabel}
          </h1>
          <p className="header-date-text" style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* System Status Indicators (Subtle touches of Green, Red, Yellow) */}
          <div className="hide-mobile" style={{ display: 'flex', gap: 10, marginInlineEnd: 15, padding: '0 5px' }}>
            <div title={t('common.networkStable')} style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
            <div title={t('common.aiReady')} style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
            <div title={t('common.systemActive')} style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }} />
          </div>

          {/* New Group Quick Action */}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onOpenWizard}
            className="new-group-btn hide-mobile"
            style={{
              height: 38, padding: '0 14px', borderRadius: 10,
              background: 'linear-gradient(135deg, var(--primary), var(--blue-600))',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
              marginInlineEnd: 4, flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16 }}>✨</span>
            <span className="hide-mobile">{lang === 'ar' ? 'مجموعة جديدة' : 'New Group'}</span>
          </motion.button>

          {/* Global Search */}
          <div className="hide-mobile">
            <GlobalSearch isAr={lang === 'ar'} />
          </div>

          {/* Search icon (mobile fallback) */}
          <HeaderBtn title={t('common.search') + ' (⌘K)'} onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))} className="show-mobile">
            <Icons.search />
          </HeaderBtn>

          {/* Institution mode is now locked at registration — no runtime switcher */}

          {/* Theme Toggle */}
          <HeaderBtn onClick={toggleDark} title={darkMode ? t('settings.light') : t('settings.dark')} className="hide-mobile">
            {darkMode ? '☀️' : '🌙'}
          </HeaderBtn>

          {/* Language */}
          <HeaderBtn onClick={() => { toggleLang(); setLanguage(lang === 'ar' ? 'en' : 'ar'); }} title={t('settings.language')} className="hide-mobile">
            {lang === 'ar' ? '🇬🇧 EN' : '🇪🇬 AR'}
          </HeaderBtn>

          {/* Notifications — opens drawer */}
          <div style={{ position: 'relative' }}>
            <HeaderBtn onClick={onOpenNotifs} title={t('nav.notifications')}>
              <Icons.notifications />
            </HeaderBtn>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{
                  position: 'absolute', top: 5, right: 5,
                  width: 15, height: 15, borderRadius: 99,
                  background: 'linear-gradient(135deg, #EF4444, #F43F5E)',
                  color: '#fff', fontSize: 8, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(239,68,68,0.6)',
                  border: '1.5px solid var(--ink)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </div>

          {/* Profile dropdown */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <motion.div
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setProfileOpen(v => !v)}
              style={{
                cursor: 'pointer', borderRadius: '50%', padding: 2,
                border: `2px solid ${profileOpen ? 'var(--primary)' : 'transparent'}`,
                background: profileOpen ? 'rgba(124,58,237,0.15)' : 'transparent',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <Avatar src={user?.avatar_url} name={user?.name} size={36} />
            </motion.div>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 8 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    position: 'absolute', top: 50, ...(lang === 'ar' ? { left: 0 } : { right: 0 }), width: 280,
                    background: 'var(--surface3)',
                    border: '1px solid var(--border2)',
                    backdropFilter: 'var(--glass-blur)',
                    WebkitBackdropFilter: 'var(--glass-blur)',
                    borderRadius: 20, padding: 8,
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-2xl), var(--glow)',
                  }}
                  className="profile-dropdown"
                >
                  {/* User header */}
                  <div style={{
                    padding: '12px 14px 14px',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Avatar src={user?.avatar_url} name={user?.name} size={44} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{user?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{user?.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge badge-primary">Lv {user?.level || 1}</span>
                      <span className="badge badge-warning">★ {(user?.xp_points || 0).toLocaleString()} XP</span>
                      {user?.streak_days > 0 && (
                        <span className="badge badge-danger">🔥 {user?.streak_days}d</span>
                      )}
                    </div>
                  </div>

                  {/* Menu items */}
                  {[
                    { Icon: Icons.profile,   label: 'Profile',   path: '/profile' },
                    { Icon: Icons.settings,  label: 'Settings',  path: '/settings' },
                    { Icon: Icons.analytics, label: 'Analytics', path: '/analytics' },
                  ].map(item => (
                    <ProfileMenuItem key={item.path} Icon={item.Icon} label={item.label}
                      onClick={() => { navigate(item.path); setProfileOpen(false); }} />
                  ))}

                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex', width: '100%', padding: '9px 12px',
                        borderRadius: 10, gap: 10, alignItems: 'center',
                        background: 'none', border: 'none',
                        color: 'var(--danger)', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Icons.logout /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
}

/* ── Micro components ─────────────────────────────────────── */
function HeaderBtn({ children, onClick, active, title, className = '' }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
      onClick={onClick}
      title={title}
      className={`header-btn ${active ? 'active' : ''} ${className}`}
    >
      {children}
    </motion.button>
  );
}

function ProfileMenuItem({ Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', width: '100%', padding: '9px 12px',
        textAlign: 'left', background: 'none', border: 'none',
        color: 'var(--text2)', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', borderRadius: 10, gap: 10, alignItems: 'center',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)'; }}
    >
      <Icon /> {label}
    </button>
  );
}



/* ── useIsMobile hook ─────────────────────────────────────── */
function useIsMobile(breakpoint = 1100) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

/* ── AppShell ─────────────────────────────────────────────── */
export function AppShell({ children }) {
  const isMobile                      = useIsMobile();
  const [open, setOpen]               = useState(false); // always start closed; effect sets properly
  const [notifOpen, setNotifOpen]     = useState(false);
  const [showWizard, setShowWizard]   = useState(false);
  const { institutionMode }           = useUIStore();

  useSocket();

  // Keep sidebar open on desktop, closed on mobile
  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  // Touch swipe handlers for RTL sidebar
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    // RTL: swipe right (positive dx) closes, swipe left (negative dx) opens
    if (dx > 60 && open) setOpen(false);
    if (dx < -60 && !open && isMobile) setOpen(true);
  };

  return (
    <div className="app-shell" data-institution={institutionMode}>
      <ReadingProgress />
      
      <NotifDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      
      <AnimatePresence>
        {showWizard && (
          <CreateGroupWizard 
            onClose={() => setShowWizard(false)} 
            onCreated={() => { setShowWizard(false); }} 
          />
        )}
      </AnimatePresence>

      <Sidebar open={open} onToggle={() => setOpen(v => !v)} />
      
      <div
        className="main-content"
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        <Header 
          sidebarOpen={open} 
          onToggle={() => setOpen(v => !v)} 
          onOpenNotifs={() => setNotifOpen(v => !v)}
          onOpenWizard={() => setShowWizard(true)}
        />
        <div className="page-container">{children}</div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
