import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { chatAPI, filesAPI, usersAPI, groupsAPI } from '../../api/index';
import { getSocket, useSocket } from '../../hooks/index';
import { useVoice } from '../../hooks/useVoice';
import { useAuthStore, useChatStore, playPing } from '../../context/store';
import { Avatar, Spinner, Modal, Button } from '../shared/UI';
import CreateGroupWizard from '../groups/CreateGroupWizard';

// ─────────────────────────────────────────────────────────────
// Helper: Format time
// ─────────────────────────────────────────────────────────────
const fmtTime = d => { try { return format(new Date(d), 'HH:mm'); } catch { return ''; } };

// ─────────────────────────────────────────────────────────────
// Subtle dot-grid background for chat area
// ─────────────────────────────────────────────────────────────
const CHAT_BG = {
  backgroundImage: `radial-gradient(circle, rgba(14,165,233,0.08) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
};

export default function ChatPage() {
  const { user } = useAuthStore();
  const {
    activePrivateChat, setActivePrivateChat, privateMessages, setPrivateMessages,
    addPrivateMessage, markMessagesRead, recentChats, setRecentChats, updateRecentChat,
  } = useChatStore();

  const socket = useSocket() || getSocket();
  const { isRecording, recordingTime, startRecording, stopRecording } = useVoice();
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { senderId: senderName }
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [editingMsg, setEditingMsg] = useState(null); // { id, content }
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState('audio'); // 'audio' | 'video'
  const [incomingCall, setIncomingCall] = useState(null);

  const activePartner = recentChats.find(c => c.id === activePrivateChat)
    || searchResults.find(c => c.id === activePrivateChat);
  const roomMessages = useChatStore(s => s.messages[activePartner?.subject] || []);
  const activeMsgs = activePartner?.chatType === 'group'
    ? roomMessages
    : (privateMessages[activePrivateChat] || []);

  // ── 1. Load recent chats + groups on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const [recentRes, groupsRes] = await Promise.all([
          chatAPI.getRecent(),
          groupsAPI.list(),
        ]);
        const privateChats = (recentRes.data?.recentChats || []).map(c => ({ ...c, chatType: 'private' }));
        const groupChats = (groupsRes.data?.groups || []).map(g => ({
          id: g._id, name: g.name, avatar: null,
          lastMsgText: g.description || 'Group chat',
          chatType: 'group', subject: g.subject, institution: g.institution_type,
        }));
        setRecentChats([...privateChats, ...groupChats]);
      } catch (err) { console.error('Failed to load chats:', err); }
    };
    load();
  }, [setRecentChats]);

  // ── 2. Handle deep-link from notifications ──
  useEffect(() => {
    const targetId = searchParams.get('user');
    if (targetId && recentChats.length > 0) {
      const contact = recentChats.find(c => c.id === targetId);
      if (contact) selectChat(contact);
    }
  }, [searchParams, recentChats.length]);

  // ── 2b. Handle navigation from StudentsOverview ──
  const location = useLocation();
  useEffect(() => {
    if (location.state?.openUserId) {
      const targetId = location.state.openUserId;
      const targetName = location.state.userName || 'User';
      // Check if already in contacts
      const existing = recentChats.find(c => c.id === targetId);
      if (existing) {
        selectChat(existing);
      } else {
        // Create a temporary contact entry and open chat
        const tempContact = { id: targetId, name: targetName, chatType: 'private' };
        selectChat(tempContact);
      }
      // Clear state to prevent re-opening on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state, recentChats.length]);

  // ── 3. Socket handlers ──
  useEffect(() => {
    if (!socket) return;

    const onNewPrivate = (msg) => {
      const targetId = msg.senderId === user?.id ? msg.receiverId : msg.senderId;
      addPrivateMessage(targetId, msg);
      if (msg.senderId !== user?.id) playPing();

      const existing = useChatStore.getState().recentChats.find(c => c.id === targetId);
      if (existing) {
        updateRecentChat(targetId, {
          lastMsgText: msg.type === 'text' ? msg.content : `sent a ${msg.type}`,
          lastMsgTime: msg.createdAt, lastMsgStatus: msg.status,
          lastMsgIsMine: msg.senderId === user?.id,
          unreadCount: (msg.senderId !== user?.id && activePrivateChat !== targetId)
            ? (existing.unreadCount || 0) + 1 : 0,
        });
      } else if (msg.senderId !== user?.id) {
        setRecentChats([{
          id: msg.senderId, name: msg.senderName, avatar: msg.senderAvatar,
          lastMsgText: msg.type === 'text' ? msg.content : `sent a ${msg.type}`,
          lastMsgTime: msg.createdAt, lastMsgStatus: msg.status,
          lastMsgIsMine: false, unreadCount: 1, chatType: 'private',
        }, ...useChatStore.getState().recentChats]);
      }
      if (activePrivateChat === targetId && msg.senderId !== user?.id) {
        socket.emit('mark_messages_read', { senderId: targetId });
      }
    };

    const onHistory = ({ targetId, messages }) => {
      setPrivateMessages(targetId, messages);
      setLoadingHistory(false);
    };

    const onMessagesRead = ({ readerId, messageIds, allFromUser }) => {
      if (readerId === activePrivateChat || allFromUser) {
        markMessagesRead(readerId, messageIds);
        updateRecentChat(readerId, { lastMsgStatus: 'read' });
      }
    };

    const onPrivateTyping = ({ senderId, senderName, isTyping }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        if (isTyping) next[senderId] = senderName;
        else delete next[senderId];
        return next;
      });
    };

    const onMessageEdited = ({ messageId, content, edited }) => {
      useChatStore.getState().editPrivateMessage?.(activePrivateChat, messageId, content);
    };

    const onMessageDeleted = ({ messageId }) => {
      useChatStore.getState().deletePrivateMessage?.(activePrivateChat, messageId);
    };

    // WebRTC incoming call
    const onCallIncoming = ({ callerId, callerName, callerAvatar, offer, callType }) => {
      setIncomingCall({ callerId, callerName, callerAvatar, offer, callType });
      playPing();
    };

    socket.on('new_private_message', onNewPrivate);
    socket.on('private_history', onHistory);
    socket.on('messages_read_by_target', onMessagesRead);
    socket.on('private_user_typing', onPrivateTyping);
    socket.on('message_edited', onMessageEdited);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('call_incoming', onCallIncoming);
    socket.on('ai_typing', ({ isTyping }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        if (isTyping) next['ai'] = 'Najah AI';
        else delete next['ai'];
        return next;
      });
    });

    return () => {
      socket.off('new_private_message', onNewPrivate);
      socket.off('private_history', onHistory);
      socket.off('messages_read_by_target', onMessagesRead);
      socket.off('private_user_typing', onPrivateTyping);
      socket.off('message_edited', onMessageEdited);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('call_incoming', onCallIncoming);
    };
  }, [socket, user, activePrivateChat, addPrivateMessage, setPrivateMessages, markMessagesRead, setRecentChats, updateRecentChat]);

  // ── 4. User search ──
  useEffect(() => {
    if (!search.trim()) { setIsSearching(false); setSearchResults([]); return; }
    setIsSearching(true);
    const delay = setTimeout(() => {
      usersAPI.searchUsers(search)
        .then(res => setSearchResults((res.data.users || []).map(u => ({ ...u, chatType: 'private' }))))
        .catch(console.error);
    }, 400);
    return () => clearTimeout(delay);
  }, [search]);

  // ── 5. Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMsgs]);

  // ── 6. Select a chat ──
  const selectChat = (item) => {
    setActivePrivateChat(item.id);
    setSearch('');
    setReplyTo(null);
    setEditingMsg(null);

    if (!recentChats.find(c => c.id === item.id)) {
      setRecentChats([{ ...item, lastMsgText: '', unreadCount: 0,
        chatType: item.chatType || 'private' }, ...recentChats]);
    }
    updateRecentChat(item.id, { unreadCount: 0 });
    setLoadingHistory(true);

    if (item.chatType === 'group') {
      socket?.emit('join_room', { subject: item.subject || 'general', groupId: item.id });
      chatAPI.getMessages(item.subject || 'general')
        .then(res => {
          setPrivateMessages(item.id, res.data.messages || []);
          setLoadingHistory(false);
        });
    } else {
      socket?.emit('fetch_private_history', { targetId: item.id, limit: 100 });
      socket?.emit('mark_messages_read', { senderId: item.id });
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── 7. Typing emit ──
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (activePrivateChat && activePartner?.chatType !== 'group') {
      socket?.emit('private_typing', { receiverId: activePrivateChat, isTyping: true });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket?.emit('private_typing', { receiverId: activePrivateChat, isTyping: false });
      }, 2000);
    }
  };

  // ── 8. Send message ──
  const sendMessage = () => {
    const content = input.trim();
    if ((!content && !editingMsg) || !socket || !activePrivateChat) return;
    const chatType = activePartner?.chatType || 'private';

    // Editing existing message
    if (editingMsg) {
      socket.emit('edit_private_message', { messageId: editingMsg.id, content });
      setEditingMsg(null);
      setInput('');
      return;
    }

    if (chatType === 'group') {
      socket.emit('send_message', {
        subject: activePartner.subject || 'general',
        content,
        replyTo: replyTo?.id,
      });
    } else {
      const tempId = 'temp-' + Date.now();
      const optimisticMsg = {
        id: tempId, senderId: user?.id, senderName: user?.name,
        senderAvatar: user?.avatar_url, receiverId: activePrivateChat,
        content, type: 'text', status: 'sent', createdAt: new Date().toISOString(),
        replyTo: replyTo ? { id: replyTo.id, content: replyTo.content } : undefined,
      };
      addPrivateMessage(activePrivateChat, optimisticMsg);
      updateRecentChat(activePrivateChat, {
        lastMsgText: content, lastMsgTime: optimisticMsg.createdAt,
        lastMsgStatus: 'sent', lastMsgIsMine: true,
      });
      socket.emit('send_private_message', {
        receiverId: activePrivateChat, content,
        replyTo: replyTo?.id,
      });
      socket.emit('private_typing', { receiverId: activePrivateChat, isTyping: false });
    }

    setInput('');
    setReplyTo(null);
  };

  // ── 9. File upload ──
  const onFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !activePrivateChat) return;
    e.target.value = '';
    try {
      toast.loading('Sending media...', { id: 'upload' });
      const { data } = await filesAPI.upload(file, { subject: 'private_chat', is_public: false });
      socket.emit('send_private_message', {
        receiverId: activePrivateChat, content: file.name,
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file',
        fileUrl: data.file.file_url,
      });
      toast.success('Sent!', { id: 'upload' });
    } catch { toast.error('Upload failed', { id: 'upload' }); }
  };

  // ── 10. Voice recording ──
  const toggleVoice = async () => {
    if (isRecording) {
      const file = await stopRecording();
      if (file && socket && activePrivateChat) {
        toast.loading('Sending voice note...', { id: 'voice' });
        try {
          const { data } = await filesAPI.upload(file, { subject: 'private_chat' });
          socket.emit('send_private_message', {
            receiverId: activePrivateChat, content: 'Voice Message',
            type: 'audio', fileUrl: data.file.file_url,
          });
          toast.success('Sent!', { id: 'voice' });
        } catch { toast.error('Voice note failed', { id: 'voice' }); }
      }
    } else {
      const ok = await startRecording();
      if (!ok) toast.error('Microphone access required');
    }
  };

  // ── 11. Delete message ──
  const deleteMessage = (msgId) => {
    socket?.emit('delete_private_message', { messageId: msgId });
  };

  // ── 12. Message status icon ──
  const renderStatus = (msg) => {
    if (msg.senderId !== user?.id) return null;
    const isRead = msg.status === 'read';
    const isDelivered = msg.status === 'delivered';
    return (
      <span style={{
        color: isRead ? '#3b82f6' : isDelivered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)',
        fontSize: 11, marginLeft: 5, fontWeight: 800,
      }}>
        {isRead || isDelivered ? '✓✓' : '✓'}
      </span>
    );
  };

  // Filtered: show search results OR recent chats (no tab filtering — sidebar sections)
  const privateChats = (search.trim() ? searchResults : recentChats).filter(c => c.chatType !== 'group');
  const groupChats = recentChats.filter(c => c.chatType === 'group');
  const isTypingActive = activePrivateChat && Object.keys(typingUsers).some(id => id === activePrivateChat
    || (activePartner?.chatType !== 'group' && typingUsers[id]));
  const typingName = Object.values(typingUsers)[0];

  return (
    <div
      className="animate-fade-up"
      style={{
        height: 'calc(100vh - 120px)', display: 'flex', minHeight: 0, overflow: 'hidden',
        margin: '-12px -24px', position: 'relative', borderRadius: 24,
        border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}
    >

      {/* ══════════════════════════════
          LEFT SIDEBAR — Unified contacts
          ══════════════════════════════ */}
      <div style={{
        width: 300, minWidth: 280, display: 'flex', flexDirection: 'column',
        background: 'var(--glass)', backdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--border)', zIndex: 4,
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '20px 16px 14px',
          background: 'linear-gradient(135deg, #10b981 0%, #38bdf8 100%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              Messages
            </h2>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
              onClick={() => setShowCreateGroup(true)}
              title="Create New Group"
              style={{
                width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                fontSize: 18,
              }}
            >+</motion.button>
          </div>

          {/* Search */}
          <div style={{
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
            borderRadius: 12, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>🔍</span>
            <input
              placeholder="Search people..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                width: '100%', fontSize: 13, color: '#fff', fontWeight: 500,
              }}
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="scroll-y" style={{ flex: 1, padding: '8px 0' }}>

          {/* Section: Direct Messages */}
          <div style={{ padding: '10px 16px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              💬 Direct Messages
            </span>
          </div>
          {privateChats.length === 0 && (
            <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text4)' }}>
              {search ? 'No users found' : 'No recent chats yet'}
            </div>
          )}
          {privateChats.map(r => (
            <ContactRow
              key={r.id} r={r}
              active={activePrivateChat === r.id}
              onClick={() => selectChat(r)}
              user={user}
            />
          ))}

          {/* Section: Groups */}
          {!search.trim() && (
            <>
              <div style={{ padding: '14px 16px 4px', marginTop: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  👥 Groups
                </span>
              </div>
              {groupChats.length === 0 && (
                <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text4)' }}>
                  No groups yet —{' '}
                  <button onClick={() => setShowCreateGroup(true)} style={{ color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                    create one
                  </button>
                </div>
              )}
              {groupChats.map(r => (
                <ContactRow
                  key={r.id} r={r}
                  active={activePrivateChat === r.id}
                  onClick={() => selectChat(r)}
                  user={user}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════
          RIGHT — Chat area
          ══════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--surface)' }}>
        {!activePrivateChat ? (
          // Empty state
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', color: 'var(--text3)', textAlign: 'center', padding: 40,
          }}>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}
              style={{
                width: 120, height: 120, borderRadius: '50%', marginBottom: 28,
                background: 'linear-gradient(135deg, #10b981, #38bdf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56,
                boxShadow: '0 12px 40px rgba(14,165,233,0.3)',
              }}
            >
              💬
            </motion.div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
              Your messages
            </h1>
            <p style={{ fontSize: 14, maxWidth: 320, lineHeight: 1.7, color: 'var(--text3)' }}>
              Select a contact or group to start a real-time conversation.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{
              height: 68, padding: '0 20px',
              background: 'linear-gradient(135deg, #10b981 0%, #38bdf8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(14,165,233,0.2)',
            }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                onClick={() => activePartner?.chatType !== 'group' && setProfileId(activePartner?.id)}
              >
                <Avatar src={activePartner?.avatar} name={activePartner?.name} size={42} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                    {activePartner?.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                    {isTypingActive && typingName
                      ? `${typingName} is typing...`
                      : activePartner?.chatType === 'group'
                        ? '👥 Community Room'
                        : '💬 Direct Message'}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {activePartner?.chatType !== 'group' && (
                  <>
                    <ChatHeaderBtn
                      onClick={() => { setCallType('audio'); setShowCallModal(true); }}
                      title="Voice Call" emoji="📞"
                    />
                    <ChatHeaderBtn
                      onClick={() => { setCallType('video'); setShowCallModal(true); }}
                      title="Video Call" emoji="📹"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="scroll-y" style={{ ...CHAT_BG, flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface)' }}>
              <AnimatePresence initial={false}>
                {loadingHistory ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <Spinner />
                  </div>
                ) : activeMsgs.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: 'var(--text4)', padding: 40 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
                      <p style={{ fontSize: 14 }}>Start the conversation!</p>
                    </div>
                  </motion.div>
                ) : (
                  activeMsgs.map((msg, i) => {
                    const isMe = msg.senderId === user?.id;
                    const showAvatar = !isMe && (i === 0 || activeMsgs[i - 1]?.senderId !== msg.senderId);
                    return (
                      <MessageBubble
                        key={msg.id || i}
                        msg={msg} isMe={isMe}
                        showAvatar={showAvatar}
                        activePartner={activePartner}
                        user={user}
                        renderStatus={renderStatus}
                        onReply={m => { setReplyTo(m); inputRef.current?.focus(); }}
                        onEdit={m => { setEditingMsg(m); setInput(m.content); inputRef.current?.focus(); }}
                        onDelete={deleteMessage}
                        socket={socket}
                      />
                    );
                  })
                )}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Reply / Edit banner */}
            <AnimatePresence>
              {(replyTo || editingMsg) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  style={{
                    padding: '10px 20px', background: 'var(--primary-100)',
                    borderTop: '2px solid var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--primary-700)' }}>
                    {editingMsg ? (
                      <><span style={{ fontWeight: 800 }}>✏️ Editing:</span> {editingMsg.content.slice(0, 60)}</>
                    ) : (
                      <><span style={{ fontWeight: 800 }}>↩️ Replying to:</span> {replyTo?.content?.slice(0, 60)}</>
                    )}
                  </div>
                  <button
                    onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}
                  >×</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Bar */}
            <div style={{
              padding: '12px 16px 16px', background: 'var(--glass)',
              backdropFilter: 'var(--glass-blur)', borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
            }}>
              {/* Sticker Picker */}
              <AnimatePresence>
                {showStickers && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    style={{
                      position: 'absolute', bottom: 80, left: 16, padding: 16,
                      background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-xl)',
                      display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, zIndex: 200, width: 300,
                    }}
                  >
                    {['👍','❤️','😂','😮','😢','👏','🎉','💯','🔥','👀','✨','🙌','🚀','💡','✅','❌','🙏','🤔','😎','🥳','💪','🌟','🎓','📚'].map(s => (
                      <motion.button
                        key={s} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                        onClick={() => { setInput(i => i + s); setShowStickers(false); }}
                        style={{ fontSize: 24, padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8 }}
                      >{s}</motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Attach */}
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current.click()}
                style={{ fontSize: 20, color: 'var(--text4)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px 6px' }}
              >📎</motion.button>
              <input type="file" ref={fileInputRef} hidden onChange={onFileUpload} />

              {/* Input */}
              <div style={{
                flex: 1, background: 'var(--surface2)', borderRadius: 18,
                padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 8,
                border: '1.5px solid var(--border)', transition: 'border-color 0.2s',
              }}>
                {isRecording ? (
                  <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 14, padding: '8px 0' }} className="animate-pulse">
                    🎙️ Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </div>
                ) : (
                  <input
                    ref={inputRef}
                    value={input} onChange={handleInputChange}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder={editingMsg ? 'Edit your message...' : 'Write a message... (Enter to send)'}
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--text)', fontWeight: 500, padding: '8px 0' }}
                  />
                )}
                <motion.button
                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.8 }}
                  onClick={() => setShowStickers(!showStickers)}
                  style={{ fontSize: 20, padding: '6px 4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >😊</motion.button>
              </div>

              {/* Send / Voice */}
              {input.trim() || editingMsg ? (
                <motion.button
                  whileHover={{ scale: 1.08, boxShadow: '0 8px 25px rgba(14,165,233,0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={sendMessage}
                  style={{
                    width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                    background: editingMsg
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #38bdf8, #0284c7)',
                    color: '#fff', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(14,165,233,0.3)',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{editingMsg ? '✓' : '➤'}</span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                  onClick={toggleVoice}
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
          </>
        )}
      </div>

      {/* Profile modal */}
      <UserModal
        userId={profileId}
        onClose={() => setProfileId(null)}
        onMessage={() => { setActivePrivateChat(profileId); setProfileId(null); }}
      />

      {/* Create Group Wizard */}
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupWizard
            onClose={() => setShowCreateGroup(false)}
            onCreated={(group) => {
              setShowCreateGroup(false);
              const newGroup = {
                id: group._id, name: group.name, avatar: null,
                lastMsgText: 'Group created', chatType: 'group',
                subject: group.subject, institution: group.institution_type,
              };
              setRecentChats(prev => [newGroup, ...prev]);
              selectChat(newGroup);
            }}
          />
        )}
      </AnimatePresence>

      {/* Incoming Call */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            call={incomingCall}
            onAccept={() => { setIncomingCall(null); /* WebRTC logic */ }}
            onDecline={() => {
              socket?.emit('call_decline', { callerId: incomingCall.callerId });
              setIncomingCall(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Outgoing Call Modal */}
      <AnimatePresence>
        {showCallModal && activePartner && (
          <OutgoingCallModal
            partner={activePartner}
            callType={callType}
            socket={socket}
            onClose={() => setShowCallModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ContactRow
// ─────────────────────────────────────────────────────────────
function ContactRow({ r, active, onClick, user }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: 4, backgroundColor: 'var(--surface2)' }}
      animate={{ backgroundColor: active ? 'var(--primary-100)' : 'transparent' }}
      style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        cursor: 'pointer', borderRadius: 14, margin: '2px 8px',
        transition: 'background 0.15s',
        borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar src={r.avatar || r.avatar_url} name={r.name} size={40} />
        {r.online && (
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 11, height: 11, borderRadius: '50%',
            background: '#10b981', border: '2px solid var(--surface)',
          }} />
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', marginLeft: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 13.5, color: active ? 'var(--primary-700)' : 'var(--text)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
            {r.chatType === 'group' ? `👥 ${r.name}` : r.name}
          </span>
          {r.lastMsgTime && (
            <span style={{ fontSize: 10, color: 'var(--text4)', flexShrink: 0, marginLeft: 4 }}>
              {fmtTime(r.lastMsgTime)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.lastMsgIsMine ? '✓ ' : ''}{r.lastMsgText || 'Start the conversation…'}
        </div>
      </div>
      {r.unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          style={{
            background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 900,
            borderRadius: 10, minWidth: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexShrink: 0,
          }}
        >{r.unreadCount > 9 ? '9+' : r.unreadCount}</motion.div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, showAvatar, activePartner, user, renderStatus, onReply, onEdit, onDelete, socket }) {
  const [showActions, setShowActions] = useState(false);

  if (msg._deleted) {
    return (
      <div style={{ textAlign: isMe ? 'right' : 'left', padding: '4px 0' }}>
        <span style={{ fontSize: 12, color: 'var(--text4)', fontStyle: 'italic' }}>🗑️ Message deleted</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{
        display: 'flex',
        flexDirection: isMe ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8, maxWidth: '80%',
        alignSelf: isMe ? 'flex-end' : 'flex-start',
        position: 'relative',
      }}
    >
      {/* Avatar */}
      {!isMe && (
        <div style={{ width: 32, flexShrink: 0 }}>
          {showAvatar && <Avatar src={activePartner?.avatar} name={activePartner?.name} size={30} />}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
        {/* Sender name in group */}
        {!isMe && showAvatar && activePartner?.chatType === 'group' && (
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', marginLeft: 2 }}>
            {msg.userName || msg.senderName || 'Member'}
          </span>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <div style={{
            padding: '4px 10px', borderRadius: '8px 8px 0 0',
            background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--surface3)',
            borderLeft: '3px solid var(--primary)',
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
            : (isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px'),
          background: isMe
            ? 'linear-gradient(135deg, #38bdf8, #0284c7)'
            : 'var(--surface3)',
          color: isMe ? '#fff' : 'var(--text)',
          border: isMe ? 'none' : '1px solid var(--border)',
          boxShadow: isMe ? '0 4px 12px rgba(14,165,233,0.25)' : '0 2px 8px rgba(0,0,0,0.04)',
          maxWidth: 360, wordBreak: 'break-word',
          fontSize: 14, lineHeight: 1.55,
          position: 'relative',
        }}>
          <MessageContent msg={msg} />
          <div style={{
            fontSize: 10, marginTop: 5, textAlign: 'right',
            color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--text4)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
          }}>
            {msg.edited && <span style={{ fontStyle: 'italic' }}>edited</span>}
            <span>{msg.createdAt ? fmtTime(msg.createdAt) : 'now'}</span>
            {renderStatus(msg)}
          </div>
        </div>
      </div>

      {/* Message action buttons */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute', top: -12,
              [isMe ? 'left' : 'right']: 0,
              display: 'flex', gap: 4, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10, padding: '3px 6px',
              boxShadow: 'var(--shadow-sm)', zIndex: 10,
            }}
          >
            <ActionBtn emoji="↩️" title="Reply" onClick={() => onReply(msg)} />
            {isMe && <ActionBtn emoji="✏️" title="Edit" onClick={() => onEdit(msg)} />}
            {isMe && <ActionBtn emoji="🗑️" title="Delete" onClick={() => onDelete(msg.id)} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionBtn({ emoji, title, onClick }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 3px', borderRadius: 6, transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >{emoji}</button>
  );
}

// ─────────────────────────────────────────────────────────────
// MessageContent — renders different types
// ─────────────────────────────────────────────────────────────
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
  if (msg.type === 'file') {
    return (
      <a href={msg.fileUrl} target="_blank" rel="noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        📎 {msg.content}
      </a>
    );
  }
  if (msg.type === 'audio') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={e => {
            const audio = e.currentTarget.nextElementSibling;
            if (audio.paused) { audio.play(); e.currentTarget.textContent = '⏸️'; }
            else { audio.pause(); e.currentTarget.textContent = '▶️'; }
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }}
        >▶️</button>
        <audio src={msg.fileUrl} preload="metadata" style={{ display: 'none' }}
          onEnded={e => { const btn = e.currentTarget.previousElementSibling; if(btn) btn.textContent = '▶️'; }}
        />
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 4 }}>
          <div style={{ width: '40%', height: '100%', background: 'rgba(255,255,255,0.8)', borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: 11, opacity: 0.7 }}>🎤</span>
      </div>
    );
  }
  return <span>{msg.content}</span>;
}

// ─────────────────────────────────────────────────────────────
// ChatHeaderBtn
// ─────────────────────────────────────────────────────────────
function ChatHeaderBtn({ onClick, title, emoji }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.25)' }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick} title={title}
      style={{
        width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
      }}
    >{emoji}</motion.button>
  );
}

// ─────────────────────────────────────────────────────────────
// IncomingCallModal
// ─────────────────────────────────────────────────────────────
function IncomingCallModal({ call, onAccept, onDecline }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      style={{
        position: 'fixed', top: 24, right: 24, zIndex: 9999,
        background: 'var(--surface)', borderRadius: 20, padding: '24px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 280,
      }}
    >
      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
        style={{ fontSize: 48 }}>{call.callType === 'video' ? '📹' : '📞'}</motion.div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
          {call.callerName}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Incoming {call.callType} call...
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onDecline}
          style={{ padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          ✕ Decline
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onAccept}
          style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          ✓ Accept
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// OutgoingCallModal
// ─────────────────────────────────────────────────────────────
function OutgoingCallModal({ partner, callType, socket, onClose }) {
  useEffect(() => {
    socket?.emit('call_offer', {
      targetId: partner.id,
      offer: { type: 'offer', sdp: 'placeholder' },
      callType,
    });
    const timeout = setTimeout(onClose, 30000); // 30s timeout
    return () => clearTimeout(timeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{
          background: 'var(--surface)', borderRadius: 28, padding: '48px 56px',
          textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}
      >
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
          }}>
          {callType === 'video' ? '📹' : '📞'}
        </motion.div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)' }}>{partner.name}</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 6 }}>
            Calling... {callType === 'video' ? 'Video' : 'Voice'}
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { socket?.emit('call_end', { targetId: partner.id }); onClose(); }}
          style={{
            padding: '14px 36px', background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: 14, fontWeight: 800, cursor: 'pointer', fontSize: 15,
            boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
          }}>
          ✕ Cancel
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// UserModal
// ─────────────────────────────────────────────────────────────
function UserModal({ userId, onClose, onMessage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      usersAPI.getUser(userId)
        .then(res => setData(res.data.profile))
        .finally(() => setLoading(false));
    } else { setData(null); }
  }, [userId]);

  return (
    <Modal open={!!userId} onClose={onClose} title="Contact Info" size="sm">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="lg" /></div>
      ) : data && (
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <Avatar src={data.avatar_url} name={data.name} size={100} />
          <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 20, marginBottom: 6 }}>{data.name}</h3>
          <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 10 }}>{data.bio || 'No bio yet'}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            {data.grade && <span className="badge badge-primary">{data.grade}</span>}
            {data.role && <span className={`badge ${data.role === 'teacher' ? 'badge-cyan' : 'badge-success'}`}>{data.role}</span>}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={onMessage}>Message</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
