// src/components/dashboard/Dashboard.jsx — Professional v4 (role-aware)
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../../context/store';
import { getUserRole } from '../../context/store';
import { plannerAPI, usersAPI, groupsAPI, toolsAPI } from '../../api/index';
import { Card, StatCard, ProgressBar, Button, Spinner, EmptyState } from '../shared/UI';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { useTranslation } from '../../i18n/index';
import StreakHeatmap from '../shared/StreakHeatmap';
import { WeatherWidget, WordOfDayWidget } from '../shared/PublicAPIWidgets';

const TeacherDashboard      = lazy(() => import('../teacher/TeacherDashboard'));
const SchoolStudentDashboard= lazy(() => import('./SchoolStudentDashboard'));
const UniversityDashboard   = lazy(() => import('./UniversityStudentDashboard'));
const AdminOverviewDashboard= lazy(() => import('../admin/AdminOverviewDashboard'));
const CenterDashboard       = lazy(() => import('../center/CenterDashboard'));


/* ── Data mappings ─────────────────────────────────────── */
const SUBJ_COLOR = {
  mathematics:'#7C3AED', science:'#10B981', arabic:'#F59E0B',
  english:'#3B82F6', social_studies:'#F43F5E', biology:'#06B6D4',
  physics:'#8B5CF6', chemistry:'#EC4899',
};
const SUBJ_ICON  = {
  mathematics:'📐', science:'🔬', arabic:'📚', english:'🌐',
  social_studies:'🌍', biology:'🧬', physics:'⚡', chemistry:'⚗️',
};

const QUICK_ACTIONS = [
  { icon:'🤖', label:'AI Tutor',     sub:'Ask anything',    path:'/ai',           grad:'linear-gradient(135deg,#7C3AED,#5B21B6)' },
  { icon:'📅', label:'Planner',      sub:'Schedule study',  path:'/planner',      grad:'linear-gradient(135deg,#3B82F6,#1D4ED8)' },
  { icon:'✉️', label:'Messages',     sub:'Chat with peers', path:'/chat/private', grad:'linear-gradient(135deg,#10B981,#059669)' },
  { icon:'📁', label:'Files',        sub:'Study materials',  path:'/files',        grad:'linear-gradient(135deg,#F59E0B,#D97706)' },
  { icon:'⏱',  label:'Focus',        sub:'Pomodoro timer',  path:'/focus',        grad:'linear-gradient(135deg,#EF4444,#DC2626)' },
  { icon:'🛠️', label:'Study Tools',  sub:'Dict · Wiki · Quiz', path:'/tools',     grad:'linear-gradient(135deg,#EC4899,#BE185D)' },
];

/* ── Daily Quote Widget (live from Quotable API) ────────────────
   Falls back gracefully if the API is unavailable.
   ================================================================ */
function DailyQuoteWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['daily-quote'],
    queryFn:  () => toolsAPI.quote(),
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    retry: 1,
  });
  const { isSpeaking, isPaused, isSupported, toggle } = useTextToSpeech();
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const q = data?.data;

  return (
    <div style={{ padding:'28px 36px', borderRadius:20, background:'linear-gradient(135deg,#7C3AED 0%,#5B21B6 50%,#1e1b4b 100%)', color:'#fff', position:'relative', overflow:'hidden', boxShadow:'0 8px 36px rgba(124,58,237,0.35)', display:'flex', flexDirection:'column', justifyContent:'space-between', gap:16 }}>
      <div style={{ position:'absolute', right:-20, top:-20, fontSize:120, opacity:0.06, transform:'rotate(-10deg)', userSelect:'none', lineHeight:1 }}>"</div>
      <div style={{ position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <p style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.15em', opacity:0.7 }}>{isAr ? 'إلهام اليوم' : 'Daily Inspiration'}</p>
          {isSupported && q && (
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => toggle(`${q.quote} — ${q.author}`, 'en')}
              style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}
              title="Read aloud"
            >{isSpeaking && !isPaused ? '⏸' : '🔊'}</motion.button>
          )}
        </div>
        {isLoading ? (
          <div style={{ height:60, display:'flex', alignItems:'center' }}><div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.8s linear infinite' }}/></div>
        ) : (
          <>
            <p style={{ fontSize:16, fontWeight:600, lineHeight:1.65, maxWidth:560, fontStyle:'italic' }}>&#x201C;{q?.quote}&#x201D;</p>
            <p style={{ fontSize:12, fontWeight:700, opacity:0.7, marginTop:8 }}>— {q?.author}</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Stagger animation ─────────────────────────────────── */
const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } },
  item:      { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16,1,0.3,1] } } },
};

