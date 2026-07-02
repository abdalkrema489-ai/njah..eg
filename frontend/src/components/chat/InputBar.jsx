import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDraftStore } from '../../context/store';

const TOP_EMOJIS = [
  '👍','❤️','😂','😮','😢','👏','🎉','💯','🔥','👀','✨','🙌','🚀','💡','✅','❌','🙏','🤔','😎','🥳','💪','🌟','🎓','📚',
  '😊','😅','😍','🎉','👍','🔥','👏','🤔','👌','✨','💡','🚀','💻','📱','❤️','💖','💙','💚','💛','💜','🖤','💯','✅','🌟',
  '📍','🔔','📝','📅','📚','✍️','🧠','🎯','🏆','🏅','🏫','🎓','🌍','🌐','💬','📞','📸','🎨','🍕','☕','🚗','✈️','🎈','🎁',
  '⚡','⭐','🌈','🍀','💥','🎨','🎵','🎬','🎮','👾'
];

export default function InputBar({
  isAr,
  isRecording,
  recordingTime,
  onSend,
  onFileUpload,
  onToggleVoice,
  editingMsg,
  setEditingMsg,
  replyTo,
  setReplyTo
}) {
  const { chatDraft, setChatDraft, clearChatDraft } = useDraftStore();
  const [input, setInput] = useState(chatDraft || '');
  const [showEmojis, setShowEmojis] = useState(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const debouncerRef = useRef(null);

  // Sync draft store
  useEffect(() => {
    if (debouncerRef.current) clearTimeout(debouncerRef.current);
    debouncerRef.current = setTimeout(() => {
      setChatDraft(input);
    }, 300);
    return () => clearTimeout(debouncerRef.current);
  }, [input, setChatDraft]);

  // If active chat changes, input is pre-populated from draft store
  useEffect(() => {
    setInput(chatDraft || '');
  }, [chatDraft]);

  const handleSend = () => {
    if (!input.trim() && !editingMsg) return;
    onSend(input);
    setInput('');
    clearChatDraft();
  };

  const handleEmojiClick = (emoji) => {
    setInput(prev => prev + emoji);
    setShowEmojis(false);
  };

  return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative'
    }}>
      {/* Reply or Editing Banner */}
      <AnimatePresence>
        {(replyTo || editingMsg) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            style={{
              padding: '8px 16px', background: 'rgba(99,102,241,0.08)',
              borderLeft: isAr ? 'none' : '3px solid var(--primary)',
              borderRight: isAr ? '3px solid var(--primary)' : 'none',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--primary-light)' }}>
              {editingMsg ? (
                <><strong>✏️ {isAr ? 'تعديل:' : 'Editing:'}</strong> {editingMsg.content?.slice(0, 60)}</>
              ) : (
                <><strong>↩️ {isAr ? 'الرد على:' : 'Replying:'}</strong> {replyTo?.content?.slice(0, 60)}</>
              )}
            </div>
            <button
              onClick={() => { setReplyTo?.(null); setEditingMsg?.(null); setInput(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
            >×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        
        {/* Emoji Picker Grid Popover */}
        <AnimatePresence>
          {showEmojis && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              style={{
                position: 'absolute', bottom: 64, left: isAr ? 'auto' : 0, right: isAr ? 0 : 'auto', padding: 12,
                background: 'var(--surface2)', borderRadius: 20, border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xl)',
                display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, zIndex: 200, width: 280,
                maxHeight: 200, overflowY: 'auto'
              }}
            >
              {TOP_EMOJIS.map((s, idx) => (
                <motion.button
                  key={idx} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleEmojiClick(s)}
                  style={{ fontSize: 20, padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
                >{s}</motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attach File Button */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current.click()}
          style={{ fontSize: 20, color: 'var(--text4)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px' }}
        >📎</motion.button>
        <input type="file" ref={fileInputRef} hidden onChange={onFileUpload} />

        {/* Input Text / Recording Field - pill shape */}
        <div style={{
          flex: 1, background: 'var(--surface2)', borderRadius: 28,
          padding: '4px 18px', display: 'flex', alignItems: 'center', gap: 8,
          border: '1.5px solid var(--border)', transition: 'border-color 0.2s',
        }}>
          {isRecording ? (
            <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 13, padding: '8px 0', flex: 1 }} className="animate-pulse">
              🎙️ {isAr ? 'جاري التسجيل...' : 'Recording...'} {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </div>
          ) : (
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={editingMsg ? (isAr ? 'عدّل رسالتك...' : 'Edit your message...') : (isAr ? 'اكتب رسالة...' : 'Write a message...')}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--text)', fontWeight: 500, padding: '8px 0' }}
            />
          )}
          
          {/* Emoji button inside pill */}
          <motion.button
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.8 }}
            onClick={() => setShowEmojis(!showEmojis)}
            style={{ fontSize: 20, padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >😊</motion.button>
        </div>

        {/* Action button (Send / Voice Toggle) */}
        {input.trim() || editingMsg ? (
          <motion.button
            whileHover={{ scale: 1.08, boxShadow: '0 8px 25px rgba(99,102,241,0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            style={{
              width: 48, height: 48, borderRadius: 16, flexShrink: 0,
              background: editingMsg
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
            }}
          >
            <span style={{ fontSize: 20 }}>{editingMsg ? '✓' : '➤'}</span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            onClick={onToggleVoice}
            style={{
              width: 48, height: 48, borderRadius: 16, flexShrink: 0,
              background: isRecording ? '#ef4444' : 'var(--surface3)',
              color: isRecording ? '#fff' : 'var(--text3)', border: 'none', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >{isRecording ? '⏹️' : '🎤'}</motion.button>
        )}

      </div>
    </div>
  );
}
