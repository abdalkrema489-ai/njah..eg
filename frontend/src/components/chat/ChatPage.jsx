import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { chatAPI, filesAPI, usersAPI, groupsAPI } from '../../api/index';
import { getSocket, useSocket } from '../../hooks/index';
import { useVoice } from '../../hooks/useVoice';
import { useAuthStore, useChatStore, useUIStore, playPing } from '../../context/store';
import { useTranslation } from '../../i18n/index';
import { Modal, Button, Avatar, Spinner } from '../shared/UI';

// Subcomponents
import ContactList from './ContactList';
import MessageArea from './MessageArea';
import CallOverlay from './CallOverlay';
import CreateGroupWizard from '../groups/CreateGroupWizard';

// Hooks
import useWebRTC from './hooks/useWebRTC';
import useChatSocket from './hooks/useChatSocket';

export default function ChatPage() {
  const { user } = useAuthStore();
  const lang = useUIStore(s => s.language);
  const isAr = lang === 'ar';
  const { t } = useTranslation();

  const {
    activePrivateChat, setActivePrivateChat, privateMessages, setPrivateMessages,
    addPrivateMessage, markMessagesRead, recentChats, setRecentChats, updateRecentChat,
  } = useChatStore();

  const socket = useSocket() || getSocket();
  const { isRecording, recordingTime, startRecording, stopRecording } = useVoice();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [profileId, setProfileId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Select chat helper
  const selectChat = (item) => {
    setActivePrivateChat(item.id);
    setSearch('');
    setReplyTo(null);
    setEditingMsg(null);
    setSidebarOpen(false);

    if (!recentChats.find(c => c.id === item.id)) {
      setRecentChats([{ ...item, lastMsgText: '', unreadCount: 0, chatType: item.chatType || 'private' }, ...recentChats]);
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
  };

  // WebRTC Hook
  const webrtc = useWebRTC(socket, activePrivateChat, recentChats, searchResults, selectChat);

  // Chat Socket Event Handlers Hook
  useChatSocket(socket, user, activePrivateChat, webrtc, setTypingUsers);

  // Load recent chats & groups
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
      } catch (err) {
        console.error('Failed to load chats:', err);
      }
    };
    load();
  }, [setRecentChats]);

  // Deep-link from notifications
  useEffect(() => {
    const targetId = searchParams.get('user');
    if (targetId && recentChats.length > 0) {
      const contact = recentChats.find(c => c.id === targetId);
      if (contact) selectChat(contact);
    }
  }, [searchParams, recentChats.length]);

  // Deep-link from StudentsOverview
  useEffect(() => {
    if (location.state?.openUserId) {
      const targetId = location.state.openUserId;
      const targetName = location.state.userName || 'User';
      const existing = recentChats.find(c => c.id === targetId);
      if (existing) {
        selectChat(existing);
      } else {
        const tempContact = { id: targetId, name: targetName, chatType: 'private' };
        selectChat(tempContact);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, recentChats.length]);

  // User search logic
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const delay = setTimeout(() => {
      usersAPI.searchUsers(search)
        .then(res => setSearchResults((res.data.users || []).map(u => ({ ...u, chatType: 'private' }))))
        .catch(console.error);
    }, 400);
    return () => clearTimeout(delay);
  }, [search]);

  // Send message handler
  const handleSendMessage = (content) => {
    if (!socket || !activePrivateChat) return;
    const chatType = activePartner?.chatType || 'private';

    if (editingMsg) {
      socket.emit('edit_private_message', { messageId: editingMsg.id, content });
      setEditingMsg(null);
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
    setReplyTo(null);
  };

  // File upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !activePrivateChat) return;
    e.target.value = '';
    try {
      toast.loading(isAr ? 'جاري إرسال الملف...' : 'Sending media...', { id: 'upload' });
      const { data } = await filesAPI.upload(file, { subject: 'private_chat', is_public: false });
      socket.emit('send_private_message', {
        receiverId: activePrivateChat, content: file.name,
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file',
        fileUrl: data.file.file_url,
      });
      toast.success(t('toast.sent') || 'Sent successfully', { id: 'upload' });
    } catch {
      toast.error(t('toast.uploadFailed') || 'Upload failed', { id: 'upload' });
    }
  };

  // Voice message handler
  const handleToggleVoice = async () => {
    if (isRecording) {
      const file = await stopRecording();
      if (file && socket && activePrivateChat) {
        toast.loading(isAr ? 'جاري إرسال التسجيل...' : 'Sending voice note...', { id: 'voice' });
        try {
          const { data } = await filesAPI.upload(file, { subject: 'private_chat' });
          socket.emit('send_private_message', {
            receiverId: activePrivateChat, content: 'Voice Message',
            type: 'audio', fileUrl: data.file.file_url,
          });
          toast.success(t('toast.voiceSent') || 'Voice note sent', { id: 'voice' });
        } catch {
          toast.error(t('toast.voiceFailed') || 'Voice note failed', { id: 'voice' });
        }
      }
    } else {
      const ok = await startRecording();
      if (!ok) toast.error(t('toast.micRequired') || 'Microphone access required');
    }
  };

  // Delete message handler
  const handleDeleteMessage = (msgId) => {
    socket?.emit('delete_private_message', { messageId: msgId });
  };

  // Read status formatter
  const renderStatus = (msg) => {
    if (msg.senderId !== user?.id) return null;
    const isRead = msg.status === 'read';
    const isDelivered = msg.status === 'delivered';
    return (
      <span style={{
        color: isRead ? '#8B5CF6' : isDelivered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)',
        fontSize: 11, marginLeft: 5, fontWeight: 800,
      }}>
        {isRead ? '💜✓✓' : isDelivered ? '✓✓' : '✓'}
      </span>
    );
  };

  const activePartner = recentChats.find(c => c.id === activePrivateChat)
    || searchResults.find(c => c.id === activePrivateChat);

  const roomMessages = useChatStore(s => s.messages[activePartner?.subject] || []);
  const activeMsgs = activePartner?.chatType === 'group'
    ? roomMessages
    : (privateMessages[activePrivateChat] || []);

  const privateChats = (search.trim() ? searchResults : recentChats).filter(c => c.chatType !== 'group');
  const groupChats = recentChats.filter(c => c.chatType === 'group');
  const isTypingActive = activePrivateChat && Object.keys(typingUsers).some(id => id === activePrivateChat
    || (activePartner?.chatType !== 'group' && typingUsers[id]));
  const typingName = Object.values(typingUsers)[0];

  return (
    <div
      className="animate-fade-up chat-layout-container"
      style={{
        display: 'flex', minHeight: 0, overflow: 'hidden',
        margin: '-12px -24px', position: 'relative', borderRadius: 24,
        border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}
    >
      {/* Sidebar Backdrop Overlay */}
      <div className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Left Sidebar Contacts Panel */}
      <ContactList
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        search={search}
        setSearch={setSearch}
        privateChats={privateChats}
        groupChats={groupChats}
        activePrivateChat={activePrivateChat}
        selectChat={selectChat}
        setShowCreateGroup={setShowCreateGroup}
        user={user}
      />

      {/* Right Messages Area Panel */}
      {!activePrivateChat ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', color: 'var(--text3)', textAlign: 'center', padding: 40,
          background: 'var(--surface)'
        }}>
          <motion.div
            animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 3 }}
            style={{
              width: 120, height: 120, borderRadius: '50%', marginBottom: 28,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56,
              boxShadow: '0 12px 40px rgba(99,102,241,0.3)',
            }}
          >
            💬
          </motion.div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
            {isAr ? 'رسائلك الخاصة' : 'Your messages'}
          </h1>
          <p style={{ fontSize: 14, maxWidth: 320, lineHeight: 1.7, color: 'var(--text3)' }}>
            {isAr ? 'اختر جهة اتصال أو مجموعة لبدء محادثة فورية.' : 'Select a contact or group to start a real-time conversation.'}
          </p>
        </div>
      ) : (
        <MessageArea
          isAr={isAr}
          activePartner={activePartner}
          activePrivateChat={activePrivateChat}
          setActivePrivateChat={setActivePrivateChat}
          setSidebarOpen={setSidebarOpen}
          isTypingActive={isTypingActive}
          typingName={typingName}
          loadingHistory={loadingHistory}
          activeMsgs={activeMsgs}
          user={user}
          renderStatus={renderStatus}
          onReply={setReplyTo}
          onEdit={setEditingMsg}
          onDelete={handleDeleteMessage}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          editingMsg={editingMsg}
          setEditingMsg={setEditingMsg}
          onSend={handleSendMessage}
          onFileUpload={handleFileUpload}
          onToggleVoice={handleToggleVoice}
          isRecording={isRecording}
          recordingTime={recordingTime}
          onStartCall={webrtc.startCall}
          onProfileClick={() => setProfileId(activePartner?.id)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
        />
      )}

      {/* Contact Profile Details Modal */}
      <UserModal
        userId={profileId}
        onClose={() => setProfileId(null)}
        onMessage={() => { setActivePrivateChat(profileId); setProfileId(null); }}
      />

      {/* Create Group Dialog Wizard */}
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

      {/* Immersive WebRTC calling over screen */}
      <CallOverlay {...webrtc} />

    </div>
  );
}

// Contact Profile Modal Subcomponent
function UserModal({ userId, onClose, onMessage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      usersAPI.getUser(userId)
        .then(res => setData(res.data.profile))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
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
