// src/components/files/QuizPanel.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { aiAPI } from '../../api/index';
import { Spinner, EmptyState } from '../shared/UI';
import { useUIStore, useDraftStore } from '../../context/store';

const SUBJECTS_LIST = [
  { key: 'mathematics',    en: 'Mathematics',     ar: 'الرياضيات',       icon: '📐', color: '#6366F1' },
  { key: 'science',        en: 'Science',         ar: 'العلوم',           icon: '🔬', color: '#10B981' },
  { key: 'physics',        en: 'Physics',         ar: 'الفيزياء',         icon: '⚛️', color: '#06B6D4' },
  { key: 'chemistry',      en: 'Chemistry',       ar: 'الكيمياء',         icon: '🧪', color: '#EC4899' },
  { key: 'biology',        en: 'Biology',         ar: 'الأحياء',           icon: '🧬', color: '#10B981' },
  { key: 'arabic',         en: 'Arabic',          ar: 'اللغة العربية',     icon: '📚', color: '#F59E0B' },
  { key: 'english',        en: 'English',         ar: 'اللغة الإنجليزية',   icon: '🌐', color: '#3B82F6' },
  { key: 'social_studies', en: 'Social Studies',  ar: 'الدراسات الاجتماعية', icon: '🌍', color: '#EF4444' },
  { key: 'islamic_studies',en: 'Islamic Studies', ar: 'التربية الإسلامية',  icon: '🕌', color: '#059669' },
];

const DRAFT_STALE_MS = 2 * 60 * 60 * 1000; // 2 hours — older than this, don't restore

const DIFFICULTIES = [
  { key: 'easy',   en: 'Easy',   ar: 'سهل',   color: '#10B981' },
  { key: 'medium', en: 'Medium', ar: 'متوسط', color: '#F59E0B' },
  { key: 'hard',   en: 'Hard',   ar: 'صعب',   color: '#EF4444' },
];

