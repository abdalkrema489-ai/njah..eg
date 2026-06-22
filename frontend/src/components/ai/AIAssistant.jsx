// src/components/ai/AIAssistant.jsx — Najah AI with Gemini streaming + full features
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import { aiAPI, filesAPI, aiClient } from '../../api/index';
import { useUIStore, useAuthStore } from '../../context/store';
import { Spinner } from '../shared/UI';
import HomeworkCorrector from './HomeworkCorrector';
import StudyPlanGenerator from './StudyPlanGenerator';

// ── DOMPurify config ──────────────────────────────────────
const SANITIZE_OPTS = {
  ALLOWED_TAGS: [
    'h2', 'h3', 'h4', 'p', 'br',
    'strong', 'em', 'b', 'i',
    'ul', 'ol', 'li',
    'pre', 'code',
    'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: ['class'],
  FORBID_TAGS:  ['script', 'style', 'iframe', 'form', 'input'],
  FORBID_ATTR:  ['onerror', 'onload', 'onclick', 'onmouseover'],
};

// ── Markdown-lite renderer ─────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="ai-code"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="ai-h2">$1</h2>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ai-li-num">$1</li>')
    .replace(/^[-•] (.+)$/gm, '<li class="ai-li">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

function MsgContent({ text }) {
  const cleanHtml = DOMPurify.sanitize(renderMarkdown(text || ''), SANITIZE_OPTS);
  return (
    <div
      className="ai-msg-content"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

// ── Typing dots ───────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}
        />
      ))}
    </div>
  );
}

// ── AI status badge ───────────────────────────────────────
function StatusBadge({ provider }) {
  const labels = {
    gemini:           { label: '✨ External AI', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
    najah_inhouse:    { label: '🧠 Najah Massive AI', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    najah_heuristics: { label: '⚡ Core Heuristics', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    error:            { label: '❌ Error', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  };
  const b = labels[provider] || labels.najah_inhouse;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      padding: '2px 8px', borderRadius: 20,
      color: b.color, background: b.bg,
    }}>{b.label}</span>
  );
}

// ── Individual message bubble ─────────────────────────────
function MessageBubble({ msg, onCopy, onSpeak, isSpeaking }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      {!isUser && (
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, boxShadow: '0 0 16px rgba(99,102,241,0.35)',
        }}>🎓</div>
      )}

      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!isUser && msg.provider && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>Najah AI</span>
            <StatusBadge provider={msg.provider} />
          </div>
        )}

        <div style={{
          padding: isUser ? '12px 18px' : '14px 18px',
          borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
            : 'var(--surface2)',
          color: isUser ? '#fff' : 'var(--text)',
          fontSize: 14, lineHeight: 1.7,
          border: isUser ? 'none' : '1px solid var(--border)',
          boxShadow: isUser
            ? '0 4px 20px rgba(99,102,241,0.3)'
            : '0 2px 8px rgba(0,0,0,0.08)',
          position: 'relative',
        }}>
          {msg.streaming ? (
            <div>
              <MsgContent text={msg.content} />
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                style={{ color: 'var(--accent)', fontWeight: 700 }}
              >|</motion.span>
            </div>
          ) : (
            <MsgContent text={msg.content} />
          )}
        </div>

        {/* Toolbar for AI messages */}
        {!isUser && !msg.streaming && msg.content && (
          <div style={{ display: 'flex', gap: 6, marginTop: 2, paddingLeft: 4 }}>
            {[
              { icon: copied ? '✅' : '📋', action: handleCopy, tip: 'Copy' },
              { icon: isSpeaking ? '🔇' : '🔊', action: () => onSpeak(msg.content), tip: 'Read aloud' },
            ].map(btn => (
              <button key={btn.tip} onClick={btn.action} title={btn.tip}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  cursor: 'pointer', fontSize: 13, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--text3)',
                }}>{btn.icon}</button>
            ))}
            <span style={{ fontSize: 10, color: 'var(--text3)', alignSelf: 'center', marginLeft: 2 }}>
              {msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Suggestions row ───────────────────────────────────────
function SuggestionsRow({ suggestions, onSelect }) {
  if (!suggestions?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, paddingLeft: 46 }}
    >
      {suggestions.map((s, i) => (
        <motion.button key={i}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(s)}
          style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
            color: '#6366F1', cursor: 'pointer',
          }}
        >{s}</motion.button>
      ))}
    </motion.div>
  );
}

