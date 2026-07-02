// src/components/planner/PlannerPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay, parseISO, addMinutes } from 'date-fns';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { plannerAPI } from '../../api/index';
import { Card, Button, Input, Select, Modal, Tabs, EmptyState, Skeleton } from '../shared/UI';
import { useTranslation } from '../../i18n/index';
import StudyPlanGenerator from './StudyPlanGenerator';
import PomodoroTimer from './PomodoroTimer';
import PlannerAnalytics from './PlannerAnalytics';

const SUBJECTS_LIST = [
  { value: 'mathematics',    label: '📐 Mathematics',     color: '#6366F1' },
  { value: 'science',        label: '🔬 Science',         color: '#10B981' },
  { value: 'physics',        label: '⚛️ Physics',         color: '#06B6D4' },
  { value: 'chemistry',      label: '🧪 Chemistry',       color: '#EC4899' },
  { value: 'biology',        label: '🧬 Biology',         color: '#10B981' },
  { value: 'arabic',         label: '📚 Arabic',          color: '#F59E0B' },
  { value: 'english',        label: '🌐 English',          color: '#3B82F6' },
  { value: 'social_studies', label: '🌍 Social Studies',  color: '#EF4444' },
  { value: 'islamic_studies',label: '🕌 Islamic Studies', color: '#059669' },
];

const STATUS_COLORS = {
  planned:     { bg: 'rgba(108,99,255,0.12)', color: '#9D96FF', label: 'Planned' },
  in_progress: { bg: 'rgba(247,183,49,0.12)', color: '#F7B731', label: 'In Progress' },
  completed:   { bg: 'rgba(14,205,168,0.12)', color: '#0ECDA8', label: 'Completed' },
  skipped:     { bg: 'rgba(255,84,112,0.12)', color: '#FF5470', label: 'Skipped' },
};

