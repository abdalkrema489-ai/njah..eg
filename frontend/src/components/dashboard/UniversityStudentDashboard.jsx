// src/components/dashboard/UniversityStudentDashboard.jsx — Najah v7
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuthStore } from '../../context/store';
import { plannerAPI, groupsAPI, analyticsAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

/* ── Progress Ring ───────────────────────────────── */
function ProgressRing({ value, size = 72, stroke = 7, color = '#6366F1', label }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface3)" strokeWidth={stroke} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          style={{ fill: 'var(--text)', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-head)' }}
          transform={`rotate(90, ${size/2}, ${size/2})`}
        >
          {value}%
        </text>
      </svg>
      {label && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>}
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────── */
function StatCard({ icon, label, value, sub, color = '#6366F1' }) {
  return (
    <motion.div variants={fadeUp}
      whileHover={{ y: -4, boxShadow: `0 12px 32px ${color}22` }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 18, padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'box-shadow 0.2s',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 13,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-head)', letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

/* ── Main Dashboard ──────────────────────────────── */
export default function UniversityStudentDashboard() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';

  const [sessions, setSessions] = useState([]);
  const [groups, setGroups]     = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, gRes, aRes] = await Promise.allSettled([
          plannerAPI.getSessions(),
          groupsAPI.getMyGroups(),
          analyticsAPI.getDashboard(),
        ]);
        if (sRes.status === 'fulfilled') setSessions(sRes.value.data?.sessions || []);
        if (gRes.status === 'fulfilled') setGroups(gRes.value.data?.groups || []);
        if (aRes.status === 'fulfilled') setAnalytics(aRes.value.data);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const xp     = user?.xp_points  || 0;
  const level  = user?.level       || 1;
  const streak = user?.streak_days || 0;
  const grade  = user?.grade       || 'Year 1';
  const name   = user?.name?.split(' ')[0] || 'Student';

  // Fake weekly study data if no analytics
  const weekData = analytics?.weeklyHours || [
    { day: 'Mon', hours: 2.5 },
    { day: 'Tue', hours: 4 },
    { day: 'Wed', hours: 1.5 },
    { day: 'Thu', hours: 5 },
    { day: 'Fri', hours: 3 },
    { day: 'Sat', hours: 0.5 },
    { day: 'Sun', hours: 3.5 },
  ];

  const totalHoursWeek = weekData.reduce((s, d) => s + d.hours, 0);
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div style={{ padding: '0 4px', maxWidth: 1200 }}>

      {/* ── Header ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show"
        style={{
          marginBottom: 28, display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
            {grade} • {user?.school || user?.institution || 'University'}
          </div>
          <h2 style={{
            fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-head)',
            letterSpacing: '-0.04em', lineHeight: 1,
            background: 'linear-gradient(135deg, var(--text) 40%, #6366F1 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {isAr ? 'مرحباً،' : 'Hey,'} {name}.
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text3)', marginTop: 6 }}>
            {isAr ? 'استمر في الزخم — كل يوم خطوة نحو هدفك.' : 'Keep the momentum — every day is progress toward your goal.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/ai')}
            style={{
              padding: '11px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff',
              border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
            }}
          >
            🤖 {isAr ? 'مساعد الأبحاث' : 'Research AI'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/planner')}
            style={{
              padding: '11px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700,
              background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            📅 {isAr ? 'جدولتي' : 'My Schedule'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 16, marginBottom: 24 }}
      >
        <StatCard icon="⏱️" label={isAr ? 'ساعات هذا الأسبوع' : 'Hours This Week'} value={`${totalHoursWeek.toFixed(1)}h`} sub={isAr ? 'الهدف: ٢٠ ساعة' : 'Goal: 20h'} color="#6366F1" />
        <StatCard icon="✅" label={isAr ? 'جلسات مكتملة' : 'Sessions Done'} value={completedSessions} sub={isAr ? 'إجمالي' : 'All time'} color="#10B981" />
        <StatCard icon="🔥" label={isAr ? 'أيام متواصلة' : 'Day Streak'} value={streak} sub={streak >= 7 ? '🏆 On fire!' : 'Keep going!'} color="#F59E0B" />
        <StatCard icon="⭐" label={isAr ? 'نقاط XP' : 'Total XP'} value={xp.toLocaleString()} sub={`Level ${level}`} color="#8B5CF6" />
      </motion.div>

      {/* ── Main grid ── */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
      >
        {/* Weekly Study Chart */}
        <motion.div variants={fadeUp}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 20, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>
            📊 {isAr ? 'ساعات الدراسة الأسبوعية' : 'Weekly Study Hours'}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                formatter={v => [`${v}h`, isAr ? 'ساعات' : 'Hours']}
              />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                {weekData.map((_, i) => (
                  <Cell key={i} fill={i === new Date().getDay() ? '#6366F1' : '#6366F133'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Academic Progress */}
        <motion.div variants={fadeUp}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 20, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>
            🎯 {isAr ? 'تقدمي الأكاديمي' : 'Academic Progress'}
          </h3>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            <ProgressRing value={Math.min(100, Math.floor((xp % 500) / 5))} color="#6366F1" label="XP Goal" />
            <ProgressRing value={Math.min(100, completedSessions * 5)} color="#10B981" label="Sessions" />
            <ProgressRing value={Math.min(100, streak * 3)} color="#F59E0B" label="Streak" />
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: isAr ? 'مجموعاتي' : 'My Groups', count: groups.length, path: '/groups', color: '#6366F1' },
              { label: isAr ? 'اختباراتي' : 'My Quizzes', count: analytics?.quizzes || 0, path: '/quiz-history', color: '#10B981' },
            ].map(c => (
              <motion.button key={c.path} whileHover={{ scale: 1.04 }} onClick={() => navigate(c.path)}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  background: `${c.color}14`, border: `1px solid ${c.color}30`, color: c.color,
                  fontSize: 12, fontWeight: 700, textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900 }}>{c.count}</div>
                {c.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* My Groups */}
        <motion.div variants={fadeUp}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>
              👥 {isAr ? 'مجموعات الدراسة' : 'Study Groups'}
            </h3>
            <button onClick={() => navigate('/groups')}
              style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              {isAr ? 'عرض الكل' : 'All →'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>{isAr ? 'لا مجموعات بعد' : 'No groups yet'}</p>
                <button onClick={() => navigate('/groups')} style={{ padding: '8px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {isAr ? 'تصفح' : 'Browse'}
                </button>
              </div>
            ) : (
              groups.slice(0, 4).map(g => (
                <motion.div key={g.id} whileHover={{ x: 4 }} onClick={() => navigate(`/groups/${g.id}`)}
                  style={{ padding: '11px 14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                    {g.emoji || '📖'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{g.member_count || 0} {isAr ? 'أعضاء' : 'members'}</div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', color: '#818CF8' }}>
                    {g.is_paid ? '💎' : '🆓'}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* AI Tools */}
        <motion.div variants={fadeUp}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 20, padding: 22 }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>
            🤖 {isAr ? 'أدوات الذكاء الاصطناعي' : 'AI Academic Tools'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '📄', label: isAr ? 'لخّص PDF' : 'Summarize PDF', sub: isAr ? 'ملخص الأوراق العلمية' : 'Research paper summarizer', path: '/tools' },
              { icon: '✍️', label: isAr ? 'مساعد الكتابة' : 'Essay Helper', sub: isAr ? 'راجع ابحاثك ومقالاتك' : 'Review your essays and reports', path: '/ai' },
              { icon: '🧪', label: isAr ? 'محاكي الامتحان' : 'Exam Simulator', sub: isAr ? 'أسئلة بنمط كليتك' : 'Questions in your college style', path: '/exam' },
              { icon: '🔍', label: isAr ? 'بحث ذكي' : 'AI Web Search', sub: isAr ? 'استكشف المعرفة الحديثة' : 'Explore latest knowledge', path: '/ai-search' },
            ].map(a => (
              <motion.div key={a.path} whileHover={{ x: 5 }} onClick={() => navigate(a.path)}
                style={{ padding: '11px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

    </div>
  );
}
