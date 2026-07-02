// src/components/planner/StudyPlanGenerator.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import client from '../../api/index';
import { Spinner } from '../shared/UI';
import { haptic } from '../../utils/haptics';
import { useDraftStore } from '../../context/store';

const SUBJECTS_LIST = [
  { key: 'mathematics',    en: 'Mathematics',    ar: 'رياضيات', icon: '📐' },
  { key: 'physics',        en: 'Physics',         ar: 'فيزياء',  icon: '⚡' },
  { key: 'chemistry',      en: 'Chemistry',       ar: 'كيمياء',  icon: '⚗️' },
  { key: 'biology',        en: 'Biology',         ar: 'أحياء',   icon: '🧬' },
  { key: 'arabic',         en: 'Arabic',          ar: 'عربي',    icon: '📚' },
  { key: 'english',        en: 'English',         ar: 'إنجليزي', icon: '🌐' },
  { key: 'history',        en: 'History',         ar: 'تاريخ',   icon: '🏛️' },
  { key: 'geography',      en: 'Geography',       ar: 'جغرافيا', icon: '🗺️' },
];

const LEVELS = [
  { key: 'beginner',     en: 'Beginner',     ar: 'مبتدئ',   icon: '🌱' },
  { key: 'intermediate', en: 'Intermediate', ar: 'متوسط',   icon: '📈' },
  { key: 'advanced',     en: 'Advanced',     ar: 'متقدم',   icon: '🚀' },
];

function MarkdownPlan({ content, isAr }) {
  const safeContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2) || '';
  const lines = safeContent.split('\n');
  return (
    <div style={{ lineHeight: 1.8, fontSize: 14, color: 'var(--text)' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} style={{
              fontSize: 17, fontWeight: 800, color: 'var(--primary)',
              margin: '20px 0 10px', paddingBottom: 6,
              borderBottom: '1px solid var(--border)',
            }}>
              {line.replace('## ', '')}
            </h3>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h4 key={i} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '14px 0 6px' }}>
              {line.replace('### ', '')}
            </h4>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
              <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span>
              <span>{line.replace(/^[-*] /, '')}</span>
            </div>
          );
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <strong key={i} style={{ color: 'var(--text)', fontWeight: 800 }}>
              {line.replace(/\*\*/g, '')}
            </strong>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
        return <p key={i} style={{ margin: '4px 0' }}>{line}</p>;
      })}
    </div>
  );
}

