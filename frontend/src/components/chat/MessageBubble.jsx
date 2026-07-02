// Force Vite HMR Cache Invalidation
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Avatar } from '../shared/UI';
import { useTranslation } from '../../i18n/index';

const fmtTime = (d, isAr) => {
  try {
    if (isAr) {
      return new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));
    }
    return format(new Date(d), 'HH:mm');
  } catch {
    return '';
  }
};

export default function MessageBubble({
  msg,
  isMe,
  showAvatar,
  activePartner,
  user,
  renderStatus,
  onReply,
  onEdit,
  onDelete,
  isAr
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (msg._deleted) {
    return (
      <div style={{ textAlign: isMe ? 'right' : 'left', padding: '4px 0', width: '100%' }}>
        <span style={{ fontSize: 12, color: 'var(--text4)', fontStyle: 'italic' }}>
          🗑️ {isAr ? 'تم حذف هذه الرسالة' : 'Message deleted'}
        </span>
      </div>
    );
  }

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    toast.success(isAr ? 'تم نسخ النص' : 'Copied text');
    setShowMenu(false);
  };

  const canEdit = isMe && (Date.now() - new Date(msg.createdAt).getTime()) < 15 * 60 * 1000; // < 15 mins

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
      style={{
        display: 'flex',
        flexDirection: isMe ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        maxWidth: '85%',
        alignSelf: isMe ? 'flex-end' : 'flex-start',
        position: 'relative',
        width: 'fit-content'
      }}
    >
      {/* Avatar */}
      {!isMe && (
        <div style={{ width: 30, flexShrink: 0 }}>
          {showAvatar && <Avatar src={activePartner?.avatar} name={activePartner?.name} size={30} />}
        </div>
      )}

      <div
        onContextMenu={handleContextMenu}
        style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}
      >
        {/* Sender name in group */}
        {!isMe && showAvatar && activePartner?.chatType === 'group' && (
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', marginLeft: isAr ? 0 : 2, marginRight: isAr ? 2 : 0 }}>
            {msg.userName || msg.senderName || 'Member'}
          </span>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <div style={{
            padding: '4px 10px', borderRadius: '8px 8px 0 0',
            background: isMe ? 'rgba(255,255,255,0.1)' : 'var(--surface3)',
            borderLeft: isAr ? 'none' : '3px solid #8B5CF6',
            borderRight: isAr ? '3px solid #8B5CF6' : 'none',
            fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--text3)',
            maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            ↩️ {msg.replyTo?.content || 'Replied message'}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: '10px 14px',
          borderRadius: msg.replyTo
            ? (isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px')
            : (isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'),
          background: isMe
            ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
            : 'var(--surface3)',
          color: isMe ? '#fff' : 'var(--text)',
          border: isMe ? 'none' : '1px solid var(--border)',
          boxShadow: isMe ? '0 4px 12px rgba(99,102,241,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
          maxWidth: 360, wordBreak: 'break-word',
          fontSize: 14, lineHeight: 1.55,
          position: 'relative',
        }}>
          <MessageContent msg={msg} />
          
          {/* Time & Read Receipts: only visible on hover */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  fontSize: 10, marginTop: 5, textAlign: 'right',
                  color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
                }}
              >
                {msg.edited && <span style={{ fontStyle: 'italic' }}>{isAr ? 'معدلة' : 'edited'}</span>}
                <span>{msg.createdAt ? fmtTime(msg.createdAt, isAr) : 'now'}</span>
                {renderStatus(msg)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Context Menu Popup (triggers on desktop right click or hover dot menu / long press) */}
      <AnimatePresence>
        {(showMenu || (hovered && !showMenu)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute', top: -14,
              [isMe ? 'left' : 'right']: -30,
              display: 'flex', gap: 4, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10, padding: '3px 6px',
              boxShadow: 'var(--shadow-md)', zIndex: 10,
            }}
          >
            <button onClick={() => { onReply(msg); setShowMenu(false); }} title={isAr ? 'رد' : 'Reply'} style={btnStyle}>↩️</button>
            <button onClick={handleCopy} title={isAr ? 'نسخ' : 'Copy'} style={btnStyle}>📋</button>
            {canEdit && <button onClick={() => { onEdit(msg); setShowMenu(false); }} title={isAr ? 'تعديل' : 'Edit'} style={btnStyle}>✏️</button>}
            {isMe && <button onClick={() => { onDelete(msg.id); setShowMenu(false); }} title={isAr ? 'حذف' : 'Delete'} style={{ ...btnStyle, color: '#ef4444' }}>🗑️</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const btnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '2px 4px', borderRadius: 6
};

function MessageContent({ msg }) {
  if (msg.type === 'image') {
    return (
      <img
        src={msg.fileUrl} alt="attachment"
        style={{ maxWidth: 220, maxHeight: 200, borderRadius: 10, display: 'block', cursor: 'pointer', objectFit: 'cover' }}
        onClick={() => window.open(msg.fileUrl)}
      />
    );
  }
  if (msg.type === 'audio') {
    return (
      <audio src={msg.fileUrl} controls style={{ maxWidth: 240, display: 'block', marginTop: 4 }} />
    );
  }
  if (msg.type === 'file') {
    return (
      <a href={msg.fileUrl} target="_blank" rel="noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span style={{ fontSize: 22 }}>📎</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{msg.content || 'File'}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Tap to open</div>
        </div>
      </a>
    );
  }
  return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>;
}
