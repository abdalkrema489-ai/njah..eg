// src/components/planner/PlannerPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { plannerAPI, aiAPI } from '../../api/index';
import { Card, Button, Input, Select, Modal, Tabs, ProgressBar, EmptyState, SectionHeader, Btn, Spinner } from '../shared/UI';
import { useTranslation } from '../../i18n/index';

const SUBJECTS = [
  { value: 'mathematics',   label: '📐 Mathematics',   color: '#6C63FF' },
  { value: 'science',       label: '🔬 Science',        color: '#0ECDA8' },
  { value: 'arabic',        label: '📚 Arabic',         color: '#F7B731' },
  { value: 'english',       label: '🌐 English',        color: '#38BDF8' },
  { value: 'social_studies',label: '🌍 Social Studies', color: '#FF5470' },
];

const STATUS_COLORS = {
  planned:     { bg: 'rgba(108,99,255,0.12)', color: '#9D96FF', label: 'Planned' },
  in_progress: { bg: 'rgba(247,183,49,0.12)', color: '#F7B731', label: 'In Progress' },
  completed:   { bg: 'rgba(14,205,168,0.12)', color: '#0ECDA8', label: 'Completed' },
  skipped:     { bg: 'rgba(255,84,112,0.12)', color: '#FF5470', label: 'Skipped' },
};

