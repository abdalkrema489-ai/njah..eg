// src/components/exam/ExamPage.jsx
// NEW FEATURE: Timed exam mode with auto-grading, score analytics, review mode
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { aiAPI } from '../../api/index';
import { Card, Btn, Select, Input, SectionHeader, ProgressBar, Spinner } from '../shared/UI';

const SUBJECTS = [
  { value:'mathematics',    label:'📐 Mathematics'   },
  { value:'science',        label:'🔬 Science'        },
  { value:'arabic',         label:'📚 Arabic'         },
  { value:'english',        label:'🌐 English'        },
  { value:'social_studies', label:'🌍 Social Studies' },
  { value:'physics',        label:'⚡ Physics'        },
  { value:'chemistry',      label:'⚗️ Chemistry'      },
  { value:'biology',        label:'🧬 Biology'        },
];

const DURATIONS = [
  { value:10,  label:'10 minutes — Quick drill'    },
  { value:20,  label:'20 minutes — Short exam'     },
  { value:30,  label:'30 minutes — Standard exam'  },
  { value:45,  label:'45 minutes — Full exam'      },
  { value:60,  label:'60 minutes — Final exam'     },
];

const DIFFICULTIES = [
  { value:'easy',   label:'🟢 Easy'   },
  { value:'medium', label:'🟡 Medium' },
  { value:'hard',   label:'🔴 Hard'   },
];

// ── Setup screen ─────────────────────────────────────────
function ExamSetup({ onStart, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { subject:'mathematics', count:10, difficulty:'medium', duration:20, topic:'' },
  });

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <SectionHeader
        icon="🧠"
        title="Intellect Exam Mode"
        subtitle="Simulate real-world academic pressure with AI-curated timed assessments."
      />

      <div className="floating-panel" style={{ padding: 32 }}>
        <form onSubmit={handleSubmit(onStart)} style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Select label="Subject" {...register('subject', { required: true })}>
            {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>

          <Input
            label="Specific Topic"
            placeholder="e.g. Quantum Physics, Middle East History..."
            {...register('topic')}
          />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Select label="Batch Size" {...register('count')}>
              {[5,10,15,20,30].map(n => <option key={n} value={n}>{n} questions</option>)}
            </Select>
            <Select label="Cognitive Load" {...register('difficulty')}>
              {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </div>

          <Select label="Temporal Constraints" {...register('duration')}>
            {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>

          <div style={{
            padding:'16px 20px', background:'rgba(124,58,237,0.06)',
            border:'1px solid rgba(124,58,237,0.15)', borderRadius:16,
            fontSize:13, color:'var(--text2)', lineHeight:1.7,
          }}>
            <strong style={{ color:'var(--primary-light)', display: 'block', marginBottom: 4 }}>🚀 System Protocol:</strong>
            Najah AI will synthesize an original assessment. The neural timer will enforce strict submission. 
            Results will be integrated into your performance matrix.
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '14px', fontSize: 16, fontWeight: 800, marginTop: 8 }}
          >
            {loading ? '✨ Initializing Assessment...' : '🚀 Initialize Exam Protocol'}
          </motion.button>
        </form>
      </div>
    </div>
  );
}

// ── Timer ring ───────────────────────────────────────────
function TimerRing({ seconds, totalSeconds, color }) {
  const radius = 54;
  const circ   = 2 * Math.PI * radius;
  const pct    = seconds / totalSeconds;
  const offset = circ * (1 - pct);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const ringColor = pct > 0.5 ? '#0ECDA8' : pct > 0.25 ? '#F7B731' : '#FF5470';

  return (
    <div style={{ position:'relative', width:124, height:124 }}>
      <svg width="124" height="124" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="62" cy="62" r={radius} fill="none" stroke="var(--surface3)" strokeWidth="7" />
        <circle cx="62" cy="62" r={radius} fill="none"
          stroke={ringColor} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition:'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
      }}>
        <div style={{ fontSize:24, fontWeight:800, fontVariantNumeric:'tabular-nums',
          fontFamily:'var(--font-head)', color: ringColor, lineHeight:1 }}>{mm}:{ss}</div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>remaining</div>
      </div>
    </div>
  );
}

