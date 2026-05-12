// src/components/tools/StudyTools.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { toolsAPI } from '../../api/index';
import { useUIStore, useAuthStore } from '../../context/store';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';

// ── Shared UI primitives ─────────────────────────────────────
const Card = ({ children, className="floating-panel", style = {} }) => (
  <div className={className} style={{ padding: 28, ...style }}>{children}</div>
);

const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 20 }}>{icon}</span> {title}
    </div>
    {subtitle && <div style={{ fontSize: 15, color: 'var(--text2)', fontWeight: 500, lineHeight: 1.6 }}>{subtitle}</div>}
  </div>
);

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

// ── TTS Button ────────────────────────────────────────────────
function TTSBtn({ text, lang }) {
  const { isSpeaking, isPaused, isSupported, toggle } = useTextToSpeech();
  if (!isSupported) return null;
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
      onClick={() => toggle(text, lang)}
      style={{
        width: 32, height: 32, borderRadius: 9,
        background: isSpeaking && !isPaused ? 'rgba(16,185,129,0.15)' : 'var(--surface2)',
        border: `1px solid ${isSpeaking && !isPaused ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
        color: isSpeaking && !isPaused ? '#10B981' : 'var(--text3)',
        cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      title={isSpeaking ? (isPaused ? 'Resume' : 'Pause') : 'Read aloud'}
    >
      {isSpeaking && !isPaused ? '⏸' : isPaused ? '▶️' : '🔊'}
    </motion.button>
  );
}

// ════════════════════════════════════════════════════════════
// 1. DICTIONARY
// ════════════════════════════════════════════════════════════
function DictionaryTab() {
  const [word, setWord]   = useState('');
  const [result, setResult] = useState(null);
  const { language } = useUIStore();
  const inputRef = useRef(null);

  const { mutate: lookup, isPending } = useMutation({
    mutationFn: () => toolsAPI.dictionary(word.trim(), language),
    onSuccess: ({ data }) => setResult(data),
    onError: (err) => {
      const msg = err.response?.data?.error || 'Word not found';
      toast.error(msg);
      setResult(null);
    },
  });

  const handleSearch = () => { if (word.trim()) lookup(); };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text4)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Semantic Lexicon Lookup
            </label>
            <input
              ref={inputRef}
              value={word}
              onChange={e => setWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. photosynthesis, algebraic, democracy…"
              style={{ width: '100%', padding: '16px 20px', borderRadius: 16, fontSize: 15, background: 'var(--surface2)', border: '1.5px solid var(--border)', outline: 'none', transition: 'all 0.2s', fontWeight: 600 }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSearch}
            disabled={!word.trim() || isPending}
            className="btn btn-primary"
            style={{
              height: 52, padding: '0 28px', borderRadius: 16,
              fontWeight: 900, fontSize: 15,
            }}
          >
            {isPending ? '🔍 Scanning...' : '🔍 Search'}
          </motion.button>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {isPending && <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Spinner /></motion.div>}
        {result && !isPending && (
          <motion.div key={result.word} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 36, fontWeight: 950, letterSpacing: '-0.04em', fontFamily: 'var(--font-head)', color: 'var(--text)' }}>{result.word}</h2>
                    {result.phonetic && (
                      <span style={{ fontSize: 16, color: 'var(--text4)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>/{result.phonetic}/</span>
                    )}
                    <TTSBtn text={result.word} lang="en" />
                    {result.audioUrl && (
                      <motion.button
                        whileHover={{ scale: 1.1, background: 'var(--primary)' }} whileTap={{ scale: 0.9 }}
                        onClick={() => new Audio(result.audioUrl).play()}
                        style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', color: 'var(--primary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.22s' }}
                        title="Play pronunciation"
                      >🎧</motion.button>
                    )}
                  </div>
                </div>
              </div>

              {/* Meanings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {result.meanings.map((m, mi) => (
                  <div key={mi}>
                    <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--primary)', marginBottom: 16, borderBottom: '1px solid var(--border)', pb: 8, display: 'inline-block' }}>
                      {m.partOfSpeech}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {m.definitions.map((d, di) => (
                        <div key={di} style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }} className="floating-card">
                          <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.75, fontWeight: 500 }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--primary)', marginRight: 12 }}>0{di + 1}</span>
                            {d.definition}
                          </div>
                          {d.example && (
                            <div style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic', marginTop: 12, paddingLeft: 12, borderLeft: '2px solid var(--primary)', opacity: 0.8 }}>
                              "{d.example}"
                            </div>
                          )}
                          {d.synonyms?.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                              {d.synonyms.map(s => (
                                <motion.span key={s} 
                                  whileHover={{ scale: 1.05, y: -2 }}
                                  onClick={() => { setWord(s); lookup(); }}
                                  style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {s}
                                </motion.span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
        {!result && !isPending && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed var(--border)', borderRadius: 20, color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Dictionary Lookup</div>
            <div style={{ fontSize: 13 }}>Search for any English word to get definitions, pronunciation, and examples.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 2. WIKISNAP
// ════════════════════════════════════════════════════════════
function WikiSnapTab() {
  const [query, setQuery]   = useState('');
  const [result, setResult] = useState(null);
  const { language }        = useUIStore();
  const { isSpeaking, isPaused, isSupported, toggle } = useTextToSpeech();

  const { mutate: search, isPending } = useMutation({
    mutationFn: () => toolsAPI.wikipedia(query.trim(), language),
    onSuccess: ({ data }) => setResult(data),
    onError:   () => { toast.error('Article not found. Try a different search term.'); setResult(null); },
  });

  const SUGGESTIONS = ['Photosynthesis', 'Pythagorean theorem', 'Ancient Egypt', 'Solar system', 'World War II', 'DNA', 'French Revolution', 'Newton laws'];

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Search Wikipedia
            </label>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && query.trim() && search()}
              placeholder="e.g. photosynthesis, World War II, Pythagoras…"
              style={{ width: '100%', padding: '14px 18px', borderRadius: 14, fontSize: 14, background: 'var(--surface2)', border: '1.5px solid var(--border2)' }}
            />
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => query.trim() && search()}
            disabled={!query.trim() || isPending}
            style={{ height: 50, padding: '0 24px', borderRadius: 14, background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: (!query.trim() || isPending) ? 0.6 : 1 }}
          >
            {isPending ? '🔎…' : '🔎 Find'}
          </motion.button>
        </div>
        {/* Quick suggestions */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {SUGGESTIONS.map(s => (
            <motion.span key={s} whileHover={{ scale: 1.04 }}
              onClick={() => { setQuery(s); }}
              style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontWeight: 600 }}>
              {s}
            </motion.span>
          ))}
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {isPending && <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Spinner /></motion.div>}
        {result && !isPending && (
          <motion.div key={result.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {result.thumbnail && (
                  <img src={result.thumbnail} alt={result.title}
                    style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 14, flexShrink: 0, border: '1px solid var(--border)' }} />
                )}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{result.title}</h2>
                    {isSupported && (
                      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                        onClick={() => toggle(result.summary, result.lang)}
                        style={{ width: 32, height: 32, borderRadius: 9, background: isSpeaking && !isPaused ? 'rgba(16,185,129,0.15)' : 'var(--surface2)', border: `1px solid ${isSpeaking && !isPaused ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, color: isSpeaking && !isPaused ? '#10B981' : 'var(--text3)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Read aloud"
                      >{isSpeaking && !isPaused ? '⏸' : '🔊'}</motion.button>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 16 }}>{result.summary}</p>
                  <a href={result.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--primary-light)', padding: '6px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', textDecoration: 'none' }}>
                    📚 Read Full Article on Wikipedia →
                  </a>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        {!result && !isPending && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed var(--border)', borderRadius: 20, color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>WikiSnap</div>
            <div style={{ fontSize: 13 }}>Instant Wikipedia summaries. Search any topic to get a quick overview.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 3. TRIVIA BOOST
// ════════════════════════════════════════════════════════════
function TriviaBoostTab() {
  const [subject,    setSubject]    = useState('mathematics');
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz,       setQuiz]       = useState(null);
  const [answers,    setAnswers]    = useState({});
  const [submitted,  setSubmitted]  = useState(false);

  const { mutate: fetchTrivia, isPending } = useMutation({
    mutationFn: () => toolsAPI.trivia(subject, 5, difficulty),
    onSuccess:  ({ data }) => { setQuiz(data); setAnswers({}); setSubmitted(false); },
    onError:    () => toast.error('Could not load trivia questions. Try again!'),
  });

  const score    = quiz ? quiz.questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const scorePct = quiz ? Math.round((score / quiz.questions.length) * 100) : 0;

  const SUBJECTS = [
    { key: 'mathematics', label: '📐 Maths' },
    { key: 'science',     label: '🔬 Science' },
    { key: 'geography',   label: '🌍 Geography' },
    { key: 'history',     label: '📜 History' },
    { key: 'computers',   label: '💻 Computers' },
    { key: 'general',     label: '🎯 General' },
  ];

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Config */}
      <Card>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subject</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUBJECTS.map(s => (
                <button key={s.key} onClick={() => setSubject(s.key)}
                  style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: subject === s.key ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit', background: subject === s.key ? 'linear-gradient(135deg, var(--primary), var(--brand-600))' : 'var(--surface2)', color: subject === s.key ? '#fff' : 'var(--text2)', border: `1px solid ${subject === s.key ? 'transparent' : 'var(--border)'}` }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Difficulty</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['easy','medium','hard'].map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: difficulty === d ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit', background: difficulty === d ? (d === 'easy' ? '#10B98120' : d === 'medium' ? '#F59E0B20' : '#EF444420') : 'var(--surface2)', color: difficulty === d ? (d === 'easy' ? '#10B981' : d === 'medium' ? '#F59E0B' : '#EF4444') : 'var(--text2)', border: `1px solid ${difficulty === d ? (d === 'easy' ? 'rgba(16,185,129,0.3)' : d === 'medium' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)') : 'var(--border)'}` }}>
                  {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => fetchTrivia()}
            disabled={isPending}
            style={{ height: 48, padding: '0 24px', borderRadius: 14, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            {isPending ? '⏳ Loading…' : '🎲 Get Questions'}
          </motion.button>
        </div>
      </Card>

      {/* Quiz */}
      <AnimatePresence mode="wait">
        {isPending && <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Spinner /></motion.div>}
        {quiz && !isPending && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {submitted && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card style={{ textAlign: 'center', background: `linear-gradient(135deg, ${scorePct >= 80 ? '#10B981' : scorePct >= 50 ? '#F59E0B' : '#EF4444'}12, transparent)`, border: `1px solid ${scorePct >= 80 ? 'rgba(16,185,129,0.3)' : scorePct >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <div style={{ fontSize: 56, fontWeight: 900, color: scorePct >= 80 ? '#10B981' : scorePct >= 50 ? '#F59E0B' : '#EF4444', marginBottom: 6 }}>{scorePct}%</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{scorePct >= 80 ? '🏆 Excellent!' : scorePct >= 50 ? '👍 Good Effort!' : '📚 Keep Studying!'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>{score}/{quiz.questions.length} correct · Source: Open Trivia DB</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button onClick={() => { setSubmitted(false); setAnswers({}); }} style={{ padding: '8px 18px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>↩ Retry</button>
                    <button onClick={() => fetchTrivia()} style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🎲 New Questions</button>
                  </div>
                </Card>
              </motion.div>
            )}

            {quiz.questions.map((q, qi) => {
              const chosen   = answers[qi];
              const isCorrect = submitted && chosen === q.correct;
              const isWrong   = submitted && chosen !== undefined && chosen !== q.correct;
              return (
                <motion.div key={qi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.04 }}>
                  <Card style={{ borderLeft: submitted ? `4px solid ${isCorrect ? '#10B981' : isWrong ? '#EF4444' : 'var(--border)'}` : '4px solid var(--border2)' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                      Q{qi + 1} · {q.category} · {q.difficulty}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, lineHeight: 1.5 }}>{q.question}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {q.options.map((opt, oi) => {
                        const isSelected = chosen === oi;
                        const isCorrectOption = submitted && oi === q.correct;
                        const isWrongSelected = submitted && isSelected && oi !== q.correct;
                        return (
                          <motion.div key={oi} whileHover={!submitted ? { scale: 1.02 } : {}} whileTap={!submitted ? { scale: 0.98 } : {}}
                            onClick={() => !submitted && setAnswers(p => ({ ...p, [qi]: oi }))}
                            style={{
                              padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: isSelected ? 700 : 500,
                              cursor: submitted ? 'default' : 'pointer',
                              border: '1px solid',
                              background: isCorrectOption ? 'rgba(16,185,129,0.12)' : isWrongSelected ? 'rgba(239,68,68,0.12)' : isSelected ? 'rgba(99,102,241,0.12)' : 'var(--surface2)',
                              borderColor: isCorrectOption ? 'rgba(16,185,129,0.4)' : isWrongSelected ? 'rgba(239,68,68,0.4)' : isSelected ? 'var(--primary)' : 'var(--border)',
                              color: isCorrectOption ? '#10B981' : isWrongSelected ? '#EF4444' : isSelected ? 'var(--primary-light)' : 'var(--text)',
                              transition: 'all 0.2s',
                            }}>
                            {opt}
                          </motion.div>
                        );
                      })}
                    </div>
                    {submitted && q.explanation && (
                      <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 9, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, color: 'var(--text2)' }}>
                        💡 {q.explanation}
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}

            {!submitted && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(answers).length < quiz.questions.length}
                style={{ height: 52, borderRadius: 16, background: 'linear-gradient(135deg, var(--primary), var(--brand-600))', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: Object.keys(answers).length < quiz.questions.length ? 0.5 : 1 }}>
                Submit All Answers ✓
              </motion.button>
            )}
          </motion.div>
        )}
        {!quiz && !isPending && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed var(--border)', borderRadius: 20, color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Trivia Boost</div>
            <div style={{ fontSize: 13 }}>Real quiz questions from Open Trivia DB — thousands of curriculum-aligned questions, completely free.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 4. GPA CALCULATOR
// ════════════════════════════════════════════════════════════
const GRADES = [
  { label: 'A+', gpa: 4.0 }, { label: 'A', gpa: 4.0 }, { label: 'A-', gpa: 3.7 },
  { label: 'B+', gpa: 3.3 }, { label: 'B', gpa: 3.0 }, { label: 'B-', gpa: 2.7 },
  { label: 'C+', gpa: 2.3 }, { label: 'C', gpa: 2.0 }, { label: 'C-', gpa: 1.7 },
  { label: 'D+', gpa: 1.3 }, { label: 'D', gpa: 1.0 }, { label: 'F', gpa: 0.0 },
];

function GPACalculatorTab() {
  const [courses, setCourses] = useState([
    { name: '', credits: 3, grade: 'A' },
    { name: '', credits: 3, grade: 'B+' },
    { name: '', credits: 3, grade: 'A-' },
    { name: '', credits: 2, grade: 'B' },
  ]);
  const [prevGPA, setPrevGPA] = useState('');
  const [prevHours, setPrevHours] = useState('');

  const updateCourse = (i, field, val) => {
    setCourses(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  };
  const addCourse = () => setCourses(prev => [...prev, { name: '', credits: 3, grade: 'A' }]);
  const removeCourse = (i) => setCourses(prev => prev.filter((_, idx) => idx !== i));

  // Semester GPA
  const totalPoints = courses.reduce((sum, c) => {
    const g = GRADES.find(gr => gr.label === c.grade);
    return sum + (g ? g.gpa * c.credits : 0);
  }, 0);
  const totalCredits = courses.reduce((sum, c) => sum + Number(c.credits), 0);
  const semesterGPA = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  // Cumulative
  const hasPrev = prevGPA && prevHours && !isNaN(prevGPA) && !isNaN(prevHours);
  const cumulativeGPA = hasPrev
    ? ((parseFloat(prevGPA) * parseFloat(prevHours) + totalPoints) / (parseFloat(prevHours) + totalCredits)).toFixed(2)
    : semesterGPA;

  const gpaColor = (gpa) => {
    const n = parseFloat(gpa);
    if (n >= 3.5) return '#10B981';
    if (n >= 3.0) return '#3B82F6';
    if (n >= 2.0) return '#F59E0B';
    return '#EF4444';
  };

  const gpaLabel = (gpa) => {
    const n = parseFloat(gpa);
    if (n >= 3.7) return 'Excellent';
    if (n >= 3.3) return 'Very Good';
    if (n >= 2.7) return 'Good';
    if (n >= 2.0) return 'Acceptable';
    return 'Needs Improvement';
  };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* GPA Result Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
        <Card style={{ textAlign: 'center', background: `${gpaColor(semesterGPA)}08`, border: `1px solid ${gpaColor(semesterGPA)}30` }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text3)', marginBottom: 8 }}>Semester GPA</div>
          <div style={{ fontSize: 42, fontWeight: 900, fontFamily: 'var(--font-head)', color: gpaColor(semesterGPA), letterSpacing: '-0.04em' }}>{semesterGPA}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: gpaColor(semesterGPA), marginTop: 4 }}>{gpaLabel(semesterGPA)}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{totalCredits} credit hours</div>
        </Card>
        <Card style={{ textAlign: 'center', background: hasPrev ? `${gpaColor(cumulativeGPA)}08` : 'var(--surface2)', border: `1px solid ${hasPrev ? gpaColor(cumulativeGPA) + '30' : 'var(--border)'}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text3)', marginBottom: 8 }}>Cumulative GPA</div>
          <div style={{ fontSize: 42, fontWeight: 900, fontFamily: 'var(--font-head)', color: hasPrev ? gpaColor(cumulativeGPA) : 'var(--text3)', letterSpacing: '-0.04em' }}>{cumulativeGPA}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: hasPrev ? gpaColor(cumulativeGPA) : 'var(--text4)', marginTop: 4 }}>{hasPrev ? gpaLabel(cumulativeGPA) : 'Enter previous data below'}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{hasPrev ? `${(parseFloat(prevHours) + totalCredits)} total hours` : '—'}</div>
        </Card>
      </div>

      {/* Previous GPA input */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 12 }}>Previous Semesters (Optional)</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', display: 'block', marginBottom: 4 }}>Previous GPA</label>
            <input type="number" step="0.01" min="0" max="4" value={prevGPA} onChange={e => setPrevGPA(e.target.value)} placeholder="e.g. 3.25" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 14, fontWeight: 600 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', display: 'block', marginBottom: 4 }}>Previous Credit Hours</label>
            <input type="number" min="0" max="200" value={prevHours} onChange={e => setPrevHours(e.target.value)} placeholder="e.g. 60" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 14, fontWeight: 600 }} />
          </div>
        </div>
      </Card>

      {/* Course List */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Current Semester Courses</div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={addCourse}
            style={{ padding: '6px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366F1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Add Course
          </motion.button>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: 10, padding: '0 4px', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Course Name</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Credits</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Grade</span>
          <span></span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {courses.map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: 10, alignItems: 'center' }}>
              <input value={c.name} onChange={e => updateCourse(i, 'name', e.target.value)} placeholder={`Course ${i + 1}`}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontWeight: 600 }} />
              <select value={c.credits} onChange={e => updateCourse(i, 'credits', Number(e.target.value))}
                style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontWeight: 600 }}>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} hrs</option>)}
              </select>
              <select value={c.grade} onChange={e => updateCourse(i, 'grade', e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontWeight: 700, color: gpaColor(GRADES.find(g => g.label === c.grade)?.gpa?.toFixed(1) || '0') }}>
                {GRADES.map(g => <option key={g.label} value={g.label}>{g.label} ({g.gpa})</option>)}
              </select>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeCourse(i)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </motion.button>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ════════════════════════════════════════════════════════════