// ── Main AI Chat Panel ────────────────────────────────────
function AIChat() {
  const { user } = useAuthStore();
  const { language } = useUIStore();
  const isAr = language === 'ar';

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: isAr
      ? '👋 مرحباً! أنا **Najah AI** — مساعدك الذكي المخصص لكل مواد المنهج المصري.\n\nيمكنني مساعدتك في **الرياضيات، العلوم، اللغة العربية، الإنجليزية، الدراسات الاجتماعية** وأكثر!\n\n🎯 اسألني أي سؤال دراسي وسأشرح لك خطوة بخطوة... ابدأ!'
      : '👋 Hello! I\'m **Najah AI** — your intelligent study companion for the Egyptian curriculum.\n\nI can help with **Mathematics, Science, Arabic, English, Social Studies** and much more!\n\n🎯 Ask me any study question and I\'ll explain it step by step. Let\'s start!',
    provider: 'gemini', ts: new Date(),
  }]);

  const [convId, setConvId]           = useState(null);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchMode, setSearchMode]   = useState(false);
  const [speaking, setSpeaking]       = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [geminiOk, setGeminiOk]       = useState(null);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const speechRef  = useRef(null);
  const recognitionRef = useRef(null);

  // Check Gemini status
  useQuery({
    queryKey: ['ai-provider'],
    queryFn: async () => {
      const { data } = await aiAPI.getProvider();
      setGeminiOk(data.gemini?.available ?? false);
      return data;
    },
    staleTime: 60000,
  });

  const { data: histData, refetch: refetchHistory } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => aiAPI.getConversations(),
    select: d => d.data.conversations || [],
  });
  const conversations = histData || [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Speech Recognition ──
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language === 'ar' ? 'ar-EG' : 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
      };

      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    }
  }, [language]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return toast.error('Voice input is not supported in your browser');
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        toast.error('Could not start voice recognition');
      }
    }
  };

  // ── TTS ──
  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return toast.error('TTS not supported');
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const plain = text.replace(/[*#`_]/g, '').replace(/<[^>]+>/g, '');
    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang  = language === 'ar' ? 'ar-EG' : 'en-US';
    utter.rate  = 0.95;
    utter.onend = () => setSpeaking(false);
    speechRef.current = utter;
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [speaking, language]);

  // ── Send via streaming SSE ──
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setSuggestions([]);
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: msg, ts: new Date() }]);

    // Search mode — use /search endpoint
    if (searchMode) {
      try {
        const { data } = await aiAPI.search({ query: msg, language });
        setMessages(prev => [...prev, {
          role: 'assistant', content: data.answer,
          provider: 'gemini', ts: new Date(),
        }]);
      } catch {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: isAr ? '❌ فشل البحث. تأكد من تفعيل Gemini API.' : '❌ Search failed. Make sure Gemini API is configured.',
          provider: 'error', ts: new Date(),
        }]);
      } finally { setLoading(false); }
      return;
    }

    // Streaming chat
    const placeholderIdx = Date.now();
    setMessages(prev => [...prev, {
      id: placeholderIdx, role: 'assistant', content: '',
      provider: 'gemini', ts: new Date(), streaming: true,
    }]);

    try {
      let rawAPI = import.meta.env.VITE_API_URL;
      if (import.meta.env.PROD && rawAPI && rawAPI.includes('localhost')) {
        rawAPI = '/api';
      }
      const API = rawAPI || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

      // Helper: run the SSE fetch; if 401, refresh token once and retry
      const doStreamFetch = async () => {
        let token = useAuthStore.getState().token || localStorage.getItem('token');
        let resp = await fetch(`${API}/ai/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ message: msg, conversationId: convId, language, withFollowUps: true }),
        });
        if (resp.status === 401) {
          const ref = localStorage.getItem('refresh');
          if (!ref) { useAuthStore.getState().logout(); throw new Error('Session expired'); }
          try {
            const r = await fetch(`${API}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh: ref }),
            });
            const refreshData = await r.json();
            if (!r.ok) throw new Error('Refresh failed');
            token = refreshData.token;
            localStorage.setItem('token', token);
            useAuthStore.setState({ token });
            if (window.__najahSocket) {
              window.__najahSocket.auth.token = token;
              if (!window.__najahSocket.connected) window.__najahSocket.connect();
            }
          } catch { useAuthStore.getState().logout(); throw new Error('Session expired — please log in again'); }
          resp = await fetch(`${API}/ai/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message: msg, conversationId: convId, language, withFollowUps: true }),
          });
        }
        return resp;
      };

      const resp = await doStreamFetch();
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let newConvId = convId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              fullText += data.chunk;
              setMessages(prev => prev.map(m =>
                m.id === placeholderIdx ? { ...m, content: fullText } : m
              ));
            }
            if (data.done) {
              setMessages(prev => prev.map(m =>
                m.id === placeholderIdx
                  ? { ...m, content: data.fullText || fullText, streaming: false }
                  : m
              ));
            }
            if (data.error) throw new Error(data.error);
          } catch {}
        }
      }

      // Fetch follow-up suggestions
      if (geminiOk) {
        try {
          const { data: chatData } = await aiAPI.chat({
            message: `Generate 3 short follow-up questions (as JSON {"suggestions":["...","...","..."]}) the student might ask after learning: "${fullText.slice(0, 200)}"`,
            conversationId: null, language,
          });
          // Try to parse suggestions from reply
          const match = chatData.reply?.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            setSuggestions(parsed.suggestions || []);
          }
        } catch {}
      }

      refetchHistory();
    } catch (err) {
      // Fallback to non-streaming
      try {
        const { data } = await aiAPI.chat({ message: msg, conversationId: convId, language });
        setConvId(data.conversationId);
        setMessages(prev => prev.map(m =>
          m.id === placeholderIdx
            ? { ...m, content: data.reply, provider: data.provider || 'gemini', streaming: false }
            : m
        ));
        if (data.suggestions?.length) setSuggestions(data.suggestions);
        refetchHistory();
      } catch {
        setMessages(prev => prev.map(m =>
          m.id === placeholderIdx
            ? { ...m, content: isAr ? '❌ عذراً، حدث خطأ. حاول مرة أخرى.' : '❌ Something went wrong. Please try again.', provider: 'error', streaming: false }
            : m
        ));
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, convId, language, searchMode, geminiOk, refetchHistory]);

  const loadConversation = async (id) => {
    try {
      const { data } = await aiAPI.getConversation(id);
      const conv = data.conversation;
      setConvId(conv._id);
      setMessages((conv.messages || []).map(m => ({
        role: m.role, content: m.content, ts: m.createdAt, provider: 'gemini',
      })));
      setSuggestions([]);
      setShowHistory(false);
      toast.success(isAr ? 'تم تحميل المحادثة' : 'Conversation loaded');
    } catch { toast.error('Failed to load'); }
  };

  const QUICK_PROMPTS = isAr ? [
    '📐 اشرح كيفية حل المعادلات التربيعية',
    '🔬 ما هو التمثيل الضوئي؟',
    '📝 أمثلة على الجملة الاسمية',
    '💡 كيف أذاكر بفعالية؟',
    '⚡ اختبرني في الفيزياء',
    '🌍 تاريخ ثورة 1952',
  ] : [
    '📐 Explain quadratic equations step by step',
    '🔬 What is photosynthesis and how does it work?',
    '📝 English grammar: conditional sentences',
    '💡 Give me a study plan for final exams',
    '⚡ Quiz me on chemistry',
    '🌍 Tell me about the 1952 Egyptian Revolution',
  ];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 90px)', gap: 0, overflow: 'hidden' }}>

      {/* ── Sidebar: History ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="floating-panel"
            style={{
              margin: '12px 0 12px 12px',
              borderRadius: 24,
              display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
              backdropFilter: 'var(--glass-blur)'
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{isAr ? 'المحادثات' : 'History'}</span>
              <button onClick={() => { setMessages([{ role:'assistant', content: isAr ? 'محادثة جديدة! اسألني أي شيء.' : 'New chat! Ask me anything.', provider:'gemini', ts:new Date() }]); setConvId(null); setSuggestions([]); }}
                style={{ padding: '6px 12px', borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                + {isAr ? 'جديد' : 'New'}
              </button>
            </div>
            <div className="scroll-y" style={{ flex: 1 }}>
              {conversations.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  {isAr ? 'لا توجد محادثات سابقة' : 'No conversations yet'}
                </div>
              ) : conversations.map(c => (
                <div key={c._id} onClick={() => loadConversation(c._id)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: convId === c._id ? 'rgba(99,102,241,0.10)' : 'transparent',
                    borderLeft: convId === c._id ? '3px solid #6366F1' : '3px solid transparent',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || 'Chat'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div className="floating-panel" style={{
          margin: '12px 12px 0 12px',
          padding: '14px 24px',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 12,
          backdropFilter: 'var(--glass-blur)'
        }}>
          <motion.button 
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setShowHistory(v => !v)}
            style={{ width: 34, height: 34, borderRadius: 10, background: showHistory ? 'rgba(99,102,241,0.15)' : 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 16 }}>
            {showHistory ? '✕' : '☰'}
          </motion.button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>🎓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, fontFamily: 'var(--font-head)' }}>Najah AI</div>
            <div style={{ fontSize: 11, color: geminiOk ? '#10B981' : '#F59E0B', fontWeight: 600 }}>
              {geminiOk === null ? '⏳ Connecting...' : '● Najah Massive In-House AI · Online'}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSearchMode(v => !v)}
            className="floating-card"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 20,
              background: searchMode ? 'linear-gradient(135deg,#06B6D4,#0891B2)' : 'var(--glass)',
              color: searchMode ? '#fff' : 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            }}
          >
            🔍 {isAr ? 'بحث' : 'Search'}
            {searchMode && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 10 }}>ON</span>}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={async () => {
              try {
                await aiClient.post('/ai/clear-memory');
                toast.success(isAr ? '🗑️ تم مسح ذاكرة AI بنجاح' : '🗑️ AI memory cleared');
              } catch {
                toast.error(isAr ? 'فشل مسح الذاكرة' : 'Failed to clear memory');
              }
            }}
            title={isAr ? 'امسح ما يتذكره AI عنك من محادثات سابقة' : 'Clear what AI remembers about you across sessions'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 20,
              background: 'var(--glass)', border: '1px solid var(--border)',
              color: 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            🗑️ {isAr ? 'مسح الذاكرة' : 'Clear Memory'}
          </motion.button>
        </div>


        {/* Messages area */}
        <div className="scroll-y" style={{
          flex: 1, padding: '24px 28px', overflowY: 'auto',
          background: 'var(--ink2)',
          backgroundImage: 'radial-gradient(ellipse at 10% 10%, rgba(99,102,241,0.05) 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, rgba(139,92,246,0.04) 0%, transparent 50%)',
        }}>
          {/* Quick prompts (when only the welcome message is shown) */}
          {messages.length === 1 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 46 }}>
                {isAr ? 'جرب هذه الأسئلة' : 'Try these'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 46 }}>
                {QUICK_PROMPTS.map((p, i) => (
                  <motion.button key={i}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendMessage(p)}
                    style={{
                      padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text2)', cursor: 'pointer',
                    }}>{p}</motion.button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <MessageBubble
                msg={msg}
                onCopy={() => toast.success(isAr ? 'تم النسخ!' : 'Copied!')}
                onSpeak={speak}
                isSpeaking={speaking}
              />
              {/* Show suggestions after the last AI message */}
              {!msg.streaming && msg.role === 'assistant' && i === messages.length - 1 && suggestions.length > 0 && (
                <SuggestionsRow suggestions={suggestions} onSelect={sendMessage} />
              )}
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎓</div>
              <div style={{ background: 'var(--surface2)', borderRadius: '20px 20px 20px 4px', border: '1px solid var(--border)' }}>
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="floating-panel" style={{
          margin: '0 12px 12px 12px',
          padding: '16px 24px 20px', 
          borderRadius: 24,
          backdropFilter: 'var(--glass-blur)'
        }}>
          {searchMode && (
            <div style={{ fontSize: 12, color: '#06B6D4', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔍 {isAr ? 'وضع البحث مفعّل — اسأل أي سؤال واقعي' : 'Web Search Mode — ask any real-world question'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={searchMode
                  ? (isAr ? 'ابحث عن أي موضوع...' : 'Search any topic...')
                  : (isAr ? 'اكتب سؤالك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)' : 'Ask anything... (Enter to send, Shift+Enter for new line)')}
                rows={1}
                className="floating-card"
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 20, fontSize: 14,
                  resize: 'none', outline: 'none', lineHeight: 1.5,
                  maxHeight: 140, overflowY: 'auto', color: 'var(--text)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={toggleVoice}
              title={isAr ? 'إدخال صوتي' : 'Voice Input'}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: isRecording ? '#EF4444' : 'var(--surface)',
                border: '1px solid var(--border)',
                color: isRecording ? '#fff' : 'var(--text)',
                cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              🎤
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: loading || !input.trim()
                  ? 'var(--surface)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                border: '1px solid var(--border)',
                color: loading || !input.trim() ? 'var(--text3)' : '#fff',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: loading || !input.trim() ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
                flexShrink: 0,
              }}
            >
              {loading ? <Spinner size="sm" /> : '➤'}
            </motion.button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
            {isAr ? 'Najah AI يغطي كامل المنهج المصري من الصف الأول الابتدائي حتى الثانوية العامة' : 'Najah AI covers the full Egyptian curriculum — Primary 1 through Secondary 3'}
          </div>
        </div>
      </div>

      <style>{`
        .ai-msg-content h2.ai-h2{font-size:1.2em;font-weight:800;margin:10px 0 6px;color:inherit}
        .ai-msg-content h3.ai-h3{font-size:1.05em;font-weight:700;margin:8px 0 4px;color:inherit}
        .ai-msg-content h4.ai-h4{font-size:1em;font-weight:700;margin:6px 0 3px;color:inherit}
        .ai-msg-content li.ai-li,.ai-msg-content li.ai-li-num{margin:3px 0;padding-left:4px}
        .ai-msg-content pre.ai-code{background:rgba(0,0,0,0.2);border-radius:10px;padding:12px;overflow-x:auto;font-size:13px;margin:8px 0;font-family:monospace}
        .ai-msg-content code.ai-inline-code{background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:5px;font-family:monospace;font-size:0.9em}
        .ai-msg-content strong{font-weight:800}
      `}</style>
    </div>
  );
}

// ── Quiz, Study Plan, Summarizer, YouTube panels ──────────────────
function QuizPanel() {
  const [subject, setSubject] = useState('mathematics');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(10);
  const [language] = [useUIStore().language];
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const generate = async () => {
    setLoading(true); setQuiz(null); setAnswers({}); setSubmitted(false); setScore(null);
    try {
      const { data } = await aiAPI.generateQuiz({ subject, difficulty, count, language });
      setQuiz(data);
    } catch { toast.error('Failed to generate quiz'); }
    finally { setLoading(false); }
  };

  const submit = async () => {
    const correct = quiz.questions.filter((q, i) => answers[i] === q.correct).length;
    const total = quiz.questions.length;
    setScore({ correct, total, pct: Math.round((correct / total) * 100) });
    setSubmitted(true);
    try {
      await aiAPI.submitQuiz({ subject, topic: '', totalQ: total, correctQ: correct, difficulty, questions: quiz.questions });
    } catch {}
  };

  const SUBJECTS = ['mathematics','science','arabic','english','social_studies','islamic_studies'];

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🧠 AI Quiz Generator</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>Powered by Gemini 2.0 — intelligent questions tailored to the Egyptian curriculum</p>
      </div>

      {!quiz && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, display: 'flex', flex: 1, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>SUBJECT</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14 }}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_',' ')}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>DIFFICULTY</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14 }}>
              {['easy','medium','hard'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>QUESTIONS</label>
            <select value={count} onChange={e => setCount(+e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14 }}>
              {[5,10,15,20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={generate} disabled={loading}
              style={{ padding: '10px 28px', borderRadius: 14, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              {loading ? <Spinner size="sm" /> : '✨ Generate'}
            </motion.button>
          </div>
        </div>
      )}

      {quiz && !submitted && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{quiz.questions?.length} questions · {subject} · {difficulty}</span>
            <button onClick={() => setQuiz(null)} style={{ padding: '6px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', fontSize: 13 }}>← Back</button>
          </div>
          {quiz.questions?.map((q, i) => (
            <motion.div key={i} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{i+1}. {q.question}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {q.options?.map((opt, oi) => (
                  <button key={oi} onClick={() => setAnswers(a => ({...a, [i]: oi}))}
                    style={{
                      padding: '10px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', fontSize: 13,
                      background: answers[i] === oi ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                      border: '2px solid', borderColor: answers[i] === oi ? '#6366F1' : 'var(--border)',
                      color: 'var(--text)', fontWeight: answers[i] === oi ? 700 : 400, transition: 'all 0.15s',
                    }}>{opt}</button>
                ))}
              </div>
            </motion.div>
          ))}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={submit} disabled={Object.keys(answers).length < quiz.questions?.length}
            style={{ width: '100%', padding: '14px', borderRadius: 16, background: 'linear-gradient(135deg,#10B981,#059669)', color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:16, boxShadow:'0 4px 16px rgba(16,185,129,0.3)', marginTop:8 }}>
            Submit Quiz →
          </motion.button>
        </div>
      )}

      {submitted && score && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ background: 'var(--surface2)', border: '2px solid var(--border2)', borderRadius: 24, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{score.pct >= 80 ? '🏆' : score.pct >= 60 ? '😊' : '📚'}</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: score.pct >= 80 ? '#10B981' : score.pct >= 60 ? '#F59E0B' : '#EF4444' }}>{score.pct}%</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8, marginBottom: 24 }}>{score.correct} / {score.total} correct</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => { setQuiz(null); setAnswers({}); setSubmitted(false); setScore(null); }}
              style={{ padding: '10px 24px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }}>
              New Quiz
            </button>
            <button onClick={() => { setAnswers({}); setSubmitted(false); setScore(null); }}
              style={{ padding: '10px 24px', borderRadius: 14, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', border:'none', cursor:'pointer', fontWeight:600 }}>
              Retry ↺
            </button>
          </div>
          {/* Show explanation */}
          <div style={{ marginTop: 24, textAlign: 'left' }}>
            {quiz.questions?.map((q, i) => {
              const ua = answers[i]; const correct = q.correct;
              return (
                <div key={i} style={{ background: ua===correct?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)', border:`1px solid ${ua===correct?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                  <div style={{ fontWeight:700, marginBottom:4, color: ua===correct?'#10B981':'#EF4444' }}>{ua===correct?'✓':'✗'} {q.question}</div>
                  <div style={{ fontSize:13, color:'var(--text3)' }}>💡 {q.explanation}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Summarize PDF Panel ──────────────────────────────────────
function SummarizePanel() {
  const { language } = useUIStore();
  const isAr = language === 'ar';
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  useQuery({
    queryKey: ['files-for-ai'],
    queryFn: async () => {
      const { filesAPI } = await import('../../api/index');
      const { data } = await filesAPI.list({ limit: 50 });
      setFiles((data?.files || []).filter(f => f.mime_type === 'application/pdf'));
      return data;
    },
  });
  const doSummarize = async () => {
    if (!selectedId) return toast.error(isAr ? 'اختر ملف PDF أولاً' : 'Please select a PDF file');
    setLoading(true); setSummary('');
    try { const { data } = await aiAPI.summarize({ fileId: selectedId, language }); setSummary(data.summary || ''); }
    catch { toast.error(isAr ? 'فشل التلخيص' : 'Summarization failed'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📄 {isAr ? 'تلخيص ملف PDF' : 'Summarize PDF'}</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>{isAr ? 'اختر ملف PDF من مكتبتك وسأقوم بتلخيصه بالكامل فوراً' : 'Select any PDF from your library and get an instant structured summary'}</p>
      </div>
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isAr ? 'اختر ملف PDF' : 'Select PDF File'}
        </label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, marginBottom: 16 }}>
          <option value="">{isAr ? '-- اختر ملفاً --' : '-- Choose a PDF --'}</option>
          {files.map(f => <option key={f.id} value={f.id}>{f.original_name}</option>)}
        </select>
        {files.length === 0 && <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{isAr ? 'لا توجد ملفات PDF. قم بتحميل ملفات من قسم الملفات أولاً.' : 'No PDF files yet. Upload some in the Files section first.'}</p>}
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={doSummarize} disabled={loading || !selectedId}
          style={{ padding: '11px 28px', borderRadius: 14, background: selectedId ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'var(--surface3)', color: '#fff', border: 'none', cursor: selectedId ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14, boxShadow: selectedId ? '0 4px 16px rgba(124,58,237,0.35)' : 'none' }}>
          {loading ? <Spinner size="sm" /> : (isAr ? '✨ تلخيص الآن' : '✨ Summarize Now')}
        </motion.button>
      </div>
    </div>
  );
}

// ── Study Plan Panel ──────────────────────────────────────────
function StudyPlanPanel() {
  const { language } = useUIStore();
  const isAr = language === 'ar';
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          📅 {isAr ? 'خطة الدراسة الذكية' : 'AI Study Plan'}
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>
          {isAr ? 'خطة مذاكرة مخصصة بناءً على موادك وتاريخ امتحانك' : 'A personalized schedule tailored to your subjects, level, and exam date'}
        </p>
      </div>
      <StudyPlanGenerator isAr={isAr} />
    </div>
  );
}

