import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../shared/UI';

export default function ChatHeader({
  isAr,
  activePartner,
  isTypingActive,
  typingName,
  onBack,
  onOpenMenu,
  onStartCall,
  onProfileClick,
  onSearchToggle,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch
}) {
  return (
    <div style={{
      height: 68, padding: '0 20px',
      background: 'linear-gradient(135deg, #10b981 0%, #38bdf8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
      boxShadow: '0 4px 16px rgba(14,165,233,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {/* Back button */}
        <button
          className="chat-sidebar-toggle"
          onClick={onBack}
          style={{ padding: '4px 8px', fontSize: 18, color: '#fff', border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          {isAr ? '←' : '←'}
        </button>

        {/* Menu button */}
        <button
          className="chat-sidebar-toggle"
          onClick={onOpenMenu}
          style={{ marginRight: 4, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
        >
          👥 {isAr ? 'القائمة' : 'Menu'}
        </button>

        {showSearch ? (
          /* Inline Message Search Bar replacing Header Details temporarily */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, marginRight: 16 }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'البحث في الرسائل...' : 'Search messages...'}
              style={{
                flex: 1, padding: '6px 14px', borderRadius: 10, border: 'none', outline: 'none',
                background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 13, fontWeight: 500
              }}
            />
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}
            >
              ✕
            </button>
          </motion.div>
        ) : (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: activePartner?.chatType !== 'group' ? 'pointer' : 'default' }}
            onClick={() => activePartner?.chatType !== 'group' && onProfileClick?.()}
          >
            <Avatar src={activePartner?.avatar} name={activePartner?.name} size={42} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                {activePartner?.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {isTypingActive && typingName
                  ? (isAr ? `${typingName} يكتب الآن...` : `${typingName} is typing...`)
                  : activePartner?.chatType === 'group'
                    ? `👥 ${activePartner.subject || 'Community'}`
                    : (isAr ? '💬 رسالة مباشرة' : '💬 Direct Message')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header action buttons */}
      {!showSearch && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activePartner?.chatType !== 'group' && (
            <>
              <ChatHeaderBtn onClick={() => onStartCall('audio')} title="Voice Call" icon={<PhoneIcon />} />
              <ChatHeaderBtn onClick={() => onStartCall('video')} title="Video Call" icon={<VideoIcon />} />
            </>
          )}
          <ChatHeaderBtn onClick={() => setShowSearch(true)} title="Search" icon={<SearchIcon />} />
        </div>
      )}
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function ChatHeaderBtn({ onClick, title, icon }) {
  return (
    <motion.button
      whileHover={{ scale: 1.12, background: 'rgba(255,255,255,0.25)' }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
      }}
    >
      {icon}
    </motion.button>
  );
}
