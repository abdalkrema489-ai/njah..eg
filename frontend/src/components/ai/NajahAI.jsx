import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/index';
import { useTranslation } from '../../i18n/index';

// ── Markdown-like renderer (no external dep) ──────────────────
function renderMd(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('### ')) return <h4 key={i} style={{ color: '#A78BFA', margin: '10px 0 4px', fontWeight: 800 }}>{line.slice(4)}</h4>;
    if (line.startsWith('## '))  return <h3 key={i} style={{ color: '#818CF8', margin: '14px 0 6px', fontWeight: 900 }}>{line.slice(3)}</h3>;
    if (line.startsWith('# '))   return <h2 key={i} style={{ color: '#6366F1', margin: '18px 0 8px', fontWeight: 900 }}>{line.slice(2)}</h2>;
    if (line.startsWith('- ') || line.startsWith('• ')) return (
      <div key={i} style={{ paddingLeft: 16, color: 'var(--text)', lineHeight: 1.7, margin: '2px 0' }}>
        <span style={{ color: '#6366F1', marginRight: 8 }}>•</span>{line.slice(2)}
      </div>
    );
    if (line.startsWith('**') && line.endsWith('**')) return (
      <div key={i} style={{ fontWeight: 800, color: 'var(--text)', margin: '6px 0' }}>{line.slice(2, -2)}</div>
    );
    if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
    // inline bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <div key={i} style={{ lineHeight: 1.75, color: 'var(--text)', margin: '1px 0' }}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
      </div>
    );
  });
}

const MODES = [
  { id: 'chat',     label: 'AI Chat',      icon: '🤖', desc: 'Ask anything' },
  { id: 'search',   label: 'Web Search',   icon: '🌐', desc: 'Search the internet' },
  { id: 'explain',  label: 'Explain',      icon: '📖', desc: 'Deep explanations' },
  { id: 'homework', label: 'Homework',     icon: '📝', desc: 'Solve & learn' },
  { id: 'news',     label: 'News',         icon: '📰', desc: 'Current events' },
];

const QUICK_PROMPTS = [
  "What is photosynthesis?",
  "Explain Newton's laws of motion",
  "How does the Pythagorean theorem work?",
  "What are the causes of World War I?",
  "Explain DNA replication",
  "ما هي معادلة أينشتاين للطاقة؟",
];