// ── YouTube Summary Panel ─────────────────────────────────────
function YouTubePanel() {
  const { language } = useUIStore();
  const isAr = language === 'ar';
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const doSummarize = async () => {
    if (!url.trim()) return toast.error(isAr?'أدخل رابط يوتيوب':'Enter a YouTube URL');
    if (!url.includes('youtube')&&!url.includes('youtu.be')) return toast.error(isAr?'رابط غير صالح':'Invalid URL');
    setLoading(true); setSummary('');
    try { const { data } = await aiAPI.youtubeSummarize({ url, language }); setSummary(data.summary||''); }
    catch { toast.error(isAr?'تعذر جلب النص. الفيديو يحتاج ترجمة.':'Could not get transcript. Video needs captions.'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🎥 {isAr?'تلخيص فيديو يوتيوب':'YouTube Summary'}</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>{isAr?'الصق رابط فيديو تعليمي وسأقوم بتلخيصه فوراً':'Paste an educational YouTube link and get an instant AI summary'}</p>
      </div>
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:20, padding:24, marginBottom:20 }}>
        <label style={{ fontSize:12, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>YouTube URL</label>
        <div style={{ display:'flex', gap:10 }}>
          <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSummarize()}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{ flex:1, padding:'12px 16px', borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14 }} />
          <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
            onClick={doSummarize} disabled={loading}
            style={{ padding:'12px 24px', borderRadius:12, background:'linear-gradient(135deg,#EF4444,#DC2626)', color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, flexShrink:0, boxShadow:'0 4px 16px rgba(239,68,68,0.35)' }}>
            {loading?<Spinner size="sm" />:'▶ '+(isAr?'لخص':'Go')}
          </motion.button>
        </div>
        <p style={{ fontSize:11, color:'var(--text3)', marginTop:10 }}>ℹ️ {isAr?'يعمل مع الفيديوهات التي تحتوي على ترجمة':'Works with videos that have captions'}</p>
      </div>
      {loading&&<div style={{ textAlign:'center', padding:40 }}><Spinner size="lg" /><p style={{ color:'var(--text3)', marginTop:16, fontSize:14 }}>{isAr?'جارٍ تحليل الفيديو...':'Analyzing video…'}</p></div>}
      {summary&&(
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:20, padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontSize:16, fontWeight:700 }}>🎬 {isAr?'ملخص الفيديو':'Video Summary'}</h3>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{navigator.clipboard.writeText(summary);toast.success(isAr?'تم النسخ!':'Copied!');}} style={{ padding:'6px 14px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--text2)' }}>📋 {isAr?'نسخ':'Copy'}</button>
              <button onClick={()=>{setUrl('');setSummary('');}} style={{ padding:'6px 14px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--text2)' }}>+{isAr?'جديد':'New'}</button>
            </div>
          </div>
          <div className="ai-msg-content" style={{ fontSize:14, lineHeight:1.75, color:'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(summary), SANITIZE_OPTS) }} />
        </motion.div>
      )}
    </div>
  );
}