// ── Active exam ──────────────────────────────────────────
function ExamActive({ exam, totalSeconds, onSubmit }) {
  const [answers,    setAnswers]    = useState({});
  const [seconds,    setSeconds]    = useState(totalSeconds);
  const [current,    setCurrent]    = useState(0);
  const [flagged,    setFlagged]    = useState(new Set());
  const [timeUp,     setTimeUp]     = useState(false);
  const timerRef = useRef(null);

  const questions = exam.questions || [];

  // Countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setTimeUp(true);
          toast.error('⏰ Time is up! Submitting your exam…');
          setTimeout(() => onSubmit(answers, true), 1500);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const answer    = idx => setAnswers(a => ({ ...a, [current]: idx }));
  const toggleFlag = () => setFlagged(f => { const n = new Set(f); n.has(current) ? n.delete(current) : n.add(current); return n; });
  const answered  = Object.keys(answers).length;
  const q         = questions[current];

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const unanswered = questions.length - answered;
    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered question${unanswered>1?'s':''}. Submit anyway?`)) return;
    }
    onSubmit(answers, false);
  };

  if (!q) return null;

  return (
    <div>
      {/* Header bar — responsive: stacks on mobile */}
      <div className="floating-panel" style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:12,
        marginBottom:24, padding:'16px 20px',
        borderRadius: 24,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight:900, fontSize:16, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {exam.subject?.replace('_',' ').toUpperCase()} ASSESSMENT
          </div>
          <div style={{ fontSize:12, color:'var(--text4)', marginTop: 4, fontWeight: 700 }}>
            <span style={{ color: 'var(--primary)' }}>{answered}</span> / {questions.length} completed
            {flagged.size > 0 && <span style={{ color:'var(--warning)', marginLeft:12 }}>🚩 {flagged.size} flagged</span>}
          </div>
        </div>
        <TimerRing seconds={seconds} totalSeconds={totalSeconds} />
        <Btn variant="aurora" onClick={handleSubmit} style={{ flexShrink: 0 }}>Finalize →</Btn>
      </div>

      {/* Progress */}
      <div style={{ marginBottom:20 }}>
        <ProgressBar value={answered} max={questions.length} color="green" height={4} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr)', gap:16, alignItems:'start' }} className="exam-active-grid">
        {/* Question */}
        <div className="floating-panel" style={{ padding: 32 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:12, color:'var(--text4)', fontWeight:800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              PHASE {current + 1} OF {questions.length}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {flagged.has(current) && <span style={{ fontSize:11, color:'var(--warning)', fontWeight: 800 }}>🚩 FLAG ACTIVE</span>}
              <Btn size="sm" variant="glass" onClick={toggleFlag}>
                {flagged.has(current) ? 'Remove Flag' : 'Flag Question'}
              </Btn>
            </div>
          </div>

          <div style={{ fontSize:18, fontWeight:800, lineHeight:1.7, marginBottom:28, color:'var(--text)', fontFamily: 'var(--font-head)' }}>
            {q.question}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {q.options.map((opt, oi) => {
              const selected = answers[current] === oi;
              return (
                <motion.div key={oi}
                  onClick={() => answer(oi)}
                  whileHover={{ scale: 1.015, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="floating-card"
                  style={{
                    padding:'16px 24px', borderRadius:16, cursor:'pointer',
                    background: selected ? 'var(--surface3)' : undefined,
                    borderColor: selected ? 'var(--primary)' : undefined,
                    color: selected ? 'var(--text)' : 'var(--text2)',
                    fontSize:15, transition:'all 0.2s',
                    display: 'flex', alignItems: 'center'
                  }}
                >
                  <span style={{ 
                    width: 32, height: 32, borderRadius: 10,
                    fontWeight: 900, marginRight: 16, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: selected ? 'var(--primary)' : 'var(--surface3)',
                    color: selected ? '#fff' : 'var(--text4)',
                    fontSize: 13
                  }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <div style={{ flex: 1 }}>{opt.replace(/^[A-Da-d]\)\s*/, '')}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Prev / Next */}
          <div style={{ display:'flex', gap:12, marginTop:32, justifyContent:'space-between', borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <Btn onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>← PREV</Btn>
            <span style={{ fontSize:13, fontWeight: 800, color:'var(--text4)', alignSelf:'center' }}>{current+1} / {questions.length}</span>
            <Btn variant="primary" onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1}>NEXT →</Btn>
          </div>
        </div>

        {/* Question navigator */}
        <div className="floating-panel" style={{ padding: 20 }}>
          <div style={{ fontWeight:900, fontSize:13, marginBottom:16, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text2)' }}>Protocols Grid</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
            {questions.map((_, qi) => {
              const isAnswered = answers[qi] !== undefined;
              const isFlagged  = flagged.has(qi);
              const isCurrent  = qi === current;
              return (
                <motion.div key={qi}
                  onClick={() => setCurrent(qi)}
                  whileHover={{ scale:1.15, y: -2 }} whileTap={{ scale:0.9 }}
                  style={{
                    width:36, height:36, borderRadius:10,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:900, cursor:'pointer',
                    background: isCurrent   ? 'var(--primary)'
                              : isFlagged  ? 'var(--warning)'
                              : isAnswered ? 'var(--success)'
                              : 'var(--surface3)',
                    boxShadow: isCurrent ? '0 0 12px var(--primary)' : 'none',
                    color: isCurrent || isFlagged || isAnswered ? '#fff' : 'var(--text4)',
                    transition: 'all 0.22s var(--ease)'
                  }}
                >{qi + 1}</motion.div>
              );
            })}
          </div>

          <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:8, fontSize:11, color:'var(--text4)', fontWeight: 800 }}>
            {[
              { color:'var(--success)', label:'RESOLVED' },
              { color:'var(--warning)',  label:'FLAGGED' },
              { color:'var(--surface3)', label:'PENDING' },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:12, height:12, borderRadius:4, background:item.color }} />
                {item.label}
              </div>
            ))}
          </div>

          <div className="floating-card" style={{ marginTop:24, padding:'14px', borderRadius:14, fontSize:12 }}>
            <div style={{ color:'var(--text4)', marginBottom:4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DIFFICULTY</div>
            <div style={{ fontWeight:900, textTransform:'uppercase', color:'var(--primary-light)', fontSize: 13 }}>
              {exam.difficulty}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Results screen ───────────────────────────────────────
function ExamResults({ exam, answers, timeTaken, onRetry, onNew }) {
  const questions = exam.questions || [];
  const correct   = questions.filter((q, i) => answers[i] === q.correct).length;
  const total     = questions.length;
  const score     = Math.round((correct / total) * 100);
  const mins      = Math.floor(timeTaken / 60);
  const secs      = timeTaken % 60;

  const grade =
    score >= 90 ? { label:'A+', color:'#0ECDA8', emoji:'🏆' } :
    score >= 80 ? { label:'A',  color:'#0ECDA8', emoji:'⭐' } :
    score >= 70 ? { label:'B',  color:'#6C63FF', emoji:'👍' } :
    score >= 60 ? { label:'C',  color:'#F7B731', emoji:'📚' } :
                  { label:'D',  color:'#FF5470', emoji:'💪' };

  const [showReview, setShowReview] = useState(false);

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      {/* Score card */}
      <motion.div
        initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
        transition={{ type:'spring', stiffness:200, damping:20 }}
      >
        <Card style={{ textAlign:'center', padding:'40px 32px', marginBottom:20 }}>
          <div style={{ fontSize:60, marginBottom:12 }}>{grade.emoji}</div>
          <div style={{ fontSize:64, fontWeight:800, fontFamily:'var(--font-head)', color:grade.color, marginBottom:4 }}>
            {score}%
          </div>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>
            Grade <span style={{ color:grade.color }}>{grade.label}</span>
          </div>
          <div style={{ fontSize:14, color:'var(--text3)', marginBottom:24 }}>
            {correct} correct out of {total} questions
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(120px,100%),1fr))', gap:12, marginBottom:24 }}>
            {[
              { icon:'✅', val:correct, label:'Correct' },
              { icon:'❌', val:total-correct, label:'Wrong' },
              { icon:'⏱️', val:`${mins}m ${secs}s`, label:'Time taken' },
              { icon:'📊', val:`${score}%`, label:'Score' },
            ].map(s => (
              <div key={s.label} style={{ padding:'14px 8px', background:'var(--surface)', borderRadius:10, textAlign:'center' }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:18, fontWeight:800, fontFamily:'var(--font-head)' }}>{s.val}</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <Btn onClick={() => setShowReview(v => !v)}>
              {showReview ? 'Hide Review' : '📋 Review Answers'}
            </Btn>
            <Btn onClick={onRetry}>↺ Retry Same</Btn>
            <Btn variant="primary" onClick={onNew}>+ New Exam</Btn>
          </div>
        </Card>
      </motion.div>

      {/* Review */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
          >
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {questions.map((q, qi) => {
                const userAns    = answers[qi];
                const isCorrect  = userAns === q.correct;
                const isSkipped  = userAns === undefined;
                return (
                  <Card key={qi} style={{ borderColor: isCorrect ? 'rgba(14,205,168,0.3)' : 'rgba(255,84,112,0.3)' }}>
                    <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
                      <span style={{ fontSize:20 }}>{isSkipped ? '⏭️' : isCorrect ? '✅' : '❌'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, marginBottom:8, lineHeight:1.5 }}>
                          Q{qi+1}: {q.question}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                          {q.options.map((opt, oi) => {
                            const isUserAns    = oi === userAns;
                            const isCorrectAns = oi === q.correct;
                            return (
                              <div key={oi} style={{
                                padding:'8px 12px', borderRadius:8, fontSize:13,
                                background: isCorrectAns ? 'rgba(14,205,168,0.1)' : isUserAns && !isCorrect ? 'rgba(255,84,112,0.1)' : 'var(--surface)',
                                color:      isCorrectAns ? 'var(--accent2)'        : isUserAns && !isCorrect ? 'var(--danger)' : 'var(--text2)',
                                border:     `1px solid ${isCorrectAns ? 'rgba(14,205,168,0.25)' : isUserAns && !isCorrect ? 'rgba(255,84,112,0.25)' : 'var(--border)'}`,
                                display:'flex', alignItems:'center', gap:8,
                              }}>
                                <span style={{ fontWeight:700, minWidth:20 }}>{String.fromCharCode(65+oi)})</span>
                                {opt.replace(/^[A-Da-d]\)\s*/, '')}
                                {isCorrectAns && <span style={{ marginLeft:'auto', fontSize:12, fontWeight:700 }}>✓ Correct</span>}
                                {isUserAns && !isCorrect && <span style={{ marginLeft:'auto', fontSize:12 }}>✗ Your answer</span>}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <div style={{
                            marginTop:10, padding:'10px 12px', background:'rgba(108,99,255,0.07)',
                            borderRadius:8, fontSize:12, color:'var(--text2)', lineHeight:1.6,
                            borderLeft:'3px solid var(--primary)',
                          }}>
                            <strong style={{ color:'var(--primary-light)' }}>💡 Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Exam Page ───────────────────────────────────────
export default function ExamPage() {
  const [phase,     setPhase]     = useState('setup');   // setup | loading | active | results
  const [exam,      setExam]      = useState(null);
  const [answers,   setAnswers]   = useState({});
  const [config,    setConfig]    = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [loading,   setLoading]   = useState(false);

  const generateExam = async (formData) => {
    setLoading(true);
    setConfig(formData);
    try {
      const { data } = await aiAPI.generateQuiz({
        subject:    formData.subject,
        topic:      formData.topic || '',
        difficulty: formData.difficulty,
        count:      Number(formData.count),
        language:   'en',
      });
      if (!data?.questions?.length) throw new Error('No questions returned');
      setExam({ ...data, duration: formData.duration });
      setStartTime(Date.now());
      setAnswers({});
      setPhase('active');
    } catch (err) {
      toast.error(err.message || 'Failed to generate exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitExam = useCallback(async (finalAnswers, wasTimedOut) => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    setTimeTaken(elapsed);
    setAnswers(finalAnswers);

    // Save result
    const questions = exam?.questions || [];
    const correct   = questions.filter((q, i) => finalAnswers[i] === q.correct).length;
    const score     = Math.round((correct / questions.length) * 100);

    try {
      await aiAPI.submitQuiz({
        subject:    exam.subject,
        topic:      exam.topic || '',
        totalQ:     questions.length,
        correctQ:   correct,
        difficulty: exam.difficulty,
        timeTaken:  elapsed,
        questions:  questions.map((q, i) => ({ ...q, userAnswer: finalAnswers[i] })),
      });
    } catch {}

    if (wasTimedOut) {
      toast.error(`⏰ Time's up! You scored ${score}%`);
    } else {
      score >= 80
        ? toast.success(`🎉 Excellent! ${score}% — ${correct}/${questions.length} correct!`)
        : score >= 60
          ? toast(`👍 Good effort! ${score}% — keep practising!`)
          : toast(`📚 ${score}% — review the material and try again`);
    }

    setPhase('results');
  }, [exam, startTime]);

  return (
    <div className="animate-fade">
      {phase === 'setup' && (
        <ExamSetup onStart={generateExam} loading={loading} />
      )}

      {phase === 'loading' && (
        <div style={{ textAlign:'center', padding:'80px 24px' }}>
          <Spinner size="lg" />
          <p style={{ marginTop:16, color:'var(--text3)' }}>Generating your exam with AI…</p>
        </div>
      )}

      {phase === 'active' && exam && (
        <ExamActive
          exam={exam}
          totalSeconds={config.duration * 60}
          onSubmit={submitExam}
        />
      )}

      {phase === 'results' && exam && (
        <ExamResults
          exam={exam}
          answers={answers}
          timeTaken={timeTaken}
          onRetry={() => { setPhase('active'); setStartTime(Date.now()); setAnswers({}); }}
          onNew={() => setPhase('setup')}
        />
      )}
    </div>
  );
}
