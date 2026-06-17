// src/components/dashboard/SchoolStudentDashboard.jsx — Najah v7
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../context/store';
import { plannerAPI, groupsAPI, aiAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
};

/* ── XP Progress Bar ────────────────────────────── */
function XPBar({ xp, level }) {
  const xpPerLevel = 500;
  const current = xp % xpPerLevel;
  const pct = Math.min(100, (current / xpPerLevel) * 100);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Level {level}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA' }}>
          {current} / {xpPerLevel} XP
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--surface3)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{
            height: '100%',
            borderRadius: 99,
            background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
            boxShadow: '0 0 12px rgba(124,58,237,0.5)',
            position: 'relative',
          }}
        >
          {/* shimmer */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }} />
        </motion.div>
      </div>
    </div>
  );
}

/* ── Streak Fire ─────────────────────────────────── */
function StreakFire({ days }) {
  const size = Math.min(64, 28 + days * 1.5);
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1], rotate: [-3, 3, -3, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
    >
      <span style={{ fontSize: size, lineHeight: 1 }}>🔥</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', letterSpacing: '-0.02em' }}>
        {days} {days === 1 ? 'day' : 'days'}
      </span>
    </motion.div>
  );
}

/* ── Deadline Countdown ──────────────────────────── */
function DeadlinePill({ deadline }) {
  const diff = Math.ceil((new Date(deadline) - Date.now()) / 86400000);
  const color = diff <= 1 ? '#EF4444' : diff <= 3 ? '#F59E0B' : '#10B981';
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {diff <= 0 ? 'Today!' : `${diff}d left`}
    </span>
  );
}

