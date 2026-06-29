// src/components/files/StudyToolsPanel.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { toolsAPI } from '../../api/index';
import { useUIStore } from '../../context/store';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { Spinner } from '../shared/UI';

// ── TTS Button Component ──────────────────────────────────────────
function TTSBtn({ text, lang }) {
  const { isSpeaking, isPaused, isSupported, toggle } = useTextToSpeech();
  if (!isSupported) return null;
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
      onClick={() => toggle(text, lang)}
      style={{
        width: 34, height: 34, borderRadius: 10,
        background: isSpeaking && !isPaused ? 'rgba(16,185,129,0.15)' : 'var(--surface3)',
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

export default function StudyToolsPanel() {
  const { language } = useUIStore();
  const isAr = language === 'ar';
  
  const [activeSubTab, setActiveSubTab] = useState('dict'); // 'dict' | 'wiki'

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '12px 12px 48px' }}>
      {/* Sub-tabs header */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, background: 'var(--surface2)', padding: 6, borderRadius: 14, border: '1px solid var(--border)', display: 'inline-flex' }}>
        <button
          onClick={() => setActiveSubTab('dict')}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13.5,
            cursor: 'pointer',
            border: 'none',
            background: activeSubTab === 'dict' ? 'var(--surface)' : 'transparent',
            color: activeSubTab === 'dict' ? 'var(--primary-light)' : 'var(--text3)',
            boxShadow: activeSubTab === 'dict' ? 'var(--shadow)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          📖 {isAr ? 'قاموس اللغات' : 'Lexicon Dictionary'}
        </button>
        <button
          onClick={() => setActiveSubTab('wiki')}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13.5,
            cursor: 'pointer',
            border: 'none',
            background: activeSubTab === 'wiki' ? 'var(--surface)' : 'transparent',
            color: activeSubTab === 'wiki' ? 'var(--primary-light)' : 'var(--text3)',
            boxShadow: activeSubTab === 'wiki' ? 'var(--shadow)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          🔍 {isAr ? 'ويكيبيديا السريعة' : 'WikiSnap Lookup'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'dict' ? (
          <motion.div
            key="dict"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.15 }}
          >
            <DictionarySection isAr={isAr} language={language} />
          </motion.div>
        ) : (
          <motion.div
            key="wiki"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.15 }}
          >
            <WikiSnapSection isAr={isAr} language={language} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 1. Dictionary Component Section ───────────────────────────────