const TABS = [
  { key: 'dictionary', label: 'Dictionary',    icon: '📖' },
  { key: 'wikisnap',   label: 'WikiSnap',      icon: '🌍' },
  { key: 'trivia',     label: 'Trivia Boost',  icon: '🎯' },
  { key: 'gpa',        label: 'GPA Calc',      icon: '🎓' },
];

export default function StudyTools() {
  const [activeTab, setActiveTab] = useState('dictionary');
  const { user } = useAuthStore();
  const isUniversity = user?.role === 'university_student' || user?.grade?.toLowerCase().includes('university');

  const visibleTabs = TABS.filter(t => t.key !== 'gpa' || isUniversity);

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon="🛠️"
        title="Study Tools"
        subtitle="Free learning utilities powered by Dictionary API, Wikipedia, and Open Trivia DB — no limits, no API keys."
      />

      {/* Tab Bar */}
      <div style={{ 
        display: 'flex', gap: 8, 
        background: 'rgba(255,255,255,0.03)', 
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border)', 
        borderRadius: 20, padding: 6, 
        width: 'fit-content', marginBottom: 32,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        {visibleTabs.map(t => (
          <motion.button key={t.key} onClick={() => setActiveTab(t.key)}
            whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
            style={{
              padding: '10px 24px', borderRadius: 14, fontSize: 14, fontFamily: 'var(--font-head)',
              fontWeight: activeTab === t.key ? 900 : 700,
              background: activeTab === t.key ? 'var(--primary)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text4)',
              border: 'none',
              boxShadow: activeTab === t.key ? '0 8px 16px rgba(124,58,237,0.3)' : 'none',
              cursor: 'pointer', transition: 'all 0.22s var(--ease)', display: 'flex', alignItems: 'center', gap: 8,
              letterSpacing: '0.02em'
            }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span> {t.label.toUpperCase()}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {activeTab === 'dictionary' && <DictionaryTab />}
          {activeTab === 'wikisnap'   && <WikiSnapTab />}
          {activeTab === 'trivia'     && <TriviaBoostTab />}
          {activeTab === 'gpa'        && <GPACalculatorTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