/* ── Quick Action Button ─────────────────────────── */
function QuickBtn({ emoji, label, onClick, accent = '#7C3AED' }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06, y: -3 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '14px 18px',
        background: `${accent}18`,
        border: `1px solid ${accent}33`,
        borderRadius: 16,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        boxShadow: `0 4px 16px ${accent}22`,
        flex: 1, minWidth: 80,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 8px 24px ${accent}44`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = `0 4px 16px ${accent}22`}
    >
      <span style={{ fontSize: 26 }}>{emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </motion.button>
  );
}

/* ── Main Dashboard ──────────────────────────────── */
export default function SchoolStudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';

  const [sessions, setSessions] = useState([]);
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dailyTip, setDailyTip] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, gRes] = await Promise.allSettled([
          plannerAPI.getSessions(),
          groupsAPI.getMyGroups(),
        ]);
        if (sRes.status === 'fulfilled') setSessions(sRes.value.data?.sessions || []);
        if (gRes.status === 'fulfilled') setGroups(gRes.value.data?.groups || []);
      } catch {}
      finally { setLoading(false); }
    };
    load();

    // Friendly tips rotation
    const tips = [
      '📖 Break big topics into 20-minute Pomodoro chunks!',
      '🧠 Teach what you just learned — it cements memory!',
      '✅ Start with the hardest subject when your focus is fresh.',
      '💧 Stay hydrated — your brain is 75% water!',
      '🌙 Sleep 8 hours — memory consolidation happens at night.',
    ];
    setDailyTip(tips[new Date().getDay() % tips.length]);
  }, []);

  const todaySessions = sessions.filter(s => {
    const d = new Date(s.start_time);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const handleStartSession = (session) => {
    navigate('/focus', { state: { session } });
    toast.success(`Starting ${session.subject} session! 🔥`);
  };

  const handleXPCelebrate = () => {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#7C3AED','#A78BFA','#F59E0B','#10B981'] });
  };

  const xp    = user?.xp_points   || 0;
  const level = user?.level        || 1;
  const streak= user?.streak_days  || 0;
  const name  = user?.name?.split(' ')[0] || 'Student';

  return (
    <div style={{ padding: '0 4px', maxWidth: 1100, width: '100%', boxSizing: 'border-box' }}>

      {/* ── Hero card ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show"
        style={{
          borderRadius: 'clamp(16px, 4vw, 24px)', padding: 'clamp(16px, 4vw, 28px) clamp(14px, 4vw, 32px)',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(16,185,129,0.10) 100%)',
          border: '1px solid rgba(124,58,237,0.25)',
          boxShadow: '0 8px 32px rgba(124,58,237,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, marginBottom: 24, flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>
            {isAr ? 'مرحباً،' : 'Welcome back,'}
          </div>
          <h2 style={{
            fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-head)',
            letterSpacing: '-0.03em', marginBottom: 16,
            background: 'linear-gradient(135deg, var(--text), #A78BFA)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {name} {streak >= 7 ? '🏆' : streak >= 3 ? '⭐' : '👋'}
          </h2>
          <XPBar xp={xp} level={level} />
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={handleXPCelebrate}
            style={{
              marginTop: 12, fontSize: 11, fontWeight: 700, color: '#A78BFA',
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            {isAr ? '🎊 احتفل بتقدمك!' : '🎊 Celebrate progress!'}
          </motion.button>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <StreakFire days={streak} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#10B981', fontFamily: 'var(--font-head)' }}>{xp}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total XP</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#7C3AED', fontFamily: 'var(--font-head)' }}>Lv.{level}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level</div>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}
      >
        {[
          { emoji: '🤖', label: isAr ? 'المساعد الذكي' : 'AI Tutor',      path: '/ai',           accent: '#7C3AED' },
          { emoji: '⏱️', label: isAr ? 'بدء المذاكرة'  : 'Start Focus',   path: '/focus',        accent: '#F59E0B' },
          { emoji: '📝', label: isAr ? 'واجباتي'        : 'My Homework',   path: '/groups',       accent: '#10B981' },
          { emoji: '🧪', label: isAr ? 'اختبار سريع'   : 'Quick Quiz',    path: '/exam',         accent: '#06B6D4' },
          { emoji: '💬', label: isAr ? 'رسائل'          : 'Messages',      path: '/chat',         accent: '#EF4444' },
        ].map(a => (
          <motion.div key={a.path} variants={fadeUp}>
            <QuickBtn emoji={a.emoji} label={a.label} accent={a.accent} onClick={() => navigate(a.path)} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Grid ── */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20 }}
      >
        {/* Today's Schedule */}
        <motion.div variants={fadeUp}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>
              📅 {isAr ? 'جدول اليوم' : "Today's Schedule"}
            </h3>
            <button onClick={() => navigate('/planner')}
              style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              {isAr ? 'عرض الكل' : 'View all →'}
            </button>
          </div>
          {todaySessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>{isAr ? 'لا جلسات اليوم' : 'No sessions today'}</p>
              <button onClick={() => navigate('/planner')}
                style={{ marginTop: 10, padding: '8px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                + {isAr ? 'أضف جلسة' : 'Add Session'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todaySessions.map(s => {
                const start = new Date(s.start_time);
                const isUpcoming = start > Date.now() && start - Date.now() < 30 * 60 * 1000;
                return (
                  <motion.div key={s.id}
                    whileHover={{ x: 4 }}
                    style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: isUpcoming ? 'rgba(245,158,11,0.1)' : 'var(--surface2)',
                      border: `1px solid ${isUpcoming ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{s.subject}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {s.duration}min
                      </div>
                    </div>
                    {isUpcoming && (
                      <motion.button
                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                        onClick={() => handleStartSession(s)}
                        style={{ padding: '6px 12px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                      >
                        ▶ {isAr ? 'ابدأ' : 'Start'}
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* My Groups */}
        <motion.div variants={fadeUp}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>
              👥 {isAr ? 'مجموعاتي' : 'My Groups'}
            </h3>
            <button onClick={() => navigate('/groups')}
              style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              {isAr ? 'عرض الكل' : 'View all →'}
            </button>
          </div>
          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏫</div>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>{isAr ? 'لم تنضم لأي مجموعة بعد' : 'No groups yet'}</p>
              <button onClick={() => navigate('/groups')}
                style={{ marginTop: 10, padding: '8px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                {isAr ? 'تصفح المجموعات' : 'Browse Groups'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {groups.slice(0, 4).map(g => (
                <motion.div key={g.id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  style={{
                    padding: '12px 14px', borderRadius: 12, background: 'var(--surface2)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #7C3AED, #10B981)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>
                    {g.emoji || '📚'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{g.member_count || 0} {isAr ? 'عضو' : 'members'}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Daily Tip */}
        <motion.div variants={fadeUp}
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>
            💡 {isAr ? 'نصيحة اليوم' : "Today's Tip"}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65 }}>{dailyTip}</p>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/ai')}
              style={{
                padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              }}
            >
              🤖 {isAr ? 'اسأل الذكاء الاصطناعي' : 'Ask AI'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/planner')}
              style={{
                padding: '10px 20px', background: 'var(--surface)',
                color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📅 {isAr ? 'خطط الآن' : 'Plan Now'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
