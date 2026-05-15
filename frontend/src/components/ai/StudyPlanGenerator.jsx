// src/components/ai/StudyPlanGenerator.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import client from '../../api/index';
import { Spinner } from '../shared/UI';

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
  // Simple markdown renderer for the plan
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

  const [examDate, setExamDate]       = useState('');
  const [subjects, setSubjects]       = useState([]);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [level, setLevel]             = useState('intermediate');
  const [plan, setPlan]               = useState(null);

  const toggleSubject = (key) =>
    setSubjects(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key]);

  const generateMutation = useMutation({
    mutationFn: () => client.post('/ai/study-plan', {
      examDate, subjects, hoursPerDay, level,
    }).then(r => r.data),
    onSuccess: (data) => {
      setPlan(data.plan || data.content || data.response || JSON.stringify(data));
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || (isAr ? 'فشل توليد الخطة' : 'Failed to generate plan'));
    },
  });

  const handleAddToPlanner = async () => {
    if (!plan) return;
    // Navigate to planner with a hint
    navigate('/planner', { state: { fromPlan: true, plan } });
    toast.success(isAr ? 'تم نقلك للمخطط، يمكنك إضافة الجلسات يدوياً' : 'Redirected to planner — add sessions manually');
  };

  const isValid = examDate && subjects.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, margin: '0 auto' }}>

      {/* ── Config Panel ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel" style={{ padding: 28 }}>

        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 24, color: 'var(--text)' }}>
          📅 {isAr ? 'توليد خطة مذاكرة ذكية' : 'Generate AI Study Plan'}
        </h3>

        {/* Exam date */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📆 {isAr ? 'تاريخ الامتحان' : 'Exam Date'}
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
          onClick={() => generateMutation.mutate()}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                📋 {isAr ? 'خطتك الدراسية المُولَّدة' : 'Your Generated Study Plan'}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={handleAddToPlanner}
                  style={{
                    padding: '9px 18px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  📅 {isAr ? 'أضف للمخطط' : 'Add to Planner'}
                </motion.button>
                <button
                  onClick={() => navigator.clipboard.writeText(plan).then(() => toast.success(isAr ? 'تم النسخ' : 'Copied!'))}
                  style={{
                    padding: '9px 14px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    color: 'var(--text3)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  📋 {isAr ? 'نسخ' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{
              padding: 20, borderRadius: 14, background: 'var(--surface2)',
              border: '1px solid var(--border)', maxHeight: 500, overflowY: 'auto',
            }}>
              <MarkdownPlan content={plan} isAr={isAr} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
