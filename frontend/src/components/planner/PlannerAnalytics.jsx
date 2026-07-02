// src/components/planner/PlannerAnalytics.jsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import { plannerAPI } from '../../api/index';
import { useAuthStore, useUIStore } from '../../context/store';
import { useTranslation } from '../../i18n/index';
import { Skeleton, EmptyState } from '../shared/UI';

const SUBJECTS = [
  { key: 'mathematics', en: 'Math',      ar: 'رياضيات', color: '#6366F1' },
  { key: 'science',     en: 'Science',   ar: 'علوم',    color: '#10B981' },
  { key: 'physics',     en: 'Physics',   ar: 'فيزياء',  color: '#06B6D4' },
  { key: 'chemistry',   en: 'Chemistry', ar: 'كيمياء',  color: '#EC4899' },
  { key: 'biology',     en: 'Biology',   ar: 'أحياء',   color: '#84CC16' },
  { key: 'arabic',      en: 'Arabic',    ar: 'عربي',    color: '#F59E0B' },
  { key: 'english',     en: 'English',   ar: 'إنجليزي', color: '#3B82F6' },
  { key: 'social_studies', en: 'Social', ar: 'اجتماعيات', color: '#EF4444' },
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT_AR = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];

export default function PlannerAnalytics() {
  const { t } = useTranslation();
  const { language } = useUIStore();
  const isAr = language === 'ar';
  const { user } = useAuthStore();

  const now = new Date();
  const start90 = subDays(now, 90).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ['sessions-analytics'],
    queryFn: () => plannerAPI.getSessions({ start: start90, end: now.toISOString() }),
    staleTime: 5 * 60 * 1000,
  });
  const sessions = data?.data?.sessions || [];
  const completed = sessions.filter(s => s.status === 'completed');

  // ── Study Streak ──
  const streak = useMemo(() => {
    const days = new Set(completed.map(s => s.start_time?.slice(0, 10)));
    let count = 0;
    let d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) {
      count++;
      d = subDays(d, 1);
    }
    return count;
  }, [completed]);

  // ── Hours by Subject (last 30 days) ──
  const thirtyDaysAgo = subDays(now, 30);
  const hoursPerSubject = useMemo(() => {
    const map = {};
    completed
      .filter(s => new Date(s.start_time) >= thirtyDaysAgo)
      .forEach(s => {
        map[s.subject] = (map[s.subject] || 0) + (s.duration || 0);
      });
    return Object.entries(map)
      .map(([k, mins]) => ({ key: k, mins, hours: Math.round(mins / 60 * 10) / 10 }))
      .sort((a, b) => b.mins - a.mins);
  }, [completed]);
  const maxHours = Math.max(...hoursPerSubject.map(h => h.mins), 1);

  // ── 8-week completion rate ──
  const weeklyRates = useMemo(() => {
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = startOfWeek(subDays(now, w * 7), { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 7);
      const inWeek = sessions.filter(s => {
        const d = new Date(s.start_time);
        return d >= weekStart && d < weekEnd;
      });
      const total = inWeek.length;
      const done = inWeek.filter(s => s.status === 'completed').length;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      weeks.push({ label: format(weekStart, 'MMM d'), total, done, pct });
    }
    return weeks;
  }, [sessions]);

  // ── Heatmap: 7 days × 24 hours ──
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    completed.forEach(s => {
      const d = new Date(s.start_time);
      const day = d.getDay();
      const hour = d.getHours();
      grid[day][hour]++;
    });
    const max = Math.max(...grid.flat(), 1);
    return { grid, max };
  }, [completed]);

  // ── XP Level ──
  const xp = user?.xp_points || 0;
  const level = Math.floor(xp / 500) + 1;
  const levelPct = ((xp % 500) / 500) * 100;

  if (isLoading) return (
    <div style={{ padding: 28 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <Skeleton.Text width="30%" style={{ height: 20, marginBottom: 12 }} />
          <Skeleton.Text width="100%" style={{ height: 60, borderRadius: 12 }} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Top Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: isAr ? 'أيام متتالية' : 'Day Streak', value: streak, icon: '🔥', color: '#F59E0B' },
          { label: isAr ? 'جلسات مكتملة' : 'Completed', value: completed.length, icon: '✅', color: '#10B981' },
          { label: isAr ? 'ساعات هذا الشهر' : 'Hours (30d)', value: `${Math.round(hoursPerSubject.reduce((a, h) => a + h.mins, 0) / 60)}h`, icon: '⏱️', color: '#6366F1' },
        ].map(stat => (
          <motion.div key={stat.label} whileHover={{ y: -4, scale: 1.02 }}
            style={{ padding: '20px 22px', borderRadius: 18, background: `${stat.color}12`, border: `1.5px solid ${stat.color}30`, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: stat.color, lineHeight: 1.1, marginTop: 6 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── XP Progress ── */}
      <div className="floating-panel" style={{ padding: 24, borderRadius: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>⚡ {isAr ? 'نقاط الخبرة' : 'XP Progress'}</div>
          <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 700 }}>
            {isAr ? `المستوى ${level}` : `Level ${level}`} · {xp} XP
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 50, height: 10, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${levelPct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #F59E0B, #EF4444)', borderRadius: 50 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text4)' }}>
          <span>{xp % 500} XP</span>
          <span>500 XP</span>
        </div>
      </div>

      {/* ── Hours by Subject ── */}
      <div className="floating-panel" style={{ padding: 24, borderRadius: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
          📊 {isAr ? 'ساعات الدراسة بالمادة (30 يوماً)' : 'Hours by Subject (30 days)'}
        </div>
        {hoursPerSubject.length === 0 ? (
          <EmptyState icon="📊" title={isAr ? 'لا توجد بيانات بعد' : 'No data yet'} subtitle={isAr ? 'أكمل جلسات دراسية لرؤية التحليلات' : 'Complete study sessions to see analytics'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hoursPerSubject.map(({ key, mins, hours }) => {
              const subj = SUBJECTS.find(s => s.key === key);
              const pct = Math.round((mins / maxHours) * 100);
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: subj?.color || 'var(--primary)' }}>{isAr ? (subj?.ar || key) : (subj?.en || key)}</span>
                    <span style={{ color: 'var(--text3)' }}>{hours}h</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 50, height: 8, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', background: `linear-gradient(90deg, ${subj?.color || '#6366F1'}, ${subj?.color || '#6366F1'}99)`, borderRadius: 50 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Weekly Completion Rate ── */}
      <div className="floating-panel" style={{ padding: 24, borderRadius: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
          📈 {isAr ? 'معدل الإنجاز الأسبوعي' : 'Weekly Completion Rate'}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
          {weeklyRates.map((week, i) => {
            const color = week.pct >= 70 ? '#10B981' : week.pct >= 40 ? '#F59E0B' : week.total === 0 ? 'rgba(255,255,255,0.08)' : '#EF4444';
            const heightPct = week.total === 0 ? 8 : Math.max(8, week.pct);
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700 }}>{week.pct > 0 ? `${week.pct}%` : ''}</div>
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${heightPct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                  style={{ width: '100%', background: color, borderRadius: '6px 6px 0 0', minHeight: 8, boxShadow: week.pct >= 70 ? `0 0 10px ${color}50` : 'none' }}
                />
                <div style={{ fontSize: 9, color: 'var(--text4)', textAlign: 'center', lineHeight: 1.2 }}>{week.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11 }}>
          {[{ color: '#10B981', label: isAr ? '≥70%' : '≥70%' }, { color: '#F59E0B', label: '40-69%' }, { color: '#EF4444', label: '<40%' }].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Heatmap ── */}
      <div className="floating-panel" style={{ padding: 24, borderRadius: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
          🗓️ {isAr ? 'أفضل أوقات الدراسة' : 'Best Study Hours'}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 520 }}>
            {/* Hour labels */}
            <div style={{ display: 'flex', paddingLeft: 36, marginBottom: 4 }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ flex: 1, fontSize: 8, color: 'var(--text4)', textAlign: 'center' }}>
                  {h % 4 === 0 ? `${h}h` : ''}
                </div>
              ))}
            </div>
            {/* Grid rows */}
            {heatmap.grid.map((row, dayIdx) => (
              <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                <div style={{ width: 28, fontSize: 9, color: 'var(--text4)', fontWeight: 700, flexShrink: 0 }}>
                  {isAr ? DAYS_SHORT_AR[dayIdx] : DAYS_SHORT[dayIdx]}
                </div>
                {row.map((count, hour) => {
                  const opacity = count === 0 ? 0.06 : 0.2 + (count / heatmap.max) * 0.8;
                  return (
                    <div key={hour} title={`${count} sessions`}
                      style={{
                        flex: 1, height: 14, borderRadius: 2,
                        background: `rgba(99, 102, 241, ${opacity})`,
                        border: count > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.03)',
                        transition: 'opacity 0.2s'
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