// ── Add Session Modal ──
function AddSessionModal({ open, onClose, onSaved }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  
  const SUBJECTS = [
    { value: 'mathematics',   label: isAr ? '📐 الرياضيات' : '📐 Mathematics',   color: '#6C63FF' },
    { value: 'science',       label: isAr ? '🔬 العلوم' : '🔬 Science',        color: '#0ECDA8' },
    { value: 'arabic',        label: isAr ? '📚 اللغة العربية' : '📚 Arabic',         color: '#F7B731' },
    { value: 'english',       label: isAr ? '🌐 اللغة الإنجليزية' : '🌐 English',        color: '#38BDF8' },
    { value: 'social_studies',label: isAr ? '🌍 الدراسات الاجتماعية' : '🌍 Social Studies', color: '#FF5470' },
  ];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { subject: 'mathematics', topic: '', start_time: '', end_time: '', notes: '' }
  });

  const onSubmit = async (data) => {
    await plannerAPI.createSession(data);
    toast.success('✅ Session added!');
    reset();
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isAr ? "📅 إضافة جلسة دراسية" : "📅 Add Study Session"}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label={isAr ? "المادة" : "Subject"} {...register('subject', { required: true })}>
          {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Input label={isAr ? "الموضوع (اختياري)" : "Topic (optional)"} placeholder={isAr ? "مثال: الفصل الثالث - الكسور" : "e.g. Chapter 3 — Fractions"} {...register('topic')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label={isAr ? "وقت البدء" : "Start Time"} type="datetime-local" error={errors.start_time?.message}
            {...register('start_time', { required: isAr ? 'وقت البدء مطلوب' : 'Start time required' })} />
          <Input label={isAr ? "وقت الانتهاء" : "End Time"} type="datetime-local" error={errors.end_time?.message}
            {...register('end_time', { required: isAr ? 'وقت الانتهاء مطلوب' : 'End time required' })} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>{isAr ? "ملاحظات" : "Notes"}</label>
          <textarea {...register('notes')} placeholder={isAr ? "أي ملاحظات أو أهداف لهذه الجلسة..." : "Any notes or goals for this session..."}
            style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 8,
              minHeight: 80, resize: 'vertical', border: '1px solid var(--border2)',
              background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button type="button" onClick={onClose}>{isAr ? "إلغاء" : "Cancel"}</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>{isAr ? "إضافة جلسة ←" : "Add Session →"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Weekly View ──
function WeeklyView({ sessions, onStatusChange, onDelete }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDay, setSelectedDay] = useState(new Date());

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dayHasSessions = (day) =>
    sessions.some(s => isSameDay(parseISO(s.start_time), day));

  const selectedSessions = sessions.filter(s =>
    isSameDay(parseISO(s.start_time), selectedDay)
  ).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button size="sm" onClick={() => setWeekStart(d => addDays(d, -7))}>{isAr ? '← السابق' : '← Prev'}</Button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 14 }}>
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <Button size="sm" onClick={() => setWeekStart(d => addDays(d, 7))}>{isAr ? 'التالي →' : 'Next →'}</Button>
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 20 }}>
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDay);
          const hasSessions = dayHasSessions(day);

          return (
            <motion.div key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              whileHover={{ scale: 1.05, y: -4 }} 
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '16px 8px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
                border: '1.5px solid',
                background: isSelected 
                  ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' 
                  : isToday ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                borderColor: isSelected 
                  ? 'transparent' 
                  : isToday ? '#6366F1' : 'rgba(255,255,255,0.05)',
                boxShadow: isSelected ? '0 8px 24px rgba(99,102,241,0.3)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {isToday && !isSelected && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                }} />
              )}
              <div style={{ 
                fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-head)',
                color: isSelected ? '#fff' : isToday ? 'var(--primary-light)' : 'var(--text)',
                letterSpacing: '-0.02em'
              }}>{format(day, 'd')}</div>
              <div style={{ 
                fontSize: 10, fontWeight: 800, 
                color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text3)',
                marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' 
              }}>{format(day, 'EEE')}</div>
              {hasSessions && (
                <span style={{ 
                  display: 'block', width: 6, height: 6, borderRadius: '50%', margin: '8px auto 0',
                  background: isSelected ? '#fff' : '#6366F1', 
                  boxShadow: isSelected ? '0 0 8px #fff' : '0 0 10px #6366F1',
                }} />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Selected day sessions */}
      <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>
        {format(selectedDay, 'EEEE, MMMM d')}
        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text3)' }}>
          {selectedSessions.length} {isAr ? 'جلسات' : `session${selectedSessions.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <AnimatePresence>
        {selectedSessions.length === 0 ? (
          <EmptyState icon="📅" title={isAr ? "لا توجد جلسات في هذا اليوم" : "No sessions this day"} subtitle={isAr ? "انقر على 'إضافة جلسة' لتخطيط وقت دراستك" : "Click 'Add Session' to plan your study time"} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedSessions.map(s => {
              const SUBJECTS_LOC = [
                { value: 'mathematics',   label: isAr ? '📐 الرياضيات' : '📐 Mathematics',   color: '#6C63FF' },
                { value: 'science',       label: isAr ? '🔬 العلوم' : '🔬 Science',        color: '#0ECDA8' },
                { value: 'arabic',        label: isAr ? '📚 اللغة العربية' : '📚 Arabic',         color: '#F7B731' },
                { value: 'english',       label: isAr ? '🌐 اللغة الإنجليزية' : '🌐 English',        color: '#38BDF8' },
                { value: 'social_studies',label: isAr ? '🌍 الدراسات الاجتماعية' : '🌍 Social Studies', color: '#FF5470' },
              ];
              const subj = SUBJECTS_LOC.find(x => x.value === s.subject);
              const STATUS_COLORS_LOC = {
                planned:     { bg: 'rgba(108,99,255,0.12)', color: '#9D96FF', label: isAr ? 'مخطط' : 'Planned' },
                in_progress: { bg: 'rgba(247,183,49,0.12)', color: '#F7B731', label: isAr ? 'قيد التنفيذ' : 'In Progress' },
                completed:   { bg: 'rgba(14,205,168,0.12)', color: '#0ECDA8', label: isAr ? 'مكتمل' : 'Completed' },
                skipped:     { bg: 'rgba(255,84,112,0.12)', color: '#FF5470', label: isAr ? 'تم التخطي' : 'Skipped' },
              };
              const st = STATUS_COLORS_LOC[s.status] || STATUS_COLORS_LOC.planned;
              return (
                <motion.div key={s.id} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ scale: 1.01, x: 4, borderColor: `${subj?.color || 'var(--primary)'}60` }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
                    border: '1.5px solid var(--border)',
                    borderLeft: `4px solid ${subj?.color || 'var(--primary)'}`,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* Left Column: Icon/Subject badge */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `${subj?.color || 'var(--primary)'}12`,
                    border: `1px solid ${subj?.color || 'var(--primary)'}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0
                  }}>
                    {subj?.label?.split(' ')[0] || '📚'}
                  </div>

                  {/* Middle Column: Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', textTransform: 'capitalize' }}>
                        {s.topic || (isAr ? 'حصة دراسية' : 'Study Session')}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: `${subj?.color || 'var(--primary)'}18`,
                        color: subj?.color || 'var(--primary-light)',
                        border: `1.5px solid ${subj?.color || 'var(--primary)'}25`,
                        textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        {isAr ? subj?.label?.split(' ')[1] : subj?.value}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        🕒 {format(parseISO(s.start_time), 'hh:mm a')} – {format(parseISO(s.end_time), 'hh:mm a')}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        ⏱️ {s.duration} {isAr ? 'دقيقة' : 'mins'}
                      </span>
                    </div>
                    {s.notes && (
                      <div style={{ 
                        fontSize: 12, color: 'var(--text4)', marginTop: 8, 
                        padding: '6px 12px', background: 'rgba(255,255,255,0.01)',
                        borderLeft: '2px solid rgba(255,255,255,0.1)', borderRadius: 4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        💡 {s.notes}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status Select + Delete Button */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={s.status}
                        onChange={e => onStatusChange(s.id, e.target.value)}
                        style={{ 
                          padding: '6px 12px', fontSize: 12, borderRadius: 10,
                          background: st.bg, color: st.color, border: `1.5px solid ${st.color}35`,
                          fontWeight: 700, cursor: 'pointer', outline: 'none',
                          appearance: 'none', WebkitAppearance: 'none',
                          paddingRight: 24, textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        {Object.entries(STATUS_COLORS_LOC).map(([k, v]) => (
                          <option key={k} value={k} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{v.label}</option>
                        ))}
                      </select>
                      <span style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 8, color: st.color, pointerEvents: 'none'
                      }}>▼</span>
                    </div>
                    
                    <motion.button 
                      whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.15)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onDelete(s.id)}
                      style={{
                        width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)', color: '#EF4444',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, transition: 'all 0.2s'
                      }}
                    >
                      🗑️
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple Markdown Renderer
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

