import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import ChatHeader from './ChatHeader';
import { Spinner } from '../shared/UI';

const CHAT_BG = {
  backgroundImage: `radial-gradient(circle, rgba(99,102,241,0.05) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
};

export default function MessageArea({
  isAr,
  activePartner,
  activePrivateChat,
  setActivePrivateChat,
  setSidebarOpen,
  isTypingActive,
  typingName,
  loadingHistory,
  activeMsgs,
  user,
  renderStatus,
  onReply,
  onEdit,
  onDelete,
  replyTo,
  setReplyTo,
  editingMsg,
  setEditingMsg,
  onSend,
  onFileUpload,
  onToggleVoice,
  isRecording,
  recordingTime,
  onStartCall,
  onProfileClick,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch
}) {
  const bottomRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMsgs]);

  const filteredMessages = showSearch && searchQuery.trim()
    ? activeMsgs.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeMsgs;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--surface)' }}>
      {/* Header HUD */}
      <ChatHeader
        isAr={isAr}
        activePartner={activePartner}
        isTypingActive={isTypingActive}
        typingName={typingName}
        onBack={() => setActivePrivateChat(null)}
        onOpenMenu={() => setSidebarOpen(true)}
        onStartCall={onStartCall}
        onProfileClick={onProfileClick}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
      />

      {/* Messages Scroll Area */}
      <div className="scroll-y" style={{
        ...CHAT_BG,
        flex: 1,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--surface)',
        overflowY: 'auto'
      }}>
        <AnimatePresence initial={false}>
          {loadingHistory ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <Spinner />
            </div>
          ) : filteredMessages.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text4)', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
                <p style={{ fontSize: 14 }}>
                  {showSearch ? (isAr ? 'لم يتم العثور على رسائل متطابقة' : 'No matching messages') : (isAr ? 'ابدأ المحادثة الآن!' : 'Start the conversation!')}
                </p>
              </div>
            </motion.div>
          ) : (
            filteredMessages.map((msg, i) => {
              const isMe = msg.senderId === user?.id;
              const showAvatar = !isMe && (i === 0 || filteredMessages[i - 1]?.senderId !== msg.senderId);
              return (
                <MessageBubble
                  key={msg.id || i}
                  msg={msg} isMe={isMe}
                  showAvatar={showAvatar}
                  activePartner={activePartner}
                  user={user}
                  renderStatus={renderStatus}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isAr={isAr}
                />
              );
            })
          )}
        </AnimatePresence>

        {/* Dynamic Typing Indicator inside messages list */}
        <AnimatePresence>
          {isTypingActive && typingName && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', color: 'var(--text4)', fontSize: 12 }}
            >
              <span>{isAr ? 'يكتب...' : 'typing...'}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                <span className="dot animate-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text4)' }} />
                <span className="dot animate-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text4)', animationDelay: '0.2s' }} />
                <span className="dot animate-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text4)', animationDelay: '0.4s' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input Pill Bar */}
      <InputBar
        isAr={isAr}
        isRecording={isRecording}
        recordingTime={recordingTime}
        onSend={onSend}
        onFileUpload={onFileUpload}
        onToggleVoice={onToggleVoice}
        editingMsg={editingMsg}
        setEditingMsg={setEditingMsg}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
      />
    </div>
  );
}