export default function NajahAI() {
  const { lang } = useTranslation();
  const [mode, setMode]           = useState('chat');
  const [messages, setMessages]   = useState([{
    role: 'assistant',
    content: lang === 'ar'
      ? 'مرحباً! أنا نجاح AI — مساعدك الذكي المتصل بالإنترنت. يمكنني البحث، الشرح، وحل الواجبات. كيف يمكنني مساعدتك اليوم؟ 🎓'
      : 'Hello! I\'m Najah AI — your intelligent assistant with real-time internet access. I can search the web, explain concepts, and help with homework. How can I help you today? 🎓',
    sources: []
  }]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [level, setLevel]         = useState('intermediate');
  const [subject, setSubject]     = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      let endpoint, payload;

      if (mode === 'chat') {
        endpoint = '/ai-search/chat';
        payload  = {
          message: userMsg,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          useWebSearch,
          subject: subject || undefined,
        };
      } else if (mode === 'search') {
        endpoint = '/ai-search/search';
        payload  = { query: userMsg, synthesize: true };
      } else if (mode === 'explain') {
        endpoint = '/ai-search/explain';
        payload  = { topic: userMsg, level, language: lang };
      } else if (mode === 'homework') {
        endpoint = '/ai-search/homework';
        payload  = { question: userMsg, subject: subject || 'general', showSteps: true };
      } else if (mode === 'news') {
        endpoint = '/ai-search/news';
        payload  = { topic: userMsg, language: lang };
      }

      const { data } = await client.post(endpoint, payload);

      const content = data.message || data.synthesis || data.explanation ||
                      data.answer  || data.summary   || 'No response received.';
      const sources = data.searchResults || data.sources || [];

      setMessages(prev => [...prev, { role: 'assistant', content, sources }]);
    } catch (err) {
      toast.error('AI service error. Please try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ I encountered an error. Please try again in a moment.',
        sources: []
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{
      display: 'flex', height: '100dvh', maxHeight: '100dvh', overflow: 'hidden',
      background: 'var(--ink)', fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Sidebar ──────────────────────────────────── */}
      <div className="ai-sidebar" style={{
        width: 260, borderRight: '1px solid var(--border)', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>🤖</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text)' }}>Najah AI</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Internet Connected
              </div>
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700, padding: '0 8px', marginBottom: 8 }}>MODE</div>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none',
              background: mode === m.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: mode === m.id ? '#818CF8' : 'var(--text2)',
              cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
              fontWeight: mode === m.id ? 700 : 500, fontSize: 13,
              borderLeft: mode === m.id ? '3px solid #6366F1' : '3px solid transparent',
              marginBottom: 2,
            }}>
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <div>
                <div>{m.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>{m.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Options */}
        <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700, padding: '0 8px', marginBottom: 8 }}>OPTIONS</div>

          {mode === 'chat' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }}>
              <div onClick={() => setUseWebSearch(!useWebSearch)} style={{
                width: 36, height: 20, borderRadius: 10,
                background: useWebSearch ? '#6366F1' : 'var(--surface3)',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: useWebSearch ? 18 : 3, transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600 }}>
                🌐 Web Search
              </span>
            </label>
          )}

          {mode === 'explain' && (
            <div style={{ padding: '0 8px' }}>
              <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 6 }}>Level</div>
              {['beginner', 'intermediate', 'advanced'].map(l => (
                <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                  <input type="radio" checked={level === l} onChange={() => setLevel(l)} />
                  <span style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>{l}</span>
                </label>
              ))}
            </div>
          )}

          <div style={{ padding: '0 8px', marginTop: 8 }}>
            <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 6 }}>Subject (optional)</div>
            <select value={subject} onChange={e => setSubject(e.target.value)} style={{
              width: '100%', padding: '7px 10px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 12, outline: 'none',
            }}>
              <option value="">All Subjects</option>
              {['Mathematics','Physics','Chemistry','Biology','Arabic','English','History','Geography','Computer Science'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear chat */}
        <div style={{ padding: '12px', marginTop: 'auto' }}>
          <button onClick={() => setMessages([{
            role: 'assistant',
            content: 'Chat cleared! How can I help you? 🎓',
            sources: []
          }])} style={{
            width: '100%', padding: '10px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#F87171', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>🗑️ Clear Chat</button>
        </div>
      </div>

      {/* ── Main chat area ──────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          padding: '14px 24px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                {MODES.find(m => m.id === mode)?.icon} {MODES.find(m => m.id === mode)?.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {mode === 'chat' && useWebSearch && '🌐 Web search enabled — responses include live internet data'}
                {mode === 'chat' && !useWebSearch && 'Powered by Google Gemini 2.0 Flash'}
                {mode === 'search' && '🌐 Searching the real-time web and synthesizing results'}
                {mode === 'explain' && `📖 Detailed ${level} level explanations`}
                {mode === 'homework' && '📝 Step-by-step solutions with learning focus'}
                {mode === 'news' && '📰 Latest news from the internet'}
              </div>
            </div>
            {useWebSearch && mode === 'chat' && (
              <div style={{
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#34D399', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              }}>🌐 LIVE</div>
            )}
          </div>
          {/* Mobile Mode selector tabs */}
          <div className="ai-mobile-modes" style={{ display: 'none' }}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`ai-mobile-mode-btn ${mode === m.id ? 'active' : ''}`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: 16, WebkitOverflowScrolling: 'touch' }}>
          {/* Quick prompts when empty */}
          {messages.length === 1 && (
            <div className="ai-quick-prompts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: 10, marginBottom: 8 }}>
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }} className="ai-quick-prompt-btn" style={{
                  padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer',
                  fontSize: 12, textAlign: 'left', lineHeight: 1.4,
                }}>💡 {p}</button>
              ))}
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', gap: 12,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #10B981, #059669)'
                    : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>{msg.role === 'user' ? '👤' : '🤖'}</div>

                <div style={{ maxWidth: 'min(85%, calc(100vw - 32px))' }}>
                  <div style={{
                    padding: '14px 16px', borderRadius: 16,
                    background: msg.role === 'user' ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                    borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                    borderTopLeftRadius:  msg.role === 'user' ? 16 : 4,
                  }}>
                    {msg.role === 'user'
                      ? <p style={{ margin: 0, color: 'var(--text)', fontSize: 14, lineHeight: 1.65 }}>{msg.content}</p>
                      : <div style={{ fontSize: 14, lineHeight: 1.75 }}>{renderMd(msg.content)}</div>
                    }
                  </div>

                  {/* Sources */}
                  {msg.sources?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>🔗 SOURCES</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {msg.sources.slice(0, 5).map((s, si) => s.url && (
                          <a key={si} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                            fontSize: 11, color: '#818CF8', background: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.2)', padding: '3px 10px',
                            borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
                          }}>
                            🌐 {s.title || s.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>🤖</div>
              <div style={{
                padding: '14px 18px', background: 'var(--surface)', borderRadius: 16,
                border: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center',
              }}>
                {[0, 1, 2].map(d => (
                  <motion.div key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366F1' }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />
                ))}
                <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 6 }}>
                  {mode === 'search' ? 'Searching the web...' : 'Thinking...'}
                </span>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={
                mode === 'chat'    ? (lang === 'ar' ? 'اسأل أي سؤال...' : 'Ask anything...') :
                mode === 'search'  ? 'Enter search query...' :
                mode === 'explain' ? 'Enter topic to explain...' :
                mode === 'homework'? 'Paste your homework question...' :
                'Enter news topic...'
              }
              rows={1}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 14,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'none',
                fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
              }}
            />
            <motion.button
              onClick={send} disabled={loading || !input.trim()}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{
                width: 46, height: 46, borderRadius: 12, border: 'none',
                background: loading || !input.trim()
                  ? 'var(--surface3)'
                  : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: input.trim() ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
              }}>
              {loading ? '⏳' : '➤'}
            </motion.button>
          </div>
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 11, marginTop: 8 }}>
            {mode === 'chat' && useWebSearch ? '🌐 Connected to real-time internet' : 'Press Enter to send · Shift+Enter for new line'}
          </div>
        </div>
      </div>
    </div>
  );
}
