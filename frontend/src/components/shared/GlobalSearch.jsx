// src/components/shared/GlobalSearch.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../api/index';

export default function GlobalSearch({ isAr }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();
  const inputRef              = useRef();
  const debounceRef           = useRef();

  // Ctrl+K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await client.get('/users/search', { params: { q: query } });
        setResults(data.results || []);
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleClose = () => { setOpen(false); setQuery(''); setResults([]); };

  const TYPE_LABELS = {
    file:    { en: 'File',    ar: 'ملف' },
    note:    { en: 'Note',    ar: 'ملاحظة' },
    session: { en: 'Session', ar: 'جلسة' },
  };

  return (
    <>
      {/* Trigger button */}
      <button
        id="global-search-trigger"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 10,
          border: '1px solid var(--border)', background: 'var(--surface2)',
          cursor: 'pointer', color: 'var(--text3)', fontSize: 13,
          width: 190, transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        {isAr ? 'بحث...' : 'Search...'}
        <span style={{ marginInlineStart: 'auto', fontSize: 10, opacity: 0.5, fontFamily: 'monospace' }}>Ctrl+K</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleClose}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)', zIndex: 9998,
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
                width: '100%', maxWidth: 580,
                background: 'var(--surface)', borderRadius: 20,
                boxShadow: '0 25px 60px rgba(0,0,0,0.35)', zIndex: 9999,
                border: '1px solid var(--border)', overflow: 'hidden',
              }}
            >
              {/* Input row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🔍</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={isAr ? 'ابحث في ملفاتك وملاحظاتك وجلساتك...' : 'Search files, notes, sessions...'}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: 16, background: 'transparent', color: 'var(--text)',
                  }}
                />
                {loading && (
                  <div style={{
                    width: 18, height: 18, border: '2px solid var(--primary)',
                    borderTop: '2px solid transparent', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', flexShrink: 0,
                  }} />
                )}
                <button
                  onClick={handleClose}
                  style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    color: 'var(--text3)', cursor: 'pointer', fontFamily: 'monospace', flexShrink: 0,
                  }}
                >ESC</button>
              </div>

              {/* Results */}
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {query.length >= 2 && results.length === 0 && !loading ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🔎</div>
                    {isAr ? 'لا توجد نتائج لـ ' : 'No results for '}<strong>"{query}"</strong>
                  </div>
                ) : (
                  results.map((r, i) => (
                    <div
                      key={r.id || i}
                      onClick={() => { navigate(r.link); handleClose(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '13px 20px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 700, color: 'var(--text)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {r.title}
                        </div>
                        {r.subtitle && (
                          <div style={{
                            fontSize: 12, color: 'var(--text3)', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {r.subtitle}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, color: 'var(--text4)', flexShrink: 0,
                        padding: '2px 8px', borderRadius: 6,
                        background: 'var(--surface3)', fontWeight: 600,
                      }}>
                        {isAr ? TYPE_LABELS[r.type]?.ar : TYPE_LABELS[r.type]?.en}
                      </span>
                    </div>
                  ))
                )}

                {/* Default state when empty */}
                {query.length < 2 && (
                  <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>⌨️</div>
                    {isAr ? 'اكتب حرفين أو أكثر للبحث' : 'Type at least 2 characters to search'}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
