// src/components/planner/PomodoroTimer.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { plannerAPI } from '../../api/index';
import { useAuthStore, useUIStore } from '../../context/store';
import { useTranslation } from '../../i18n/index';

const SUBJECTS_LIST = [
  { key: 'mathematics', en: 'Mathematics', ar: 'الرياضيات', icon: '📐', color: '#6366F1' },
  { key: 'science',     en: 'Science',     ar: 'العلوم',    icon: '🔬', color: '#10B981' },
  { key: 'physics',     en: 'Physics',     ar: 'الفيزياء',  icon: '⚛️', color: '#06B6D4' },
  { key: 'chemistry',   en: 'Chemistry',   ar: 'الكيمياء',  icon: '🧪', color: '#EC4899' },
  { key: 'biology',     en: 'Biology',     ar: 'الأحياء',   icon: '🧬', color: '#10B981' },
  { key: 'arabic',      en: 'Arabic',      ar: 'اللغة العربية', icon: '📚', color: '#F59E0B' },
  { key: 'english',     en: 'English',     ar: 'اللغة الإنجليزية', icon: '🌐', color: '#3B82F6' },
];

// Modes: focus, short-break, long-break
const DEFAULT_DURATIONS = { focus: 25, short: 5, long: 15 };

const RING_R = 130;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function playTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (_) {}
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getPomodorosToday() {
  try {
    const stored = sessionStorage.getItem('pomodoros');
    if (!stored) return 0;
    const { date, count } = JSON.parse(stored);
    if (date !== getTodayKey()) return 0;
    return count;
  } catch { return 0; }
}

function incrementPomodorosToday() {
  const count = getPomodorosToday() + 1;
  sessionStorage.setItem('pomodoros', JSON.stringify({ date: getTodayKey(), count }));
  return count;
}