// ── Tabs Container (main export) ─────────────────────────────
const TABS = [
  { id:'chat',      labelEn:'💬 Chat',       labelAr:'💬 المحادثة' },
  { id:'quiz',      labelEn:'🧠 Quiz',       labelAr:'🧠 الاختبارات' },
  { id:'summarize', labelEn:'📄 Summarize',  labelAr:'📄 التلخيص' },
  { id:'plan',      labelEn:'📅 Study Plan', labelAr:'📅 خطة الدراسة' },
  { id:'youtube',   labelEn:'🎥 YouTube',    labelAr:'🎥 يوتيوب' },
  { id:'homework',  labelEn:'📸 Homework',   labelAr:'📸 صحح واجبك' },
];

export default function AIAssistant() {
  const [tab, setTab] = useState('chat');
  const { language } = useUIStore();
  const isAr = language === 'ar';
  
  return (
    <div style={{ height:'calc(100vh - 90px)', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', gap:4, padding:'10px 20px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', overflowX:'auto', flexShrink:0, scrollbarWidth:'none' }}>
        {TABS.map(t => (
          <motion.button key={t.id} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }} onClick={()=>setTab(t.id)}
            style={{ padding:'8px 20px', borderRadius:12, fontWeight:700, fontSize:13.5, border:'none', cursor:'pointer', transition:'all 0.2s', whiteSpace:'nowrap', background:tab===t.id?'linear-gradient(135deg,#6366F1,#8B5CF6)':'var(--surface)', color:tab===t.id?'#fff':'var(--text2)', boxShadow:tab===t.id?'0 4px 14px rgba(99,102,241,0.30)':'none' }}>
              {isAr ? t.labelAr : t.labelEn}
          </motion.button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', background:'var(--ink2)' }}>
        {tab==='chat'      && <AIChat />}
        {tab==='quiz'      && <QuizPanel />}
        {tab==='summarize' && <SummarizePanel />}
        {tab==='plan'      && <StudyPlanPanel />}
        {tab==='youtube'   && <YouTubePanel />}
        {tab==='homework'  && <HomeworkCorrector isAr={isAr} />}
      </div>
    </div>
  );
}