export default function QuizPanel() {
  const { language } = useUIStore();
  const isAr = language === 'ar';
  const { quizProgress, saveQuizProgress, clearQuizProgress } = useDraftStore();

  // Restore from persisted progress if not stale (< 2h)
  const hasFreshDraft = quizProgress?.savedAt && (Date.now() - quizProgress.savedAt < DRAFT_STALE_MS);

  const [subject, setSubject]     = useState(() => quizProgress?.subject     || 'mathematics');
  const [difficulty, setDifficulty] = useState(() => quizProgress?.difficulty || 'medium');
  const [count, setCount]         = useState(() => quizProgress?.count       || 10);
  const [quiz, setQuiz]           = useState(() => hasFreshDraft ? (quizProgress?.questions ? { questions: quizProgress.questions } : null) : null);
  const [loading, setLoading]     = useState(false);
  const [answers, setAnswers]     = useState(() => hasFreshDraft ? (quizProgress?.answers || {}) : {});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]         = useState(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(() => !!(hasFreshDraft && quizProgress?.questions));

  // Auto-save answers whenever they change (quiz in progress)
  useEffect(() => {
    if (!quiz || submitted) return;
    saveQuizProgress({
      subject, difficulty, count,
      questions: quiz.questions,
      answers,
      startedAt: quizProgress?.startedAt || Date.now(),
    });
  }, [answers, quiz, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    setLoading(true);
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setShowRestoreBanner(false);
    try {
      const { data } = await aiAPI.generateQuiz({ subject, difficulty, count, language });
      if (!data?.questions?.length) throw new Error();
      setQuiz(data);
      saveQuizProgress({
        subject, difficulty, count,
        questions: data.questions,
        answers: {},
        startedAt: Date.now(),
      });
    } catch {
      toast.error(isAr ? 'فشل إنشاء الاختبار. تأكد من اتصالك بالإنترنت.' : 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    const correct = quiz.questions.filter((q, i) => answers[i] === q.correct).length;
    const total = quiz.questions.length;
    setScore({ correct, total, pct: Math.round((correct / total) * 100) });
    setSubmitted(true);
    // Clear saved progress — quiz is done
    clearQuizProgress();
    try {
      await aiAPI.submitQuiz({
        subject,
        topic: 'General AI Quiz',
        totalQ: total,
        correctQ: correct,
        difficulty,
        questions: quiz.questions.map((q, i) => ({ ...q, userAnswer: answers[i] })),
      });
    } catch {}
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '12px 12px 48px' }}>
      {/* ── Quiz Draft Restore Banner ── */}
      <AnimatePresence>
        {showRestoreBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              marginBottom: 16, padding: '14px 20px', borderRadius: 14,
              background: 'rgba(99,102,241,0.10)', border: '1.5px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13,
            }}
          >
            <span>📝 {isAr ? 'لديك اختبار لم يكتمل — هل تريد الاستمرار؟' : 'You have an unfinished quiz — continue?'}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowRestoreBanner(false)} style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer' }}>
                {isAr ? 'استمر' : 'Continue'}
              </button>
              <button onClick={() => { clearQuizProgress(); setShowRestoreBanner(false); setQuiz(null); setAnswers({}); }}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {isAr ? 'ابدأ من جديد' : 'Start fresh'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {/* Step 1: Config Selector */}
        {!quiz && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="floating-panel"
            style={{ padding: 32, borderRadius: 24, backdropFilter: 'var(--glass-blur)' }}
          >
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, fontFamily: 'var(--font-head)' }}>
                🧠 {isAr ? 'مولد اختبارات الذكاء الاصطناعي' : 'AI Quiz Simulator'}
              </h2>
              <p style={{ color: 'var(--text3)', fontSize: 14 }}>
                {isAr
                  ? 'اختبارات ذكية مخصصة ومتوافقة مع المناهج الدراسية، مدعومة بنظام Gemini'
                  : 'Tailored study assessments fully curriculum-aligned, powered by Gemini AI'}
              </p>
            </div>

            {/* Subject card grid */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', display: 'block', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                📚 {isAr ? 'اختر المادة الدراسية' : 'Select Academic Subject'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {SUBJECTS_LIST.map((s) => {
                  const isSelected = subject === s.key;
                  return (
                    <motion.div
                      key={s.key}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSubject(s.key)}
                      style={{
                        padding: '16px 12px',
                        borderRadius: 16,
                        cursor: 'pointer',
                        textAlign: 'center',
                        background: isSelected ? `${s.color}15` : 'var(--surface2)',
                        border: '2px solid',
                        borderColor: isSelected ? s.color : 'var(--border)',
                        color: 'var(--text)',
                        transition: 'border-color 0.15s, background-color 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{isAr ? s.ar : s.en}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Difficulty + Question Count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', display: 'block', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  🎯 {isAr ? 'مستوى الصعوبة' : 'Difficulty Level'}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {DIFFICULTIES.map((d) => {
                    const isSelected = difficulty === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setDifficulty(d.key)}
                        style={{
                          flex: 1,
                          padding: '12px 8px',
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 13,
                          background: isSelected ? `${d.color}18` : 'var(--surface2)',
                          border: '1.5px solid',
                          borderColor: isSelected ? d.color : 'var(--border)',
                          color: isSelected ? d.color : 'var(--text3)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {isAr ? d.ar : d.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', display: 'block', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  📝 {isAr ? 'عدد الأسئلة' : 'Number of Questions'}
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: 14,
                    fontWeight: 700,
                    outline: 'none',
                    height: 48,
                  }}
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} {isAr ? 'أسئلة' : 'Questions'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Launch Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
              }}
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>{isAr ? 'جاري استدعاء الأسئلة...' : 'Assembling Questions...'}</span>
                </>
              ) : (
                <>
                  <span>✨ {isAr ? 'إنشاء الاختبار الذكي' : 'Generate AI Quiz'}</span>
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Quiz Active Taker */}
        {quiz && !submitted && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(99,102,241,0.12)',
                  color: 'var(--primary-light)',
                  fontWeight: 800,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  border: '1px solid rgba(99,102,241,0.2)'
                }}>
                  {subject.replace('_', ' ')}
                </span>
                <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text3)' }}>
                  {quiz.questions?.length} {isAr ? 'أسئلة' : 'Questions'} · {difficulty}
                </span>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(isAr ? 'هل تريد التراجع وإلغاء الاختبار الحالي؟' : 'Are you sure you want to exit the quiz?')) {
                    setQuiz(null);
                  }
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  color: 'var(--text2)',
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                {isAr ? '← تراجع' : '← Back'}
              </button>
            </div>

            {/* Questions container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {quiz.questions?.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="floating-panel"
                  style={{ padding: 24, borderRadius: 20, border: '1px solid var(--border)' }}
                >
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                      color: '#fff', fontSize: 14, fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>{i + 1}</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.5 }}>
                      {q.question}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {q.options?.map((opt, oi) => {
                      const isSelected = answers[i] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers(a => ({ ...a, [i]: oi }))}
                          style={{
                            padding: '14px 18px',
                            borderRadius: 14,
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 13,
                            background: isSelected ? 'rgba(99,102,241,0.15)' : 'var(--surface2)',
                            border: '2px solid',
                            borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                            color: 'var(--text)',
                            fontWeight: isSelected ? 800 : 400,
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10
                          }}
                        >
                          <span style={{
                            width: 20, height: 20, borderRadius: '50%',
                            border: '2px solid', borderColor: isSelected ? 'var(--primary)' : 'var(--text4)',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            display: 'inline-block', flexShrink: 0,
                            boxShadow: isSelected ? '0 0 8px var(--primary)' : 'none'
                          }} />
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={submit}
                disabled={Object.keys(answers).length < (quiz.questions?.length || 0)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 16,
                  boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                  marginTop: 12,
                  opacity: Object.keys(answers).length < (quiz.questions?.length || 0) ? 0.6 : 1,
                  pointerEvents: Object.keys(answers).length < (quiz.questions?.length || 0) ? 'none' : 'auto'
                }}
              >
                {isAr ? 'إرسال الإجابات وإنهاء الاختبار ←' : 'Submit Answers and Review →'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Quiz Scoreboard / Results */}
        {submitted && score && (
          <motion.div
            key="results"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="floating-panel"
            style={{ padding: 36, borderRadius: 24, textAlign: 'center', border: '2px solid var(--border)' }}
          >
            <div style={{ fontSize: 64, marginBottom: 12 }}>
              {score.pct >= 85 ? '🏆' : score.pct >= 60 ? '✨' : '📚'}
            </div>
            
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, fontFamily: 'var(--font-head)' }}>
              {isAr ? 'نتيجة الاختبار' : 'Performance Insights'}
            </h2>
            <div style={{
              fontSize: 64,
              fontWeight: 900,
              color: score.pct >= 80 ? '#10B981' : score.pct >= 60 ? '#F59E0B' : '#EF4444',
              lineHeight: 1.2
            }}>
              {score.pct}%
            </div>
            
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text2)', marginTop: 8, marginBottom: 28 }}>
              {isAr
                ? `حصلت على ${score.correct} إجابات صحيحة من أصل ${score.total}`
                : `You got ${score.correct} correct answers out of ${score.total}`}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 36 }}>
              <button
                onClick={() => {
                  setQuiz(null);
                  setAnswers({});
                  setSubmitted(false);
                  setScore(null);
                }}
                style={{
                  padding: '12px 28px',
                  borderRadius: 14,
                  background: 'var(--surface2)',
                  border: '1.5px solid var(--border)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14
                }}
              >
                {isAr ? 'اختبار جديد' : 'New Quiz'}
              </button>
              <button
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setScore(null);
                }}
                style={{
                  padding: '12px 28px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: '0 4px 16px rgba(99,102,241,0.2)'
                }}
              >
                {isAr ? 'إعادة المحاولة ↺' : 'Retry Quiz ↺'}
              </button>
            </div>

            {/* Answer explanations */}
            <div style={{ textAlign: 'left', marginTop: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                💡 {isAr ? 'مراجعة الأسئلة والشروحات' : 'Questions Review & Explanations'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {quiz.questions?.map((q, i) => {
                  const ua = answers[i];
                  const correct = q.correct;
                  const isCorrect = ua === correct;
                  return (
                    <div
                      key={i}
                      style={{
                        background: isCorrect ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                        border: '1.5px solid',
                        borderColor: isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                        borderRadius: 16,
                        padding: 18
                      }}
                    >
                      <div style={{
                        fontWeight: 800,
                        fontSize: 14.5,
                        marginBottom: 6,
                        color: isCorrect ? '#10B981' : '#EF4444',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center'
                      }}>
                        <span>{isCorrect ? '✓' : '✗'}</span>
                        <span>{i + 1}. {q.question}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', paddingLeft: 20, marginBottom: 8 }}>
                        <strong>{isAr ? 'إجابتك:' : 'Your answer:'}</strong> {q.options?.[ua] || (isAr ? 'لم تتم الإجابة' : 'No Answer')}
                        {!isCorrect && (
                          <div style={{ marginTop: 4, color: '#10B981' }}>
                            <strong>{isAr ? 'الإجابة الصحيحة:' : 'Correct Answer:'}</strong> {q.options?.[correct]}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text3)', paddingLeft: 20, borderLeft: '3px solid rgba(255,255,255,0.08)', fontStyle: 'italic' }}>
                        💡 {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