export default function PomodoroTimer({ onSessionLogged }) {
  const { t } = useTranslation();
  const { language } = useUIStore();
  const isAr = language === 'ar';

  const [durations, setDurations] = useState(DEFAULT_DURATIONS);
  const [mode, setMode] = useState('focus'); // focus | short | long
  const [round, setRound] = useState(0);     // completed focus rounds
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.focus * 60);
  const [sessionStart, setSessionStart] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('mathematics');
  const [showSettings, setShowSettings] = useState(false);
  const [pomodorosToday, setPomodorosToday] = useState(getPomodorosToday);

  const intervalRef = useRef(null);
  const modeRef = useRef(mode);
  const roundRef = useRef(round);
  modeRef.current = mode;
  roundRef.current = round;

  const totalSeconds = durations[mode === 'short' ? 'short' : mode === 'long' ? 'long' : 'focus'] * 60;
  const progress = secondsLeft / totalSeconds;
  const dashOffset = RING_CIRCUMFERENCE * progress;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const modeInfo = {
    focus: { label: isAr ? '🍅 تركيز' : '🍅 Focus', color: '#6366F1' },
    short: { label: isAr ? '☕ استراحة قصيرة' : '☕ Short Break', color: '#10B981' },
    long:  { label: isAr ? '🌙 استراحة طويلة' : '🌙 Long Break', color: '#8B5CF6' },
  };
  const current = modeInfo[mode];

  const advanceMode = useCallback(async () => {
    playTone();
    const wasMode = modeRef.current;
    const wasRound = roundRef.current;

    if (wasMode === 'focus') {
      const newRound = wasRound + 1;
      setRound(newRound);
      const today = incrementPomodorosToday();
      setPomodorosToday(today);

      // Log session to planner
      if (sessionStart) {
        try {
          await plannerAPI.createSession({
            subject: selectedSubject,
            topic: isAr ? 'جلسة بومودورو' : 'Pomodoro session',
            start_time: sessionStart,
            end_time: new Date().toISOString(),
            status: 'completed',
          });
          toast.success(isAr ? '🍅 جلسة مسجلة!' : '🍅 Session logged!');
          onSessionLogged?.();
        } catch (_) {}
      }

      // Every 4 rounds → long break
      if (newRound % 4 === 0) {
        setMode('long');
        setSecondsLeft(durations.long * 60);
        toast(isAr ? '🌙 استراحة طويلة!' : '🌙 Long break time!');
      } else {
        setMode('short');
        setSecondsLeft(durations.short * 60);
        toast(isAr ? '☕ استراحة قصيرة!' : '☕ Short break!');
      }
    } else {
      // Break finished → back to focus
      setMode('focus');
      setSecondsLeft(durations.focus * 60);
      toast(isAr ? '🍅 وقت التركيز!' : '🍅 Focus time!');
    }
    setSessionStart(null);
    setRunning(false);
  }, [durations, selectedSubject, sessionStart, isAr, onSessionLogged]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            advanceMode();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, advanceMode]);

  const start = () => {
    if (!running) {
      setSessionStart(prev => prev || new Date().toISOString());
      setRunning(true);
    }
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(durations.focus * 60);
    setMode('focus');
    setRound(0);
    setSessionStart(null);
  };

  const skip = () => {
    setRunning(false);
    advanceMode();
  };

  const applySettings = (newDurs) => {
    setDurations(newDurs);
    setSecondsLeft(newDurs[mode === 'short' ? 'short' : mode === 'long' ? 'long' : 'focus'] * 60);
    setRunning(false);
    setShowSettings(false);
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-head)' }}>
            🍅 {isAr ? 'تقنية بومودورو' : 'Pomodoro Timer'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            {isAr ? `اليوم: ${pomodorosToday} 🍅` : `Today: ${pomodorosToday} 🍅`}
          </div>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 18, color: 'var(--text2)' }}
        >⚙️</button>
      </div>

      {/* Settings popover */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, marginBottom: 24 }}
          >
            <SettingsPanel durations={durations} onApply={applySettings} isAr={isAr} onCancel={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subject selector */}
      {mode === 'focus' && !running && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isAr ? 'المادة الدراسية' : 'Study Subject'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUBJECTS_LIST.map(s => (
              <button
                key={s.key}
                onClick={() => setSelectedSubject(s.key)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: selectedSubject === s.key ? `${s.color}20` : 'var(--surface2)',
                  border: `1.5px solid ${selectedSubject === s.key ? s.color : 'var(--border)'}`,
                  color: selectedSubject === s.key ? s.color : 'var(--text3)',
                  transition: 'all 0.15s'
                }}
              >
                {s.icon} {isAr ? s.ar : s.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SVG Ring */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ position: 'relative', width: 300, height: 300 }}>
          <svg width="300" height="300" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background ring */}
            <circle cx="150" cy="150" r={RING_R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
            {/* Progress ring */}
            <circle
              cx="150" cy="150" r={RING_R} fill="none"
              stroke={current.color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE - dashOffset}
              style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none', filter: `drop-shadow(0 0 8px ${current.color}80)` }}
            />
          </svg>

          {/* Center content */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'monospace', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {mm}:{ss}
            </div>
            <div style={{ fontSize: 13, color: current.color, fontWeight: 700, marginTop: 8 }}>
              {current.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>
              {isAr ? `الجولة ${roundRef.current + 1}` : `Round ${roundRef.current + 1}`}
            </div>
          </div>
        </div>

        {/* Round dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < (round % 4) ? current.color : 'rgba(255,255,255,0.1)',
              boxShadow: i < (round % 4) ? `0 0 8px ${current.color}` : 'none',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!running ? (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={start}
            style={{
              padding: '14px 36px', borderRadius: 50, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`,
              color: '#fff', fontWeight: 800, fontSize: 15,
              boxShadow: `0 8px 24px ${current.color}40`
            }}
          >
            {isAr ? '▶ بدء' : '▶ Start'}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={pause}
            style={{
              padding: '14px 36px', borderRadius: 50, border: '1.5px solid var(--border)', cursor: 'pointer',
              background: 'var(--surface2)', color: 'var(--text)', fontWeight: 800, fontSize: 15
            }}
          >
            {isAr ? '⏸ إيقاف مؤقت' : '⏸ Pause'}
          </motion.button>
        )}
        <button onClick={reset} style={{ padding: '14px 20px', borderRadius: 50, border: '1.5px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', color: 'var(--text3)', fontWeight: 700 }}>
          {isAr ? '↺ إعادة' : '↺ Reset'}
        </button>
        <button onClick={skip} style={{ padding: '14px 20px', borderRadius: 50, border: '1.5px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', color: 'var(--text3)', fontWeight: 700 }}>
          {isAr ? '⏭ تخطي' : '⏭ Skip'}
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({ durations, onApply, isAr, onCancel }) {
  const [vals, setVals] = useState({ ...durations });
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>⚙️ {isAr ? 'إعدادات المؤقت' : 'Timer Settings'}</div>
      {[
        { key: 'focus', label: isAr ? '🍅 التركيز (دقيقة)' : '🍅 Focus (min)' },
        { key: 'short', label: isAr ? '☕ استراحة قصيرة (دقيقة)' : '☕ Short Break (min)' },
        { key: 'long',  label: isAr ? '🌙 استراحة طويلة (دقيقة)' : '🌙 Long Break (min)' },
      ].map(({ key, label }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <label style={{ flex: 1, fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{label}</label>
          <input
            type="number" min="1" max="60" value={vals[key]}
            onChange={e => setVals(v => ({ ...v, [key]: Math.min(60, Math.max(1, Number(e.target.value))) }))}
            style={{ width: 64, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 700, textAlign: 'center' }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={() => onApply(vals)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#6366F1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
          {isAr ? 'حفظ' : 'Apply'}
        </button>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700 }}>
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