/* ════════════════════════════════════════════════════════
   WelcomeBanner
   ════════════════════════════════════════════════════════ */
function WelcomeBanner({ user }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const hr      = new Date().getHours();
  
  let greet = '';
  if (isAr) {
    greet = hr < 5 ? 'طابت ليلتك' : hr < 12 ? 'صباح الخير' : hr < 17 ? 'مساء الخير' : 'مساء الخير';
  } else {
    greet = hr < 5 ? 'Good Night' : hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
  }
  
  const emoji   = hr < 5 ? '🌙' : hr < 12 ? '🌅' : hr < 17 ? '☀️' : '🌆';
  const nextLvl = (Number(user?.level) || 1) * 500;
  const curXp   = Number(user?.xp_points) || 0;
  const pct     = Math.min(100, Math.round((curXp / nextLvl) * 100));
  const name    = typeof user?.name === 'string' ? user.name.split(' ')[0] : (isAr ? 'طالب' : 'Student');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="floating-panel animate-breathe"
      style={{
        marginBottom: 28, borderRadius: 28,
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(99,102,241,0.04) 100%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-premium)'
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute', right: -60, top: -60,
        width: 320, height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', left: '40%', bottom: -40,
        width: 200, height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      <div style={{ padding: '32px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          {/* Left — greeting */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
              {emoji} {greet}
            </p>
            <h2 style={{
              fontSize: 36, fontWeight: 800,
              fontFamily: 'var(--font-head)',
              letterSpacing: '-0.04em',
              marginBottom: 10,
              background: 'linear-gradient(135deg, #fff 40%, var(--primary-light) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {name}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 22, maxWidth: 500, lineHeight: 1.65 }}>
              {isAr ? 'مستعد للتعلم؟ أنت في سلسلة نشاط ' : "Ready to learn? You're on a "}
              <span style={{ color: '#FBBF24', fontWeight: 700 }}>🔥 {user?.streak_days || 0} {isAr ? 'أيام' : 'day streak'}</span>
              {isAr ? '. استمر في هذا الزخم!' : '. Keep the momentum going!'}
            </p>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: user?.grade || (isAr ? 'طالب مصري' : 'Egyptian Student'), icon: '🎓', bg: 'rgba(124,58,237,0.15)', c: 'var(--primary-light)', bc: 'rgba(124,58,237,0.28)' },
                { label: `${isAr ? 'مستوى' : 'Level'} ${user?.level || 1}`,        icon: '⭐', bg: 'rgba(245,158,11,0.12)', c: '#FBBF24',             bc: 'rgba(245,158,11,0.28)' },
                { label: `${curXp.toLocaleString()} XP`,    icon: '💎', bg: 'rgba(16,185,129,0.12)', c: '#34D399',             bc: 'rgba(16,185,129,0.28)' },
              ].map(b => (
                <span key={b.label} style={{
                  padding: '5px 13px', borderRadius: 99,
                  fontSize: 12, fontWeight: 700,
                  color: b.c, background: b.bg, border: `1px solid ${b.bc}`,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Center — Generated Artwork */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2, type: 'spring' }}
            style={{ 
              flexShrink: 0, 
              width: 240, height: 180, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '-20px 20px -20px 0'
            }}
          >
            <img src="/images/showcase-6.jpeg" alt="Student Studying" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 24, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }} />
          </motion.div>

          {/* Right — XP progress */}
          <div style={{ minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isAr ? 'تقدم المستوى' : 'Level Progress'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-light)' }}>{pct}%</span>
            </div>
            <ProgressBar value={curXp} max={nextLvl} color="primary" height={10} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, ...(isAr ? {textAlign: 'left'} : {textAlign: 'right'}) }}>
              {curXp.toLocaleString()} / {nextLvl.toLocaleString()} XP {isAr ? `للمستوى ${(Number(user?.level) || 1) + 1}` : `to Level ${(Number(user?.level) || 1) + 1}`}
            </div>

            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {[
                { label: isAr ? 'سلسلة الأيام' : 'Streak', value: `${user?.streak_days || 0}${isAr ? 'ي' : 'd'}`, icon: '🔥' },
                { label: isAr ? 'التصنيف' : 'Rank',   value: user?.rank || '—',             icon: '🏅' },
              ].map(s => (
                <div key={s.label} className="floating-card" style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderRadius: 14,
                }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════
   QuickActions
   ════════════════════════════════════════════════════════ */
function QuickActions({ navigate }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  
  const actions = [
    { icon:'🤖', label: isAr ? 'المعلم الذكي' : 'AI Tutor',     sub: isAr ? 'اسأل أي شيء' : 'Ask anything',    path:'/ai',           grad:'linear-gradient(135deg,#7C3AED,#5B21B6)' },
    { icon:'📅', label: isAr ? 'المخطط' : 'Planner',      sub: isAr ? 'جدولة المذاكرة' : 'Schedule study',  path:'/planner',      grad:'linear-gradient(135deg,#3B82F6,#1D4ED8)' },
    { icon:'✉️', label: isAr ? 'الرسائل' : 'Messages',     sub: isAr ? 'دردش مع زملائك' : 'Chat with peers', path:'/chat/private', grad:'linear-gradient(135deg,#10B981,#059669)' },
    { icon:'📁', label: isAr ? 'الملفات' : 'Files',        sub: isAr ? 'مواد دراسية' : 'Study materials',  path:'/files',        grad:'linear-gradient(135deg,#F59E0B,#D97706)' },
    { icon:'⏱',  label: isAr ? 'التركيز' : 'Focus',        sub: isAr ? 'مؤقت بومودورو' : 'Pomodoro timer',  path:'/focus',        grad:'linear-gradient(135deg,#EF4444,#DC2626)' },
    { icon:'🛠️', label: isAr ? 'الأدوات' : 'Study Tools',  sub: isAr ? 'قاموس · ويكيبيديا' : 'Dict · Wiki · Quiz', path:'/tools',     grad:'linear-gradient(135deg,#EC4899,#BE185D)' },
  ];

  return (
    <div className="floating-panel" style={{ padding: 24, height: '100%' }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-head)', marginBottom: 18, letterSpacing: '-0.02em' }}>
        {isAr ? 'وصول سريع' : 'Quick Access'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            onClick={() => navigate(a.path)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.05 } }}
            whileHover={{ y: -6, scale: 1.05, boxShadow: 'var(--shadow-xl)' }}
            whileTap={{ scale: 0.95 }}
            className="floating-card"
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '20px 16px',
              background: 'var(--glass)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              cursor: 'pointer',
              gap: 8,
              transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Gradient accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: a.grad, borderRadius: '20px 20px 0 0',
            }}/>
            <span style={{ fontSize: 26, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }}>{a.icon}</span>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', lineHeight: 1.1, fontFamily: 'var(--font-head)' }}>{a.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{a.sub}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TodaySchedule
   ════════════════════════════════════════════════════════ */
function TodaySchedule({ sessions, isLoading, navigate }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  return (
    <div className="floating-panel" style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '-0.025em', marginBottom: 3 }}>
            {isAr ? 'جدول اليوم' : "Today's Schedule"}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            {format(new Date(), isAr ? 'dd MMMM yyyy' : 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/planner')}>
          {isAr ? 'عرض الكل ←' : 'View All →'}
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="📅"
          title={isAr ? 'لا توجد جلسات اليوم' : "No sessions today"}
          subtitle={isAr ? 'أضف جلسة دراسية إلى مخططك وابقَ على المسار الصحيح.' : "Add a study session to your planner and stay on track."}
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/planner')}>
              {isAr ? '+ إضافة جلسة' : '+ Add Session'}
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map((s, i) => {
            const color = SUBJ_COLOR[s.subject] || 'var(--primary)';
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.06 } }}
                whileHover={{ x: 6, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="floating-card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 20px',
                  borderRadius: 18,
                  cursor: 'pointer', transition: 'all 0.22s var(--ease)',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  background: `${color}18`,
                  border: `1px solid ${color}28`,
                }}>
                  {SUBJ_ICON[s.subject] || '📖'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize', marginBottom: 2 }}>
                    {s.subject?.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {format(new Date(s.start_time), 'HH:mm')} · {s.duration} min
                  </div>
                </div>
                <span style={{
                  padding: '4px 11px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  background: s.status === 'completed' ? 'rgba(16,185,129,0.12)' : 'rgba(124,58,237,0.12)',
                  color: s.status === 'completed' ? 'var(--success)' : 'var(--primary-light)',
                  border: `1px solid ${s.status === 'completed' ? 'rgba(16,185,129,0.24)' : 'rgba(124,58,237,0.24)'}`,
                }}>
                  {s.status}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   GroupsWidget — shown on student dashboard
   ════════════════════════════════════════════════════════ */
function GroupsWidget({ navigate }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const { data } = useQuery({ queryKey:['groups'], queryFn:() => groupsAPI.list() });
  const groups = data?.data?.groups || [];
  if (groups.length === 0) return null;
  return (
    <Card style={{ padding:24, marginBottom:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h3 style={{ fontSize:15, fontWeight:800, fontFamily:'var(--font-head)', letterSpacing:'-0.02em' }}>📚 {isAr ? 'مجموعاتي' : 'My Groups'}</h3>
        <Button variant="ghost" size="sm" onClick={() => navigate('/groups')}>{isAr ? 'عرض الكل ←' : 'View all →'}</Button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {groups.slice(0,3).map(g => {
          const color = g.color || '#7C3AED';
          return (
            <motion.div key={g._id} whileHover={{ x:4 }} onClick={() => navigate(`/groups/${g._id}`)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:12, cursor:'pointer', borderLeft:`3px solid ${color}` }}>
              <span style={{ fontSize:20 }}>{g.emoji || '📚'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>{g.subject} · {g.teacherName || 'Teacher'}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)' }}>👥 {g.students?.length || 0}</span>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════
   StudentDashboard
   ════════════════════════════════════════════════════════ */
function StudentDashboard() {
  const { user }    = useAuthStore();
  const navigate    = useNavigate();

  const { data: sessData, isLoading: loadSess } = useQuery({
    queryKey: ['sessions', 'today'],
    queryFn:  () => plannerAPI.list({
      start: new Date().toISOString().split('T')[0] + 'T00:00:00',
      end:   new Date().toISOString().split('T')[0] + 'T23:59:59',
    }),
  });
  const { data: statsData  } = useQuery({ queryKey:['stats'],        queryFn:() => usersAPI.getStats() });
  const { data: publicStats } = useQuery({ queryKey:['public-stats'], queryFn:() => usersAPI.getPublicStats() });

  const sessions     = sessData?.data?.sessions  || [];
  const stats        = statsData?.data?.stats    || {};
  const studentCount = publicStats?.data?.count  || 0;

  // All sessions for heatmap (last 90 days)
  const { data: allSessData } = useQuery({
    queryKey: ['sessions', 'all-heatmap'],
    queryFn: () => plannerAPI.getSessions({
      start: (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString(); })(),
      end: new Date().toISOString(),
    }),
    staleTime: 5 * 60 * 1000,
  });
  const allSessions = allSessData?.data?.sessions || [];

  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="visible">
      <motion.div variants={stagger.item}><WelcomeBanner user={user} /></motion.div>

      {/* Groups widget */}
      <GroupsWidget navigate={navigate} />

      <motion.div variants={stagger.item} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:16, marginBottom:28 }}>
        <StatCard icon="👥" value={studentCount.toLocaleString()} label={isAr ? 'طلاب نشطون' : 'Students Online'} color="#10B981" sub={isAr ? 'متواجدون الآن' : 'Active right now'} />
        <StatCard icon="📅" value={stats.sessions_done || 0} label={isAr ? 'جلسات مكتملة' : 'Sessions Done'} color="#7C3AED" change={stats.sessions_done > 5 ? (isAr ? '+معدل ممتاز' : '+Great pace') : undefined} />
        <StatCard icon="🎯" value={stats.quizzes_taken || 0} label={isAr ? 'اختبارات منجزة' : 'Quizzes Taken'} color="#06B6D4" sub={`${stats.avg_score || 0}% ${isAr ? 'متوسط الدرجات' : 'avg score'}`} />
        <StatCard icon="⭐" value={(user?.xp_points || 0).toLocaleString()} label={isAr ? 'إجمالي XP' : 'Total XP'} color="#F59E0B" onClick={() => navigate('/achievements')} sub={isAr ? 'اضغط للإنجازات' : 'Tap for achievements'} />
      </motion.div>

      <motion.div variants={stagger.item} style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24, marginBottom:28 }}>
        <TodaySchedule sessions={sessions} isLoading={loadSess} navigate={navigate} />
        <QuickActions navigate={navigate} />
      </motion.div>

      {/* Streak Heatmap */}
      <motion.div variants={stagger.item} style={{ marginBottom: 28 }}>
        <div className="floating-panel" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', marginBottom: 3 }}>
                🔥 {isAr ? 'النشاط الدراسي' : 'Study Activity'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>{isAr ? 'مدى التزامك بالدراسة آخر ٩٠ يوماً' : 'Your learning consistency over the last 90 days'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>{isAr ? 'التحليلات كاملة ←' : 'Full Analytics →'}</Button>
          </div>
          <StreakHeatmap sessions={allSessions} days={90} />
        </div>
      </motion.div>

      {/* Quote, Weather & Word of Day — Public API Widgets */}
      <motion.div variants={stagger.item} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:28 }}>
        <DailyQuoteWidget />
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <WeatherWidget />
          <div style={{ minWidth:180, padding:'18px 20px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:20, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <div style={{ fontSize:40, lineHeight:1 }}>🔥</div>
            <div style={{ fontSize:36, fontWeight:900, fontFamily:'var(--font-head)', color:'#FBBF24', lineHeight:1, letterSpacing:'-0.04em' }}>{user?.streak_days || 0}</div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{isAr ? 'سلسلة الأيام' : 'Day Streak'}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{user?.streak_days >= 7 ? (isAr ? '🏆 أداء ناري!' : '🏆 On fire!') : (isAr ? 'استمر!' : 'Keep going!')}</div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={stagger.item} style={{ marginBottom: 28 }}>
        <WordOfDayWidget />
      </motion.div>

      <motion.div variants={stagger.item} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {[
          { icon:'🤖', label: isAr ? 'المعلم الذكي' : 'AI Tutor',    desc: isAr ? 'احصل على إجابات فورية لأي مادة بواسطة الذكاء الاصطناعي' : 'Get instant answers for any subject with our AI', color:'#7C3AED', path:'/ai' },
          { icon:'🛠️', label: isAr ? 'الأدوات' : 'Study Tools', desc: isAr ? 'قاموس، ويكيبيديا السريعة، واختبارات ترفيهية' : 'Dictionary, Wikipedia snap, and Trivia quizzes', color:'#F59E0B', path:'/tools' },
          { icon:'📊', label: isAr ? 'التحليلات' : 'Analytics',   desc: isAr ? 'تتبع تقدمك وحدد نقاط الضعف لتحسينها' : 'Track your progress and identify areas to improve', color:'#06B6D4', path:'/analytics' },
        ].map((f,i) => (
          <motion.div key={f.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0, transition:{ delay:0.3+i*0.08 } }} whileHover={{ y:-4 }} onClick={() => navigate(f.path)}
            style={{ padding:'22px 20px', borderRadius:18, border:'1px solid var(--border)', background:'var(--surface)', cursor:'pointer', transition:'all 0.22s var(--ease)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, right:0, left:0, height:3, background:`linear-gradient(90deg,${f.color},transparent)`, borderRadius:'18px 18px 0 0' }} />
            <div style={{ width:48, height:48, borderRadius:14, fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', background:`${f.color}18`, border:`1px solid ${f.color}28`, marginBottom:14 }}>{f.icon}</div>
            <div style={{ fontSize:15, fontWeight:800, fontFamily:'var(--font-head)', color:'var(--text)', marginBottom:6, letterSpacing:'-0.02em' }}>{f.label}</div>
            <div style={{ fontSize:12.5, color:'var(--text3)', lineHeight:1.55 }}>{f.desc}</div>
            <div style={{ marginTop:14, fontSize:12, fontWeight:700, color:f.color }}>{isAr ? 'فتح ←' : 'Open →'}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Campus Gallery — showcasing Najah environment */}
      <motion.div variants={stagger.item} style={{ marginTop: 32, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em' }}>
            📸 {isAr ? 'الحرم الجامعي' : 'Campus Life'}
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{isAr ? 'بيئة التعلم الخاصة بك' : 'Your learning environment'}</span>
        </div>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
          scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
        }}>
          {[1,3,5,8,9,11,12,15].map((n, i) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: 0.04 * i } }}
              whileHover={{ scale: 1.05, y: -4 }}
              style={{
                flexShrink: 0, width: 160, height: 110, borderRadius: 14,
                overflow: 'hidden', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
              }}
            >
              <img
                src={`/images/najah-bg-${n}.jpeg`}
                alt={`campus-${n}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );

}

/* ════════════════════════════════════════════════════════
   Main Dashboard export — role router
   ════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user } = useAuthStore();
  const role = getUserRole(user);
  const loader = <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>;

  if (role === 'admin') {
    return <Suspense fallback={loader}><AdminOverviewDashboard /></Suspense>;
  }
  if (role === 'center_owner') {
    return <Suspense fallback={loader}><CenterDashboard /></Suspense>;
  }
  if (role === 'teacher') {
    return <Suspense fallback={loader}><TeacherDashboard /></Suspense>;
  }
  if (role === 'university_student') {
    return <Suspense fallback={loader}><UniversityDashboard /></Suspense>;
  }
  if (role === 'school_student') {
    return <Suspense fallback={loader}><SchoolStudentDashboard /></Suspense>;
  }
  // Default: original rich student dashboard (guest fallback)
  return <StudentDashboard />;
}