// ── AI Schedule Tab ──
function AIScheduleTab() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const { register, handleSubmit } = useForm({
    defaultValues: { subject: 'mathematics', deadline: '', dailyHours: 2, currentLevel: 'intermediate' }
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const qc = useQueryClient();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await aiAPI.studyPlan({ ...data, language: isAr ? 'ar' : 'en' });
      setPlan(res.data);
      toast.success(isAr ? '✨ تم توليد خطة المذاكرة بالذكاء الاصطناعي!' : '✨ AI study plan generated!');
    } catch {
      toast.error(isAr ? 'فشل توليد الخطة' : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  const applySessions = async () => {
    if (!plan || !Array.isArray(plan.plan)) return;
    setApplying(true);
    try {
      const sessions = [];
      plan.plan.forEach((day) => {
        const dayOffset = parseInt(day.day) || 1;
        let dateObj = new Date();
        if (day.date) {
          const cleanDate = day.date.replace(/\//g, '-');
          const match = cleanDate.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            dateObj = new Date(cleanDate);
          } else {
            const parsed = new Date(day.date);
            if (!isNaN(parsed.getTime())) {
              dateObj = parsed;
            } else {
              dateObj.setDate(dateObj.getDate() + dayOffset);
            }
          }
        } else {
          dateObj.setDate(dateObj.getDate() + dayOffset);
        }

        (day.sessions || []).forEach((s, si) => {
          if (s.type === 'rest') return;
          
          let hour = 9 + (si * 2);
          let minute = 0;
          if (s.time) {
            const timeStr = String(s.time).trim();
            const match = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (match) {
              hour = parseInt(match[1], 10);
              minute = parseInt(match[2], 10);
              if (timeStr.toLowerCase().includes('pm') && hour < 12) {
                hour += 12;
              } else if (timeStr.toLowerCase().includes('am') && hour === 12) {
                hour = 0;
              }
            }
          }

          const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hour, minute, 0);
          const end = new Date(start.getTime() + (parseInt(s.duration) || 60) * 60000);

          sessions.push({
            subject: plan.subject || plan.subjects?.[0] || 'mathematics',
            topic: s.topic || 'Study Session',
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            notes: s.goal || '',
          });
        });
      });

      let successCount = 0;
      let skippedCount = 0;
      const skippedDetails = [];

      for (const s of sessions) {
        try {
          await plannerAPI.createSession(s);
          successCount++;
        } catch (err) {
          if (err.response?.status === 409) {
            skippedCount++;
            skippedDetails.push(s.topic || s.subject);
          } else {
            // Non-conflict error (network, validation) — log but continue
            console.error('Session creation failed:', err.message);
            skippedCount++;
          }
        }
      }

      qc.invalidateQueries(['sessions']);

      if (successCount > 0 && skippedCount === 0) {
        toast.success(isAr ? `📅 تم إضافة ${successCount} جلسات دراسية إلى المخطط!` : `📅 ${successCount} sessions added to your planner!`);
      } else if (successCount > 0 && skippedCount > 0) {
        toast.success(isAr
          ? `📅 تم إضافة ${successCount} جلسة، وتم تجاوز ${skippedCount} بسبب تعارض في المواعيد`
          : `📅 ${successCount} sessions added, ${skippedCount} skipped due to time conflicts`,
          { duration: 5000 });
      } else {
        toast.error(isAr ? 'فشلت إضافة جميع الجلسات بسبب تعارضات في المواعيد' : 'All sessions failed due to schedule conflicts');
      }
    } catch (err) {
      toast.error(isAr ? 'فشل إضافة الجلسات للمخطط' : 'Failed to apply sessions');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="floating-panel" style={{ padding: 28 }}>
        <h3 style={{ fontSize: 17, fontWeight: 900, fontFamily: 'var(--font-head)', marginBottom: 20 }}>
          {isAr ? '🤖 إنشاء جدول دراسي بالذكاء الاصطناعي' : '🤖 Generate AI Study Schedule'}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Select label={isAr ? "المادة" : "Subject"} {...register('subject')}>
            {[
              { value: 'mathematics',   label: isAr ? '📐 الرياضيات' : '📐 Mathematics' },
              { value: 'science',       label: isAr ? '🔬 العلوم' : '🔬 Science' },
              { value: 'arabic',        label: isAr ? '📚 اللغة العربية' : '📚 Arabic' },
              { value: 'english',       label: isAr ? '🌐 اللغة الإنجليزية' : '🌐 English' },
              { value: 'social_studies',label: isAr ? '🌍 الدراسات الاجتماعية' : '🌍 Social Studies' },
            ].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Input label={isAr ? "تاريخ الامتحان" : "Exam Deadline"} type="date" {...register('deadline', { required: true })} />
          <Select label={isAr ? "ساعات الدراسة اليومية" : "Daily Study Hours"} {...register('dailyHours')}>
            {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h} {isAr ? 'ساعات' : `hour${h>1?'s':''}`}</option>)}
          </Select>
          <Select label={isAr ? "المستوى الحالي" : "Current Level"} {...register('currentLevel')}>
            <option value="beginner">{isAr ? 'مبتدئ' : 'Beginner'}</option>
            <option value="intermediate">{isAr ? 'متوسط' : 'Intermediate'}</option>
            <option value="advanced">{isAr ? 'متقدم' : 'Advanced'}</option>
          </Select>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ gridColumn: '1/-1', padding: '12px', fontSize: 15, fontWeight: 800 }}
          >
            {loading ? (isAr ? '✨ جاري الإنشاء...' : '✨ Generating...') : (isAr ? '✨ إنشاء الخطة' : '✨ Generate AI Plan')}
          </motion.button>
        </form>
      </div>

      {plan && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card glow>
            {/* Header section with futuristic design */}
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
                  <span>⏱️ <strong>{plan.totalHours || (plan.daysUntil * (plan.hoursPerDay || 2))}h</strong> {isAr ? 'إجمالي' : 'total'}</span>
                  <span>🎯 <strong>{(plan.dailyHours || plan.hoursPerDay || 2)}h</strong>/{isAr ? 'يوم' : 'day'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {Array.isArray(plan.plan) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={applySessions}
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

            {/* Plan Display Area */}
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
                    {/* Day Header */}
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

                    {/* Day's Sessions */}
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

            {/* AI Tips Section */}
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
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ── Main Planner Page ──
export default function PlannerPage() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('weekly');
  const [addOpen, setAddOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => plannerAPI.getSessions({
      start: new Date(Date.now() - 30 * 86400000).toISOString(),
      end:   new Date(Date.now() + 60 * 86400000).toISOString(),
    }),
  });
  const sessions = data?.data?.sessions || [];

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => plannerAPI.updateSession(id, { status }),
    onSuccess: () => { qc.invalidateQueries(['sessions']); toast.success('Status updated'); },
  });

  const { mutate: deleteSession } = useMutation({
    mutationFn: plannerAPI.deleteSession,
    onSuccess: () => { qc.invalidateQueries(['sessions']); toast.success('Session deleted'); },
  });

  const completed = sessions.filter(s => s.status === 'completed').length;
  const totalMinutes = sessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.duration || 0), 0);

  const TABS = [
    { key: 'weekly', label: isAr ? 'العرض الأسبوعي' : 'Weekly View', icon: '📅' },
    { key: 'ai',     label: isAr ? 'جدول الذكاء الاصطناعي' : 'AI Schedule', icon: '🤖' },
  ];

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-head)', marginBottom: 4 }}>📅 {isAr ? 'مخطط الدراسة' : 'Study Planner'}</h2>
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>{isAr ? 'خطط، تتبع، وحسن جلساتك الدراسية' : 'Plan, track, and optimise your study sessions'}</p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>{isAr ? '+ إضافة جلسة' : '+ Add Session'}</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: isAr ? 'إجمالي الجلسات' : 'Total Sessions', value: sessions.length, icon: '📅', color: '#6366F1' },
          { label: isAr ? 'مكتمل' : 'Completed',      value: completed,       icon: '✨', color: '#10B981' },
          { label: isAr ? 'ساعات الدراسة' : 'Hours Studied',  value: `${Math.round(totalMinutes/60)}h`, icon: '💎', color: '#F59E0B' },
        ].map(s => (
          <motion.div 
            key={s.label} 
            whileHover={{ y: -4, scale: 1.02, boxShadow: `0 12px 30px ${s.color}15` }}
            className="floating-panel" 
            style={{ 
              padding: '22px 24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 18,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${s.color}`,
              borderRadius: 18,
              boxShadow: '0 8px 32px 0 rgba(0,0,0,0.15)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.3s ease'
            }}
          >
            {/* Glowing background accent */}
            <div style={{
              position: 'absolute', top: '-50%', right: '-20%',
              width: 100, height: 100, borderRadius: '50%',
              background: s.color, filter: 'blur(45px)', opacity: 0.1,
              pointerEvents: 'none'
            }} />
            
            <div style={{ 
              width: 52, height: 52, borderRadius: 16, 
              background: `${s.color}18`, 
              border: `1.5px solid ${s.color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: 26,
              boxShadow: `inset 0 0 10px ${s.color}10`
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-head)', color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'weekly' && (
        <div className="floating-panel" style={{ padding: 28 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 16 }} />)}
            </div>
          ) : (
            <WeeklyView
              sessions={sessions}
              onStatusChange={(id, status) => updateStatus({ id, status })}
              onDelete={(id) => { if (window.confirm('Delete this session?')) deleteSession(id); }}
            />
          )}
        </div>
      )}

      {activeTab === 'ai' && <AIScheduleTab />}

      <AddSessionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => qc.invalidateQueries(['sessions'])}
      />
    </div>
  );
}