function DictionarySection({ isAr, language }) {
  const [word, setWord] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const { mutate: lookup, isPending } = useMutation({
    mutationFn: () => toolsAPI.dictionary(word.trim(), language),
    onSuccess: ({ data }) => setResult(data),
    onError: (err) => {
      const msg = err.response?.data?.error || (isAr ? 'الكلمة غير موجودة' : 'Word not found');
      toast.error(msg);
      setResult(null);
    },
  });

  const handleSearch = () => {
    if (word.trim()) lookup();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="floating-panel" style={{ padding: 28, borderRadius: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text4)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              📚 {isAr ? 'البحث المعجمي الدلالي' : 'Semantic Lexicon Lookup'}
            </label>
            <input
              ref={inputRef}
              value={word}
              onChange={e => setWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={isAr ? "مثال: البناء الضوئي، الجبر، الديمقراطية..." : "e.g. photosynthesis, algebraic, democracy..."}
              style={{ width: '100%', padding: '14px 18px', borderRadius: 12, fontSize: 14, background: 'var(--surface2)', border: '1.5px solid var(--border)', outline: 'none', color: 'var(--text)', fontWeight: 600 }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!word.trim() || isPending}
            style={{
              height: 48, padding: '0 24px', borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(99,102,241,0.2)',
              opacity: (!word.trim() || isPending) ? 0.6 : 1, pointerEvents: isPending ? 'none' : 'auto'
            }}
          >
            {isPending ? <Spinner size="sm" /> : <span>🔍 {isAr ? 'بحث' : 'Search'}</span>}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isPending && <Spinner />}
        {result && !isPending && (
          <motion.div key={result.word} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="floating-panel" style={{ padding: 28, borderRadius: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-head)', color: '#fff' }}>{result.word}</h2>
                {result.phonetic && (
                  <span style={{ fontSize: 15, color: 'var(--text4)', fontFamily: 'var(--font-mono)' }}>/{result.phonetic}/</span>
                )}
                <TTSBtn text={result.word} lang="en" />
                {result.audioUrl && (
                  <button
                    onClick={() => new Audio(result.audioUrl).play()}
                    style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--primary-light)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Play pronunciation"
                  >🎧</button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {result.meanings?.map((m, mi) => (
                <div key={mi}>
                  <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--primary-light)', background: 'rgba(99,102,241,0.08)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', display: 'inline-block', marginBottom: 12 }}>
                    {m.partOfSpeech}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {m.definitions?.map((d, di) => (
                      <div key={di} style={{ padding: 18, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.7, fontWeight: 500 }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--primary-light)', marginRight: 10 }}>0{di + 1}</span>
                          {d.definition}
                        </div>
                        {d.example && (
                          <div style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic', marginTop: 10, paddingLeft: 12, borderLeft: '2.5px solid var(--primary-light)', opacity: 0.9 }}>
                            "{d.example}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {!result && !isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '48px 20px', border: '2px dashed var(--border)', borderRadius: 20, color: 'var(--text3)' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📖</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, color: '#fff' }}>{isAr ? 'البحث عن المفردات' : 'Lexicon dictionary'}</div>
            <div style={{ fontSize: 13 }}>{isAr ? 'ابحث عن أي مصطلح أكاديمي لمعرفة معناه وتفسيره الدقيق.' : 'Lookup academic concepts to read precise definitions and explanations.'}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 2. WikiSnap Component Section ────────────────────────────────
function WikiSnapSection({ isAr, language }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const { isSpeaking, isPaused, isSupported, toggle } = useTextToSpeech();

  const { mutate: search, isPending } = useMutation({
    mutationFn: () => toolsAPI.wikipedia(query.trim(), language),
    onSuccess: ({ data }) => setResult(data),
    onError: () => {
      toast.error(isAr ? 'المقالة غير موجودة. جرب مصطلحاً آخر.' : 'Article not found. Try a different search term.');
      setResult(null);
    },
  });

  const SUGGESTIONS = isAr 
    ? ['التركيب الضوئي', 'نظرية فيثاغورس', 'مصر القديمة', 'المجموعة الشمسية', 'الحرب العالمية الثانية']
    : ['Photosynthesis', 'Pythagorean theorem', 'Ancient Egypt', 'Solar system', 'World War II'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="floating-panel" style={{ padding: 28, borderRadius: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text4)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              🌍 {isAr ? 'البحث السريع في ويكيبيديا' : 'Wikipedia Quick Search'}
            </label>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && query.trim() && search()}
              placeholder={isAr ? "مثال: مجرة درب التبانة، إسحاق نيوتن..." : "e.g. Milky Way, Isaac Newton..."}
              style={{ width: '100%', padding: '14px 18px', borderRadius: 12, fontSize: 14, background: 'var(--surface2)', border: '1.5px solid var(--border)', outline: 'none', color: 'var(--text)', fontWeight: 600 }}
            />
          </div>
          <button
            onClick={() => query.trim() && search()}
            disabled={!query.trim() || isPending}
            style={{
              height: 48, padding: '0 24px', borderRadius: 12,
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(59,130,246,0.2)',
              opacity: (!query.trim() || isPending) ? 0.6 : 1, pointerEvents: isPending ? 'none' : 'auto'
            }}
          >
            {isPending ? <Spinner size="sm" /> : <span>🔍 {isAr ? 'ابحث' : 'Find'}</span>}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {SUGGESTIONS.map(s => (
            <motion.span
              key={s}
              whileHover={{ scale: 1.04, y: -1 }}
              onClick={() => { setQuery(s); }}
              style={{ fontSize: 11.5, padding: '5px 12px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontWeight: 700 }}
            >
              {s}
            </motion.span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isPending && <Spinner />}
        {result && !isPending && (
          <motion.div key={result.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="floating-panel" style={{ padding: 28, borderRadius: 20 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {result.thumbnail && (
                <img src={result.thumbnail} alt={result.title}
                  style={{ width: 130, height: 130, objectFit: 'cover', borderRadius: 14, flexShrink: 0, border: '1px solid var(--border)' }} />
              )}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-head)' }}>{result.title}</h2>
                  {isSupported && (
                    <button
                      onClick={() => toggle(result.summary, result.lang)}
                      style={{ width: 34, height: 34, borderRadius: 10, background: isSpeaking && !isPaused ? 'rgba(16,185,129,0.15)' : 'var(--surface2)', border: `1px solid ${isSpeaking && !isPaused ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, color: isSpeaking && !isPaused ? '#10B981' : 'var(--text3)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Read aloud"
                    >
                      {isSpeaking && !isPaused ? '⏸' : '🔊'}
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 14.5, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 18 }}>{result.summary}</p>
                <a href={result.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: 'var(--primary-light)', padding: '6px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', textDecoration: 'none' }}>
                  📚 {isAr ? 'قراءة المقال الكامل على ويكيبيديا ←' : 'Read Full Article on Wikipedia →'}
                </a>
              </div>
            </div>
          </motion.div>
        )}
        {!result && !isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '48px 20px', border: '2px dashed var(--border)', borderRadius: 20, color: 'var(--text3)' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🌍</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, color: '#fff' }}>WikiSnap</div>
            <div style={{ fontSize: 13 }}>{isAr ? 'ملخصات ويكيبيديا فورية. ابحث عن أي مقالة معرفية بسرعة.' : 'Instant Wikipedia summaries. Search any academic topic to get a quick breakdown.'}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