// ── Add/Edit Session Modal ──
function AddSessionModal({ open, onClose, onSaved, onDelete, prefilledDate, editingSession }) {
  const { lang, t } = useTranslation();
  const isAr = lang === 'ar';

  const SUBJECTS_LOC = [
    { value: 'mathematics',    label: isAr ? '📐 الرياضيات' : '📐 Mathematics',     color: '#6366F1' },
    { value: 'science',        label: isAr ? '🔬 العلوم' : '🔬 Science',         color: '#10B981' },
    { value: 'physics',        label: isAr ? '⚛️ الفيزياء' : '⚛️ Physics',         color: '#06B6D4' },
    { value: 'chemistry',      label: isAr ? '🧪 الكيمياء' : '🧪 Chemistry',       color: '#EC4899' },
    { value: 'biology',        label: isAr ? '🧬 الأحياء' : '🧬 Biology',         color: '#10B981' },
    { value: 'arabic',         label: isAr ? '📚 اللغة العربية' : '📚 Arabic',     color: '#F59E0B' },
    { value: 'english',        label: isAr ? '🌐 اللغة الإنجليزية' : '🌐 English',   color: '#3B82F6' },
    { value: 'social_studies', label: isAr ? '🌍 الدراسات الاجتماعية' : '🌍 Social Studies',  color: '#EF4444' },
    { value: 'islamic_studies',label: isAr ? '🕌 التربية الإسلامية' : '🕌 Islamic Studies', color: '#059669' },
  ];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      subject: 'mathematics',
      topic: '',
      start_time: '',
      end_time: '',
      notes: '',
      repeat: 'none',
      reminder_minutes: 0,
      color_override: '',
    }
  });

  const selectedSubject = watch('subject');
  const selectedColor = watch('color_override');
  const watchStart = watch('start_time');
  const watchEnd = watch('end_time');

  const liveDurationText = () => {
    if (!watchStart || !watchEnd) return '';
    const diff = Math.round((new Date(watchEnd) - new Date(watchStart)) / 60000);
    if (isNaN(diff) || diff <= 0) return isAr ? 'وقت غير صالح' : 'Invalid duration';
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  useEffect(() => {
    if (open) {
      if (editingSession) {
        reset({
          subject: editingSession.subject,
          topic: editingSession.topic || '',
          start_time: editingSession.start_time ? format(parseISO(editingSession.start_time), "yyyy-MM-dd'T'HH:mm") : '',
          end_time: editingSession.end_time ? format(parseISO(editingSession.end_time), "yyyy-MM-dd'T'HH:mm") : '',
          notes: editingSession.notes || '',
          repeat: editingSession.repeat || 'none',
          reminder_minutes: editingSession.reminder_minutes || 0,
          color_override: editingSession.color_override || '',
        });
      } else if (prefilledDate) {
        reset({
          subject: 'mathematics',
          topic: '',
          start_time: format(prefilledDate, "yyyy-MM-dd'T'HH:mm"),
          end_time: format(addMinutes(prefilledDate, 60), "yyyy-MM-dd'T'HH:mm"),
          notes: '',
          repeat: 'none',
          reminder_minutes: 0,
          color_override: '',
        });
      } else {
        reset({
          subject: 'mathematics',
          topic: '',
          start_time: '',
          end_time: '',
          notes: '',
          repeat: 'none',
          reminder_minutes: 0,
          color_override: '',
        });
      }
    }
  }, [open, prefilledDate, editingSession, reset]);

  const onSubmit = async (data) => {
    if (new Date(data.end_time) <= new Date(data.start_time)) {
      toast.error(isAr ? 'يجب أن يكون وقت الانتهاء بعد وقت البدء' : 'End time must be after start time');
      return;
    }

    try {
      if (editingSession) {
        await plannerAPI.updateSession(editingSession.id, data);
        toast.success(isAr ? 'تم تعديل الجلسة' : 'Session updated successfully');
      } else {
        // If repeat is set, loop frontend POST requests
        if (data.repeat && data.repeat !== 'none') {
          let count = 1;
          if (data.repeat === 'daily') count = 7;
          else if (data.repeat === 'weekly') count = 4;
          else if (data.repeat === 'weekdays') count = 5;

          const startBase = new Date(data.start_time);
          const endBase = new Date(data.end_time);

          for (let i = 0; i < count; i++) {
            let offsetDays = 0;
            if (data.repeat === 'daily') {
              offsetDays = i;
            } else if (data.repeat === 'weekly') {
              offsetDays = i * 7;
            } else if (data.repeat === 'weekdays') {
              // Add offset, skipping weekends if needed (simple weekday addition)
              let tempDate = new Date(startBase);
              let added = 0;
              while (added < i) {
                tempDate.setDate(tempDate.getDate() + 1);
                if (tempDate.getDay() !== 5 && tempDate.getDay() !== 6) {
                  added++;
                }
              }
              offsetDays = Math.round((tempDate - startBase) / 86400000);
            }

            const nextStart = new Date(startBase.getTime() + offsetDays * 86400000).toISOString();
            const nextEnd = new Date(endBase.getTime() + offsetDays * 86400000).toISOString();

            await plannerAPI.createSession({
              ...data,
              start_time: nextStart,
              end_time: nextEnd,
            });
          }
          toast.success(isAr ? 'تمت إضافة الجلسات المتكررة بنجاح' : 'Repeated sessions created successfully');
        } else {
          await plannerAPI.createSession(data);
          toast.success(t('toast.sessionAdded'));
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(err.response.data.error || (isAr ? 'تعارض في المواعيد' : 'Scheduling conflict'));
      } else {
        toast.error(isAr ? 'فشل الحفظ' : 'Failed to save');
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editingSession ? (isAr ? '✏️ تعديل جلسة دراسية' : '✏️ Edit Study Session') : (isAr ? '📅 إضافة جلسة دراسية' : '📅 Add Study Session')}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        
        {/* Subject emoji select grid */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8, fontWeight: 700 }}>
            {isAr ? 'اختر المادة' : 'Select Subject'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {SUBJECTS_LOC.map(s => {
              const isSelected = selectedSubject === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setValue('subject', s.value)}
                  style={{
                    padding: '8px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: isSelected ? `${s.color}20` : 'var(--surface2)',
                    border: `1.5px solid ${isSelected ? s.color : 'var(--border)'}`,
                    color: 'var(--text)',
                    textAlign: 'center',
                    transition: 'all 0.15s'
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input label={isAr ? "الموضوع (اختياري)" : "Topic (optional)"} placeholder={isAr ? "مثال: الفصل الثالث - الكسور" : "e.g. Chapter 3 — Fractions"} {...register('topic')} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label={isAr ? "وقت البدء" : "Start Time"} type="datetime-local" error={errors.start_time?.message}
            {...register('start_time', { required: isAr ? 'وقت البدء مطلوب' : 'Start time required' })} />
          <Input label={isAr ? "وقت الانتهاء" : "End Time"} type="datetime-local" error={errors.end_time?.message}
            {...register('end_time', { required: isAr ? 'وقت الانتهاء مطلوب' : 'End time required' })} />
        </div>

        {/* Live Duration display */}
        {liveDurationText() && (
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-light)', marginTop: -6 }}>
            ⏱️ {isAr ? 'المدة:' : 'Duration:'} {liveDurationText()}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label={isAr ? "تكرار" : "Repeat"} {...register('repeat')}>
            <option value="none">{isAr ? 'لا يوجد' : 'None'}</option>
            <option value="daily">{isAr ? 'يومياً' : 'Daily'}</option>
            <option value="weekly">{isAr ? 'أسبوعياً' : 'Weekly'}</option>
            <option value="weekdays">{isAr ? 'أيام العمل' : 'Weekdays'}</option>
          </Select>

          <Select label={isAr ? "تنبيه" : "Reminder"} {...register('reminder_minutes')}>
            <option value={0}>{isAr ? 'لا يوجد تنبيه' : 'No Reminder'}</option>
            <option value={5}>{isAr ? 'قبل 5 دقائق' : '5 mins before'}</option>
            <option value={10}>{isAr ? 'قبل 10 دقائق' : '10 mins before'}</option>
            <option value={30}>{isAr ? 'قبل 30 دقيقة' : '30 mins before'}</option>
          </Select>
        </div>

        {/* Color override picker */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6, fontWeight: 700 }}>
            {isAr ? 'تخصيص اللون' : 'Custom Color Accent'}
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map(color => {
              const isSelected = selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color_override', color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: color || '#888',
                    border: isSelected ? '2px solid #fff' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10
                  }}
                >
                  {!color && '✕'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>{isAr ? "ملاحظات" : "Notes"}</label>
          <textarea {...register('notes')} placeholder={isAr ? "أي ملاحظات أو أهداف لهذه الجلسة..." : "Any notes or goals for this session..."}
            style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 8,
              minHeight: 80, resize: 'vertical', border: '1px solid var(--border2)',
              background: 'var(--surface)', color: 'var(--text)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          {editingSession && onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الجلسة؟' : 'Are you sure you want to delete this session?')) {
                  onDelete(editingSession.id);
                  onClose();
                }
              }}
              style={{ marginRight: 'auto' }}
            >
              {isAr ? 'حذف' : 'Delete'}
            </Button>
          )}
          <Button type="button" onClick={onClose}>{isAr ? "إلغاء" : "Cancel"}</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {editingSession ? (isAr ? "تعديل الجلسة ←" : "Update Session →") : (isAr ? "إضافة جلسة ←" : "Add Session →")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Draggable Session Block ──
function DraggableSession({ session, onClick, isAr }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined;

  const subj = SUBJECTS_LIST.find(x => x.value === session.subject);
  const color = session.color_override || subj?.color || '#6366F1';

  // Calculate layout vertical coordinates: 1px = 1min
  // Offset from 06:00
  const dateObj = parseISO(session.start_time);
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const top = (hours * 60 + minutes) - 360;
  const height = session.duration || 60;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: '4px',
        right: '4px',
        height: `${height}px`,
        background: `linear-gradient(135deg, ${color}22, ${color}12)`,
        border: `1.5px solid ${color}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 8,
        padding: '6px 8px',
        fontSize: 11,
        color: '#fff',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: isDragging ? 0.6 : 1,
        ...style
      }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Prevent click trigger during drag finish
        e.stopPropagation();
        onClick(session);
      }}
    >
      <div style={{ fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {session.topic || (isAr ? 'جلسة دراسية' : 'Study Session')}
      </div>
      <div style={{ opacity: 0.8, fontSize: 9 }}>
        {format(dateObj, 'hh:mm a')} ({session.duration}m)
      </div>
    </div>
  );
}

// ── Droppable Day Column ──
function DroppableDayColumn({ day, index, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${index}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        height: '1440px', // 24 hours * 60px/hour
        background: isOver ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
        borderRight: '1px solid rgba(255, 255, 255, 0.03)',
        transition: 'background-color 0.2s',
      }}
    >
      {children}
    </div>
  );
}

// ── Weekly View ──
function WeeklyView({ sessions, onUpdateSession, onAddPrefilled, onSessionClick }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollContainerRef = useRef(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Today line updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Initial scroll to 06:00 (360px offset)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 360;
    }
  }, [weekStart]);

  // Handle mobile responsive collapsing to single-day
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileDayIdx, setMobileDayIdx] = useState(new Date().getDay());

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drag and drop drop handler
  const handleDragEnd = (event) => {
    const { active, over, delta } = event;
    if (!over) return;

    const sessionId = active.id;
    const destinationCol = over.id; // e.g. "day-3"
    const colIdx = parseInt(destinationCol.replace('day-', ''));
    if (isNaN(colIdx)) return;

    const originalSession = sessions.find(s => s.id === sessionId);
    if (!originalSession) return;

    // Day offset change
    const originalStart = parseISO(originalSession.start_time);
    const originalEnd = parseISO(originalSession.end_time);

    // Calculate columns delta
    const destDay = days[colIdx];
    const dayDiff = Math.round((destDay - startOfWeek(originalStart, { weekStartsOn: 0 })) / 86400000) - originalStart.getDay();
    
    // Calculate vertical time delta: 1px = 1 minute
    const minutesDelta = Math.round(delta.y);

    let newStart = addDays(originalStart, dayDiff);
    newStart = addMinutes(newStart, minutesDelta);

    let newEnd = addDays(originalEnd, dayDiff);
    newEnd = addMinutes(newEnd, minutesDelta);

    onUpdateSession(sessionId, {
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString()
    });
  };

  const handleEmptySpaceClick = (day, clickY) => {
    // clickY is pixels from top. 1px = 1min.
    // Calculate hour and minute
    const totalMinutes = clickY;
    const hour = Math.floor(totalMinutes / 60);
    const minute = Math.floor((totalMinutes % 60) / 15) * 15; // round to nearest 15 mins

    const targetDate = new Date(day);
    targetDate.setHours(hour, minute, 0, 0);
    onAddPrefilled(targetDate);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div>
        {/* Week navigation / Mobile Day Strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <Button size="sm" onClick={() => setWeekStart(d => addDays(d, -7))}>{isAr ? '← السابق' : '← Prev'}</Button>
          <span style={{ textAlign: 'center', fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-head)' }}>
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Button size="sm" onClick={() => setWeekStart(d => addDays(d, 7))}>{isAr ? 'التالي →' : 'Next →'}</Button>
        </div>

        {/* Mobile View Day Selector */}
        {isMobile && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 6 }}>
            {days.map((day, i) => {
              const active = mobileDayIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => setMobileDayIdx(i)}
                  style={{
                    flex: 1,
                    minWidth: 50,
                    padding: '8px',
                    borderRadius: 12,
                    background: active ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'var(--surface2)',
                    color: active ? '#fff' : 'var(--text3)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    textAlign: 'center'
                  }}
                >
                  <div>{format(day, 'EEE')}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, marginTop: 2 }}>{format(day, 'd')}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* 24-Hour Time block Visual Calendar Container */}
        <div
          ref={scrollContainerRef}
          style={{
            maxHeight: '70vh',
            overflowY: 'auto',
            position: 'relative',
            border: '1.5px solid var(--border)',
            borderRadius: 18,
            background: 'var(--surface2)',
          }}
        >
          {/* Scrollable content wrapping Timeline + Columns */}
          <div style={{ display: 'flex', position: 'relative', height: '1440px' }}>
            
            {/* Timeline Rule column on the left */}
            <div style={{ width: 60, borderRight: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, position: 'relative', background: 'var(--surface)' }}>
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  style={{
                    height: 60,
                    fontSize: 10,
                    color: 'var(--text4)',
                    padding: '4px',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    fontWeight: 700
                  }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Grid Columns */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(7, 1fr)', position: 'relative' }}>
              
              {days.map((day, dIdx) => {
                // In mobile, skip columns except the selected one
                if (isMobile && dIdx !== mobileDayIdx) return null;

                const daySessions = sessions.filter(s => isSameDay(parseISO(s.start_time), day));
                const isToday = isSameDay(day, new Date());

                return (
                  <div key={dIdx} style={{ position: 'relative', height: '100%' }}>
                    
                    {/* Header line for each day in grid */}
                    <div style={{
                      position: 'sticky', top: 0, background: 'var(--surface3)',
                      borderBottom: '1.5px solid var(--border)', zIndex: 10,
                      padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 900,
                      color: isToday ? 'var(--primary-light)' : 'var(--text2)',
                    }}>
                      {format(day, 'EEE d')}
                    </div>

                    {/* Droppable wrapper */}
                    <DroppableDayColumn day={day} index={dIdx}>
                      
                      {/* Clickable Empty Grid Slots */}
                      <div
                        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickY = e.clientY - rect.top;
                          handleEmptySpaceClick(day, clickY);
                        }}
                      />

                      {/* Sessions blocks */}
                      <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>
                        {daySessions.map(session => (
                          <DraggableSession
                            key={session.id}
                            session={session}
                            onClick={onSessionClick}
                            isAr={isAr}
                          />
                        ))}
                      </div>

                      {/* Today indicator line */}
                      {isToday && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${currentTime.getHours() * 60 + currentTime.getMinutes()}px`,
                            height: '2px',
                            background: 'red',
                            zIndex: 8,
                            boxShadow: '0 0 8px red',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                    </DroppableDayColumn>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

// ── Monthly View ──
function MonthlyView({ sessions, onAddPrefilled, onSessionClick }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const AR_DAYS   = { Sun: 'أح', Mon: 'إث', Tue: 'ثل', Wed: 'أر', Thu: 'خم', Fri: 'جم', Sat: 'سب' };
  const AR_STATUS = { planned: 'مخطط', in_progress: 'جارٍ', completed: 'مكتمل', cancelled: 'ملغى' };
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDay, setDrawerDay] = useState(null);

  // Month navigation
  const nextMonth = () => setCurrentMonth(d => addDays(d, 30)); // Simple month addition
  const prevMonth = () => setCurrentMonth(d => addDays(d, -30));
  const jumpToToday = () => setCurrentMonth(new Date());

  // Generate 35 cells for monthly view
  const monthStart = startOfWeek(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), { weekStartsOn: 0 });
  const cells = Array.from({ length: 35 }, (_, i) => addDays(monthStart, i));

  const handleCellClick = (day) => {
    setDrawerDay(day);
    setDrawerOpen(true);
  };

  const daySessions = (day) => sessions.filter(s => isSameDay(parseISO(s.start_time), day));

  return (
    <div>
      {/* Month Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button size="sm" onClick={prevMonth}>{isAr ? '← السابق' : '← Prev'}</Button>
        <span style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-head)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" onClick={jumpToToday}>{isAr ? 'اليوم' : 'Today'}</Button>
          <Button size="sm" onClick={nextMonth}>{isAr ? 'التالي →' : 'Next →'}</Button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 900, color: 'var(--text4)', textTransform: 'uppercase', paddingBottom: 6 }}>
            {isAr ? (AR_DAYS[d] || d) : d}
          </div>
        ))}

        {cells.map((day, idx) => {
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const sess = daySessions(day);

          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.04 }}
              onClick={() => handleCellClick(day)}
              style={{
                minHeight: 80,
                borderRadius: 14,
                padding: 6,
                cursor: 'pointer',
                background: isToday ? 'rgba(99,102,241,0.06)' : 'var(--surface2)',
                border: isToday ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                opacity: isCurrentMonth ? 1 : 0.45,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: isToday ? 'var(--primary-light)' : 'var(--text3)' }}>
                {format(day, 'd')}
              </div>
              
              {/* Colored Dots */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {sess.slice(0, 3).map(s => {
                  const subj = SUBJECTS_LIST.find(x => x.value === s.subject);
                  return (
                    <span
                      key={s.id}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: s.color_override || subj?.color || 'var(--primary)'
                      }}
                    />
                  );
                })}
                {sess.length > 3 && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text4)' }}>
                    +{sess.length - 3}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Drawer Popover for Daily list */}
      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerDay ? format(drawerDay, 'eeee, MMMM d') : ''}>
        <div>
          {drawerDay && daySessions(drawerDay).length === 0 ? (
            <EmptyState icon="📅" title={isAr ? 'لا توجد جلسات' : 'No study sessions'} subtitle={isAr ? 'جدول وقتك الآن!' : 'Plan your time now!'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {drawerDay && daySessions(drawerDay).map(s => {
                const subj = SUBJECTS_LIST.find(x => x.value === s.subject);
                const st = STATUS_COLORS[s.status] || STATUS_COLORS.planned;
                return (
                  <div
                    key={s.id}
                    onClick={() => { setDrawerOpen(false); onSessionClick(s); }}
                    style={{
                      padding: 12, borderRadius: 12, border: '1.5px solid var(--border)',
                      borderLeft: `4px solid ${s.color_override || subj?.color || 'var(--primary)'}`,
                      background: 'var(--surface2)', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{s.topic || (isAr ? 'جلسة دراسية' : 'Study Session')}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>🕒 {format(parseISO(s.start_time), 'hh:mm a')}</div>
                    </div>
                    <span style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 20,
                      background: st.bg, color: st.color, fontWeight: 700
                    }}>
                      {isAr ? (AR_STATUS[s.status] || s.status) : s.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); onAddPrefilled(drawerDay); }}>
              {isAr ? '+ إضافة جلسة' : '+ Add Session'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main Study Planner Component ──
export default function PlannerPage() {
  const { lang, t } = useTranslation();
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('weekly');
  const [addOpen, setAddOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => plannerAPI.getSessions({
      start: new Date(Date.now() - 30 * 86400000).toISOString(),
      end:   new Date(Date.now() + 60 * 86400000).toISOString(),
    }),
  });
  const sessions = data?.data?.sessions || [];

  const { mutate: updateSessionMutation } = useMutation({
    mutationFn: ({ id, payload }) => plannerAPI.updateSession(id, payload),
    onSuccess: () => {
      qc.invalidateQueries(['sessions']);
      qc.invalidateQueries(['sessions-analytics']);
      toast.success(isAr ? 'تم تعديل الجلسة' : 'Session updated successfully');
    },
  });

  const { mutate: deleteSession } = useMutation({
    mutationFn: (id) => plannerAPI.deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries(['sessions']);
      qc.invalidateQueries(['sessions-analytics']);
      toast.success(isAr ? 'تم حذف الجلسة' : 'Session deleted');
    },
  });

  const completed = sessions.filter(s => s.status === 'completed').length;
  const totalMinutes = sessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.duration || 0), 0);

  const TABS = [
    { key: 'weekly',    label: isAr ? '📅 الأسبوعي' : '📅 Weekly', icon: '📅' },
    { key: 'monthly',   label: isAr ? '🗓️ الشهري' : '🗓️ Monthly', icon: '🗓️' },
    { key: 'pomodoro',  label: isAr ? '🍅 بومودورو' : '🍅 Pomodoro', icon: '🍅' },
    { key: 'analytics', label: isAr ? '📊 التحليلات' : '📊 Analytics', icon: '📊' },
    { key: 'ai',        label: isAr ? '🤖 الذكاء الاصطناعي' : '🤖 AI Plan', icon: '🤖' },
  ];

  const handleUpdateSession = (id, payload) => {
    updateSessionMutation({ id, payload });
  };

  const handleAddPrefilled = (date) => {
    setPrefilledDate(date);
    setEditingSession(null);
    setAddOpen(true);
  };

  const handleSessionClick = (session) => {
    setEditingSession(session);
    setPrefilledDate(null);
    setAddOpen(true);
  };

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-head)', marginBottom: 4 }}>📅 {isAr ? 'مخطط الدراسة' : 'Study Planner'}</h2>
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>{isAr ? 'خطط، تتبع، وحسن جلساتك الدراسية' : 'Plan, track, and optimise your study sessions'}</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingSession(null); setPrefilledDate(null); setAddOpen(true); }}>
          {isAr ? '+ إضافة جلسة' : '+ Add Session'}
        </Button>
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

      <div style={{ marginTop: 20 }}>
        {isLoading && activeTab !== 'ai' && activeTab !== 'pomodoro' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 16 }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skeleton.Text width="40%" style={{ height: 16 }} />
                  <Skeleton.Text width="60%" style={{ height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'weekly' && (
              <div className="floating-panel" style={{ padding: 28 }}>
                <WeeklyView
                  sessions={sessions}
                  onUpdateSession={handleUpdateSession}
                  onAddPrefilled={handleAddPrefilled}
                  onSessionClick={handleSessionClick}
                />
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="floating-panel" style={{ padding: 28 }}>
                <MonthlyView
                  sessions={sessions}
                  onAddPrefilled={handleAddPrefilled}
                  onSessionClick={handleSessionClick}
                />
              </div>
            )}

            {activeTab === 'pomodoro' && (
              <div className="floating-panel" style={{ padding: 28 }}>
                <PomodoroTimer onSessionLogged={() => qc.invalidateQueries(['sessions'])} />
              </div>
            )}

            {activeTab === 'analytics' && <PlannerAnalytics />}

            {activeTab === 'ai' && <StudyPlanGenerator isAr={isAr} />}
          </>
        )}
      </div>

      <AddSessionModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditingSession(null); setPrefilledDate(null); }}
        onSaved={() => qc.invalidateQueries(['sessions'])}
        onDelete={deleteSession}
        prefilledDate={prefilledDate}
        editingSession={editingSession}
      />
    </div>
  );
}