export default function StudyPlanGenerator({ isAr }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { plannerDraft, setPlannerDraft, clearPlannerDraft } = useDraftStore();

  // ── Restore from draft on mount ─────────────────────────────
  const [examDate, setExamDate]       = useState(() => plannerDraft?.examDate      || '');
  const [subjects, setSubjects]       = useState(() => plannerDraft?.subjects      || []);
  const [hoursPerDay, setHoursPerDay] = useState(() => plannerDraft?.hoursPerDay   || 4);
  const [level, setLevel]             = useState(() => plannerDraft?.level         || 'intermediate');
  const [plan, setPlan]               = useState(() => plannerDraft?.generatedPlan || null);
  const [applying, setApplying]       = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(() => !!plannerDraft?.savedAt);

  // ── Debounced draft save (500ms) ─────────────────────────────
  const draftTimer = useRef(null);
  const saveDraft = useCallback((updates) => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      setPlannerDraft(updates);
    }, 500);
  }, [setPlannerDraft]);

  // Auto-save whenever wizard state changes
  useEffect(() => {
    saveDraft({ examDate, subjects, hoursPerDay, level, generatedPlan: plan });
    return () => clearTimeout(draftTimer.current);
  }, [examDate, subjects, hoursPerDay, level, plan, saveDraft]);

  const toggleSubject = (key) =>
    setSubjects(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key]);

  const generateMutation = useMutation({
    mutationFn: () => client.post('/ai/study-plan', {
      examDate, subjects, hoursPerDay, level,
    }).then(r => r.data),
    onSuccess: (data) => {
      setPlan(data);
      haptic.success();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || (isAr ? 'فشل توليد الخطة' : 'Failed to generate plan'));
    },
  });

  const handleAddToPlanner = async () => {
    if (!plan || !Array.isArray(plan.plan)) return;
    setApplying(true);
    try {
      const sessions = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to midnight

      plan.plan.forEach((day) => {
        let dateObj = null;

        if (day.date) {
          const cleanDate = String(day.date).replace(/\//g, '-').trim();
          const isoMatch = cleanDate.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            const y = parseInt(isoMatch[1], 10);
            const m = parseInt(isoMatch[2], 10) - 1;
            const d = parseInt(isoMatch[3], 10);
            const candidate = new Date(y, m, d);
            if (!isNaN(candidate.getTime())) dateObj = candidate;
          }
          if (!dateObj) {
            const parsed = new Date(day.date);
            if (!isNaN(parsed.getTime())) dateObj = parsed;
          }
        }

        if (!dateObj || isNaN(dateObj.getTime())) {
          const dayOffset = Math.max(0, (parseInt(String(day.day).replace(/\D/g, '')) || 1) - 1);
          dateObj = new Date(today);
          dateObj.setDate(today.getDate() + dayOffset);
        }

        (day.sessions || []).forEach((s, si) => {
          if (s.type === 'rest') return;

          let hour = 9 + (si * 2);
          let minute = 0;

          if (s.time) {
            const timeStr = String(s.time).trim();
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const rawHour = parseInt(timeMatch[1], 10);
              const rawMin  = parseInt(timeMatch[2], 10);
              if (!isNaN(rawHour) && !isNaN(rawMin)) {
                hour   = rawHour;
                minute = rawMin;
                const lower = timeStr.toLowerCase();
                if (lower.includes('pm') && hour < 12) hour += 12;
                if (lower.includes('am') && hour === 12) hour = 0;
              }
            }
          }

          hour   = Math.min(Math.max(hour, 0), 23);
          minute = Math.min(Math.max(minute, 0), 59);

          const start = new Date(
            dateObj.getFullYear(),
            dateObj.getMonth(),
            dateObj.getDate(),
            hour, minute, 0
          );

          if (isNaN(start.getTime())) return;

          const durationMin = parseInt(String(s.duration).replace(/\D/g, '')) || 60;
          const end = new Date(start.getTime() + durationMin * 60000);

          let sessSubject = s.subject || plan.subject || (Array.isArray(plan.subjects) ? plan.subjects[0] : null) || 'mathematics';
          sessSubject = String(sessSubject).toLowerCase().trim().replace(/[^a-z0-9_]/g, '').replace(/\s+/g, '_');
          if (!sessSubject) sessSubject = 'mathematics';

          sessions.push({
            subject: sessSubject,
            topic:      s.topic || (isAr ? 'جلسة مذاكرة' : 'Study Session'),
            start_time: start.toISOString(),
            end_time:   end.toISOString(),
            notes:      s.goal || s.notes || '',
          });
        });
      });

      if (sessions.length === 0) {
        toast.error(isAr ? 'لا توجد جلسات دراسية صالحة لإضافتها' : 'No study sessions to apply');
        setApplying(false);
        return;
      }

      let successCount = 0;
      let skippedCount = 0;

      for (const s of sessions) {
        try {
          await client.post('/planner', s);
          successCount++;
        } catch (err) {
          if (err.response?.status === 409) {
            skippedCount++;
          } else {
            console.warn('Session creation skipped:', err.message);
            skippedCount++;
          }
        }
      }

      qc.invalidateQueries(['sessions']);

      if (successCount > 0) {
        // Clear the draft after successful apply
        clearPlannerDraft();
        setShowDraftBanner(false);
        if (skippedCount > 0) {
          toast.success(isAr
            ? `📅 تم إضافة ${successCount} جلسة، وتجاوز ${skippedCount} بسبب تعارض المواعيد`
            : `📅 Added ${successCount} sessions, skipped ${skippedCount} due to conflicts`
          );
        } else {
          toast.success(isAr
            ? `📅 تم إضافة ${successCount} جلسة بنجاح إلى المخطط!`
            : `📅 Successfully added ${successCount} sessions to your planner!`
          );
        }
      } else {
        toast.error(isAr ? 'تعذر إضافة الجلسات لوجود تعارضات في كل المواعيد' : 'All sessions skipped due to conflicts');
      }
    } catch (err) {
      toast.error(isAr ? 'فشل إضافة الجلسات للمخطط' : 'Failed to apply sessions');
    } finally {
      setApplying(false);
    }
  };

  const isValid = examDate && subjects.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, margin: '0 auto' }}>

      {/* ── Draft Restored Banner ── */}
      <AnimatePresence>
        {showDraftBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              padding: '14px 20px',
              borderRadius: 14,
              background: 'rgba(99,102,241,0.12)',
              border: '1.5px solid rgba(99,102,241,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 13, color: 'var(--text)',
            }}
          >
            <span>
              💾 {isAr
                ? 'تم استرجاع مسودة محفوظة — هل تريد الاستمرار؟'
                : 'Draft restored — continue where you left off?'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowDraftBanner(false)}
                style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {isAr ? 'استمر' : 'Continue'}
              </button>
              <button
                onClick={() => {
                  clearPlannerDraft();
                  setShowDraftBanner(false);
                  setExamDate(''); setSubjects([]); setHoursPerDay(4);
                  setLevel('intermediate'); setPlan(null);
                }}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {isAr ? 'مسح المسودة' : 'Clear draft'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Config Panel ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel" style={{ padding: 28 }}>

        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 24, color: 'var(--text)' }}>
          📅 {isAr ? 'توليد خطة مذاكرة ذكية' : 'Generate AI Study Plan'}
        </h3>

        {/* Exam date */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            % 📆 {isAr ? 'تاريخ الامتحان' : 'Exam Date'}
          </label>
          <input
            type="date"
            value={examDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setExamDate(e.target.value)}
            style={{
              padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border)',
              background: 'var(--surface2)', color: 'var(--text)', fontSize: 14,
              outline: 'none', width: '100%', maxWidth: 280,
            }}
          />
        </div>

        {/* Subjects */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📚 {isAr ? 'اختر المواد' : 'Select Subjects'}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUBJECTS_LIST.map(s => {
              const sel = subjects.includes(s.key);
              return (
                <motion.button
                  key={s.key} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => toggleSubject(s.key)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                    background: sel ? 'rgba(99,102,241,0.12)' : 'var(--surface2)',
                    color: sel ? 'var(--primary)' : 'var(--text3)',
                    fontWeight: 700, fontSize: 13,
                    transition: 'all 0.15s',
                  }}
                >
                  {s.icon} {isAr ? s.ar : s.en}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Hours/day slider */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⏱️ {isAr ? `ساعات المذاكرة يومياً: ${hoursPerDay}h` : `Study Hours/Day: ${hoursPerDay}h`}
          </label>
          <input
            type="range" min={1} max={12} value={hoursPerDay}
            onChange={e => setHoursPerDay(Number(e.target.value))}
            style={{ width: '100%', maxWidth: 360, accentColor: 'var(--primary)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 360, fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>
            <span>1h</span><span>6h</span><span>12h</span>
          </div>
        </div>

        {/* Level */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🎯 {isAr ? 'مستواك الدراسي' : 'Your Level'}
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {LEVELS.map(l => {
              const sel = level === l.key;
              return (
                <button key={l.key} onClick={() => setLevel(l.key)}
                  style={{
                    flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                    background: sel ? 'rgba(99,102,241,0.1)' : 'var(--surface2)',
                    color: sel ? 'var(--primary)' : 'var(--text3)',
                    fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                  }}
                >
                  {l.icon}<br />
                  <span style={{ fontSize: 12 }}>{isAr ? l.ar : l.en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate button */}
        <motion.button
          whileHover={isValid ? { scale: 1.02 } : {}}
          whileTap={isValid ? { scale: 0.97 } : {}}
          onClick={() => { haptic.medium(); generateMutation.mutate(); }}
          disabled={!isValid || generateMutation.isPending}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14, border: 'none',
            background: isValid
              ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
              : 'var(--surface3)',
            color: isValid ? '#fff' : 'var(--text4)',
            fontWeight: 800, fontSize: 15, cursor: isValid ? 'pointer' : 'not-allowed',
            boxShadow: isValid ? '0 8px 24px rgba(99,102,241,0.3)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s',
          }}
        >
          {generateMutation.isPending
            ? <><Spinner size="sm" /> {isAr ? 'جارٍ التوليد...' : 'Generating...'}</>
            : `✨ ${isAr ? 'توليد الخطة الذكية' : 'Generate AI Study Plan'}`
          }
        </motion.button>

        {!isValid && (
          <p style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', marginTop: 8 }}>
            {isAr ? '⚠️ اختر تاريخ الامتحان ومادة واحدة على الأقل' : '⚠️ Select exam date and at least one subject'}
          </p>
        )}
      </motion.div>

      {/* ── Plan Result ── */}
      <AnimatePresence>
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-panel" style={{ padding: 28 }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              padding: '16px 20px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
              border: '1.5px solid rgba(99,102,241,0.2)',
              boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.1)',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#FFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🔮</span>
                  <span>{isAr ? 'خطة المذاكرة الذكية' : 'AI Study Plan'}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'rgba(14, 205, 168, 0.15)',
                    color: 'var(--accent2)',
                    border: '1px solid rgba(14, 205, 168, 0.3)',
                    letterSpacing: '0.05em'
                  }}>{plan.provider === 'gemini-2.0-flash' ? 'GEMINI 2.0' : 'HEURISTICS'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>📅 <strong>{plan.daysUntil}</strong> {isAr ? 'أيام' : 'days'}</span>
                  <span>⏱️ <strong>{plan.totalHours || (plan.daysUntil * (plan.hoursPerDay || 4))}h</strong> {isAr ? 'إجمالي' : 'total'}</span>
                  <span>🎯 <strong>{(plan.dailyHours || plan.hoursPerDay || 4)}h</strong>/{isAr ? 'يوم' : 'day'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {Array.isArray(plan.plan) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddToPlanner}
                    disabled={applying}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: applying ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      animation: 'pulseGlow 2s infinite'
                    }}
                  >
                    {applying ? (
                      <><Spinner size="sm" /> {isAr ? 'جاري التطبيق...' : 'Applying...'}</>
                    ) : (
                      <><span style={{ fontSize: 16 }}>📅</span> {isAr ? 'تطبيق على المخطط' : 'Apply to Planner'}</>
                    )}
                  </motion.button>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(typeof plan.plan === 'string' ? plan.plan : JSON.stringify(plan.plan, null, 2)).then(() => toast.success(isAr ? 'تم النسخ' : 'Copied!'))}
                  style={{
                    padding: '10px 14px', borderRadius: 12,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    color: 'var(--text3)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  📋 {isAr ? 'نسخ' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 450, overflowY: 'auto', paddingRight: 6 }} className="scroll-y">
              {Array.isArray(plan.plan) ? (
                plan.plan.map((day, idx) => (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{
                      padding: '16px 20px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 16,
                      border: '1px solid var(--border)',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 0 12px rgba(255,255,255,0.01)'
                    }}
                    whileHover={{ scale: 1.01, borderColor: 'rgba(99,102,241,0.3)' }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border2)',
                      paddingBottom: 10,
                      marginBottom: 14
                    }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #6366F1, #A78BFA)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textTransform: 'uppercase'
                      }}>
                        🚀 {isAr ? 'اليوم' : 'Day'} {day.day}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
                        {day.date}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(day.sessions || []).map((s, si) => {
                        let badgeBg = 'rgba(99,102,241,0.08)';
                        let badgeColor = '#818CF8';
                        let borderColor = 'rgba(99,102,241,0.2)';
                        let borderLeftStyle = '4px solid #6366F1';
                        
                        const typeLower = (s.type || '').toLowerCase();
                        if (typeLower === 'rest') {
                          badgeBg = 'rgba(14,205,168,0.08)';
                          badgeColor = '#0ECDA8';
                          borderColor = 'rgba(14,205,168,0.2)';
                          borderLeftStyle = '4px solid #0ECDA8';
                        } else if (typeLower === 'review') {
                          badgeBg = 'rgba(247,183,49,0.08)';
                          badgeColor = '#F7B731';
                          borderColor = 'rgba(247,183,49,0.2)';
                          borderLeftStyle = '4px solid #F7B731';
                        } else if (typeLower === 'practice') {
                          badgeBg = 'rgba(255,84,112,0.08)';
                          badgeColor = '#FF5470';
                          borderColor = 'rgba(255,84,112,0.2)';
                          borderLeftStyle = '4px solid #FF5470';
                        }

                        return (
                          <div
                            key={si}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              background: 'var(--surface)',
                              borderRadius: 12,
                              border: '1px solid var(--border2)',
                              borderLeft: borderLeftStyle,
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{
                              minWidth: 60,
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--text2)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(255,255,255,0.02)',
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: '1px solid var(--border2)'
                            }}>
                              <span style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase' }}>{isAr ? 'يبدأ' : 'Starts'}</span>
                              <span style={{ color: 'var(--primary-light)' }}>{s.time}</span>
                            </div>

                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>
                                {s.topic}
                              </div>
                              {s.goal && (
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span>🎯</span>
                                  <span>{s.goal}</span>
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>
                                ⏱️ {s.duration} {isAr ? 'دقيقة' : 'min'}
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 8,
                                fontSize: 10,
                                fontWeight: 800,
                                background: badgeBg,
                                color: badgeColor,
                                border: `1px solid ${borderColor}`,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em'
                              }}>
                                {isAr ? (
                                  typeLower === 'rest' ? 'استراحة' :
                                  typeLower === 'review' ? 'مراجعة' :
                                  typeLower === 'practice' ? 'تدريب' : 'دراسة'
                                ) : s.type}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div style={{ padding: '16px 20px', background: 'var(--surface2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                  <MarkdownPlan content={plan.plan} isAr={isAr} />
                </div>
              )}
            </div>

            {plan.tips?.length > 0 && (
              <div style={{
                marginTop: 20,
                padding: '16px 20px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(99,102,241,0.01))',
                borderRadius: 16,
                border: '1.5px solid rgba(99,102,241,0.15)',
                borderLeft: '4px solid var(--primary)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.05)'
              }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💡</span>
                  <span>{isAr ? 'نصائح الذكاء الاصطناعي الذكية' : 'Smart AI Tips'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {plan.tips.map((t, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: 'var(--primary-light)' }}>✨</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
