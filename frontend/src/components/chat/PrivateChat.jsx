import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import { usersAPI, filesAPI } from '../../api/index';
import { getSocket, useSocket } from '../../hooks/index';
import { useVoice } from '../../hooks/useVoice';
import { useAuthStore, useChatStore } from '../../context/store';
import { useTranslation } from '../../i18n/index';
import { Avatar, Spinner } from '../shared/UI';

// ── Helpers ──────────────────────────────────────────────
function msgDate(ts) {
  const d = new Date(ts);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday ' + format(d, 'HH:mm');
  return format(d, 'dd/MM/yy HH:mm');
}
function dateLabel(ts) {
  const d = new Date(ts);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMM d');
}
function needDateSep(msgs, i) {
  if (i === 0) return true;
  return new Date(msgs[i].createdAt).toDateString() !==
         new Date(msgs[i-1].createdAt).toDateString();
}

// ── STICKERS ─────────────────────────────────────────────
const STICKERS = ['👍','❤️','🔥','😂','😍','👏','🎓','📚','💡','✅','🎉','💯','🙏','😎','🤔','⭐'];

// ── Message Bubble ────────────────────────────────────────
function MsgBubble({ msg, isMe, showAvatar, target }) {
  const [hovered, setHovered] = useState(false);

  const renderContent = () => {
    if (msg.type === 'image' || (msg.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl))) {
      return <img src={msg.fileUrl} alt="img" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 12, display: 'block' }} />;
    }
    if (msg.type === 'audio' || msg.type === 'voice') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
          <span style={{ fontSize: 22 }}>🎤</span>
          <audio controls src={msg.fileUrl} style={{ height: 32, flex: 1 }} />
        </div>
      );
    }
    if (msg.type === 'file') {
      return (
        <a href={msg.fileUrl} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 10, color: isMe ? '#fff' : 'var(--text)', textDecoration: 'none' }}>
          <span style={{ fontSize: 28 }}>📎</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{msg.content}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Tap to open</div>
          </div>
        </a>
      );
    }
    // emoji-only check
    const emojiOnly = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u.test(msg.content);
    if (emojiOnly) {
      return <span style={{ fontSize: 40, lineHeight: 1.2 }}>{msg.content}</span>;
    }
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>;
  };

  const emojiOnly = msg.type === 'text' && /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u.test(msg.content || '');

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 8,
      justifyContent: isMe ? 'flex-end' : 'flex-start',
      marginBottom: 2,
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isMe && showAvatar && (
        <Avatar src={target?.avatar} name={target?.name} size={28} />
      )}
      {!isMe && !showAvatar && <div style={{ width: 28 }} />}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            padding: emojiOnly ? '4px 8px' : '10px 14px',
            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isMe
              ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
              : 'var(--surface2)',
            color: isMe ? '#fff' : 'var(--text)',
            fontSize: 14, lineHeight: 1.5,
            boxShadow: isMe ? '0 2px 12px rgba(99,102,241,0.3)' : '0 1px 4px rgba(0,0,0,0.2)',
            border: isMe ? 'none' : '1px solid var(--border)',
            position: 'relative',
          }}
        >
          {renderContent()}
        </motion.div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
          {msgDate(msg.createdAt)}
          {isMe && <span style={{ color: '#10B981', fontSize: 13 }}>✓✓</span>}
        </div>
      </div>
    </div>
  );
}

// ── Contact Item ──────────────────────────────────────────
function ContactItem({ chat, active, onClick, unread }) {
  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }} whileTap={{ scale: 0.99 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
        background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
        borderLeft: active ? '3px solid #6366F1' : '3px solid transparent',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar src={chat.avatar} name={chat.name} size={46} />
        <div style={{
          position: 'absolute', bottom: 1, right: 1, width: 11, height: 11,
          borderRadius: '50%', background: '#10B981', border: '2px solid var(--ink)',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{chat.name}</span>
          <span style={{ fontSize: 11, color: unread ? '#10B981' : 'var(--text3)' }}>
            {chat.lastTs ? format(new Date(chat.lastTs), 'HH:mm') : ''}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {chat.lastMsg || 'Start a conversation'}
          </span>
          {unread > 0 && (
            <span style={{
              minWidth: 20, height: 20, borderRadius: 10, background: '#10B981',
              color: '#fff', fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 5px', flexShrink: 0,
            }}>{unread > 99 ? '99+' : unread}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function PrivateChat() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const {
    activePrivateChat, setActivePrivateChat,
    privateMessages, setPrivateMessages, addPrivateMessage,
    recentChats, setRecentChats,
  } = useChatStore();

  const socket = useSocket() || getSocket();
  const { isRecording, recordingTime, startRecording, stopRecording } = useVoice();

  const [search, setSearch]           = useState('');
  const [input, setInput]             = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [showAttach, setShowAttach]   = useState(false);
  const [callState, setCallState]     = useState(null);
  const [callType, setCallType]       = useState('audio');
  const [incomingCall, setIncomingCall] = useState(null);
  const [profileId, setProfileId]     = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const bottomRef   = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef    = useRef(null);
  const peerRef     = useRef(null);
  const localStreamRef  = useRef(null);
  const localAudioRef   = useRef(null);
  const remoteAudioRef  = useRef(null);

  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: ['users', 'search', search],
    queryFn: () => usersAPI.searchUsers(search),
    enabled: search.length > 1,
  });
  const searchResults = searchData?.data?.users || [];

  const activeTarget  = recentChats.find(c => c.id === activePrivateChat) || null;
  const chatMessages  = privateMessages[activePrivateChat] || [];

  // ── WebRTC ────────────────────────────────────────────
  const closePeer = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    setCallState(null); setIncomingCall(null);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onIncoming = (d) => { setIncomingCall(d); setCallType(d.callType || 'audio'); setCallState('incoming'); };
    const onAnswered = async ({ answer }) => {
      if (peerRef.current) { await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer)); setCallState('in-call'); }
    };
    const onIce = ({ candidate }) => { if (peerRef.current && candidate) peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); };
    const onEnded = () => { toast('Call ended'); closePeer(); };
    const onDeclined = () => { toast.error(t('toast.callDeclined')); closePeer(); };
    socket.on('call_incoming', onIncoming); socket.on('call_answered', onAnswered);
    socket.on('ice_candidate', onIce); socket.on('call_ended', onEnded); socket.on('call_declined', onDeclined);
    return () => {
      socket.off('call_incoming', onIncoming); socket.off('call_answered', onAnswered);
      socket.off('ice_candidate', onIce); socket.off('call_ended', onEnded); socket.off('call_declined', onDeclined);
    };
  }, [socket, closePeer]);

  useEffect(() => {
    if (!activePrivateChat || !socket) return;
    setLoadingHistory(true);
    socket.emit('fetch_private_history', { targetId: activePrivateChat });
    const onHistory = ({ targetId, messages }) => {
      if (targetId === activePrivateChat) { setPrivateMessages(targetId, messages); setLoadingHistory(false); }
    };
    socket.on('private_history', onHistory);
    return () => socket.off('private_history', onHistory);
  }, [activePrivateChat, socket, setPrivateMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const startCall = useCallback(async (type = 'audio') => {
    if (!socket || !activePrivateChat) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(type === 'video' ? { audio: true, video: true } : { audio: true });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };
      pc.onicecandidate = (e) => { if (e.candidate) socket.emit('ice_candidate', { targetId: activePrivateChat, candidate: e.candidate }); };
      pc.onconnectionstatechange = () => { if (['disconnected','failed','closed'].includes(pc.connectionState)) closePeer(); };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_offer', { targetId: activePrivateChat, offer, callType: type });
      setCallType(type); setCallState('calling');
    } catch { toast.error(t('toast.noMicCam')); }
  }, [socket, activePrivateChat, closePeer]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(incomingCall.callType === 'video' ? { audio: true, video: true } : { audio: true });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };
      pc.onicecandidate = (e) => { if (e.candidate) socket.emit('ice_candidate', { targetId: incomingCall.callerId, candidate: e.candidate }); };
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call_answer', { callerId: incomingCall.callerId, answer });
      setCallState('in-call'); setIncomingCall(null);
    } catch { toast.error(t('toast.callAcceptFailed')); }
  }, [incomingCall, socket, closePeer]);

  const declineCall = useCallback(() => {
    if (!incomingCall || !socket) return;
    socket.emit('call_decline', { callerId: incomingCall.callerId });
    setCallState(null); setIncomingCall(null);
  }, [incomingCall, socket]);

  const endCall = useCallback(() => {
    if (socket && activePrivateChat) socket.emit('call_end', { targetId: activePrivateChat });
    closePeer();
  }, [socket, activePrivateChat, closePeer]);

  const startChat = (target) => {
    if (target.id === user?.id) return toast.error("Can't chat with yourself!");
    if (!recentChats.find(c => c.id === target.id)) {
      setRecentChats([{ id: target.id, name: target.name, avatar: target.avatar_url || target.avatar, lastMsg: '', lastTs: null }, ...recentChats]);
    }
    setActivePrivateChat(target.id);
    setSearch('');
    if (window.innerWidth < 768) setSidebarVisible(false);
  };

  const sendMessage = () => {
    if (!input.trim() || !socket || !activePrivateChat) return;
    socket.emit('send_private_message', { receiverId: activePrivateChat, content: input.trim() });
    setInput(''); setShowStickers(false); setShowAttach(false);
  };

  const sendSticker = (emoji) => {
    if (!socket || !activePrivateChat) return;
    socket.emit('send_private_message', { receiverId: activePrivateChat, content: emoji });
    setShowStickers(false);
  };

  const onFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !activePrivateChat) return;
    try {
      toast.loading('Uploading…', { id: 'p-upload' });
      const { data } = await filesAPI.upload(file, { is_public: false });
      socket.emit('send_private_message', {
        receiverId: activePrivateChat, content: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file', fileUrl: data.file.file_url,
      });
      toast.success(t('toast.sent'), { id: 'p-upload' });
    } catch { toast.error(t('toast.uploadFailed'), { id: 'p-upload' }); }
  };

  const toggleVoice = async () => {
    if (isRecording) {
      const file = await stopRecording();
      if (file) {
        toast.loading('Sending voice…', { id: 'p-voice' });
        try {
          const { data } = await filesAPI.upload(file, { is_public: false });
          socket.emit('send_private_message', { receiverId: activePrivateChat, content: 'Voice Message', type: 'audio', fileUrl: data.file.file_url });
          toast.success(t('toast.voiceSent'), { id: 'p-voice' });
        } catch { toast.error(t('toast.voiceFailed'), { id: 'p-voice' }); }
      }
    } else {
      const ok = await startRecording();
      if (!ok) toast.error(t('toast.micRequired'));
    }
  };

  // ── Main Layout ───────────────────────────────────────
  return (
    <div style={{ height: 'calc(100vh - 90px)', display: 'flex', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--ink2)' }}>
      
      {/* ── LEFT SIDEBAR ─────────────────────────────── */}
      <AnimatePresence>
        {sidebarVisible && (
          <motion.div
            initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              display: 'flex', flexDirection: 'column', flexShrink: 0,
              borderRight: '1px solid var(--border)', background: 'var(--glass)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Sidebar Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar src={user?.avatar_url} name={user?.name} size={38} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{user?.name}</div>
                    <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>● Online</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button title="New chat" onClick={() => inputRef.current?.focus()}
                    style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                </div>
              </div>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text3)' }}>🔍</span>
                <input
                  ref={inputRef}
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search or start a new chat..."
                  style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13 }}
                />

                {/* Search results dropdown */}
                <AnimatePresence>
                  {search.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 14, maxHeight: 260, overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                    >
                      {searching ? <div style={{ padding: 20, textAlign: 'center' }}><Spinner size="sm" /></div>
                        : searchResults.length === 0 ? <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>No users found</div>
                        : searchResults.map(u => (
                          <motion.div key={u.id} whileHover={{ background: 'rgba(99,102,241,0.08)' }}
                            onClick={() => startChat(u)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer' }}
                          >
                            <Avatar src={u.avatar_url} name={u.name} size={36} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.grade || 'Student'}</div>
                            </div>
                          </motion.div>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Contact list */}
            <div className="scroll-y" style={{ flex: 1 }}>
              {recentChats.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>💬</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No conversations yet.<br />Search for a student to start chatting.</div>
                </div>
              ) : recentChats.map(chat => (
                <ContactItem
                  key={chat.id} chat={chat}
                  active={activePrivateChat === chat.id}
                  onClick={() => { setActivePrivateChat(chat.id); if (window.innerWidth < 768) setSidebarVisible(false); }}
                  unread={0}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RIGHT: CHAT AREA ──────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {activePrivateChat ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--surface2)', backdropFilter: 'blur(20px)',
            }}>
              <button onClick={() => setSidebarVisible(v => !v)}
                style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>☰</button>
              <div onClick={() => setProfileId(activePrivateChat)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar src={activeTarget?.avatar} name={activeTarget?.name} size={42} />
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#10B981', border: '2px solid var(--surface2)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{activeTarget?.name}</div>
                  <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Online</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ icon: '📞', fn: () => startCall('audio'), title: 'Voice Call' }, { icon: '📹', fn: () => startCall('video'), title: 'Video Call' }].map(({ icon, fn, title }) => (
                  <button key={title} onClick={fn} title={title}
                    style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 18 }}>{icon}</button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="scroll-y" style={{
              flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4,
              background: 'var(--ink2)',
              backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(99,102,241,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.03) 0%, transparent 50%)',
            }}>
              {loadingHistory ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
              ) : chatMessages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Avatar src={activeTarget?.avatar} name={activeTarget?.name} size={72} />
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{activeTarget?.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>Say hello! 👋</div>
                </div>
              ) : (
                chatMessages.map((msg, i) => {
                  const isMe = msg.senderId === user?.id;
                  const showAvatar = !isMe && (i === 0 || chatMessages[i-1]?.senderId !== msg.senderId);
                  return (
                    <div key={msg.id || i}>
                      {needDateSep(chatMessages, i) && (
                        <div style={{ textAlign: 'center', margin: '12px 0' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', background: 'var(--surface2)', padding: '4px 14px', borderRadius: 20, border: '1px solid var(--border)' }}>
                            {dateLabel(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <MsgBubble msg={msg} isMe={isMe} showAvatar={showAvatar} target={activeTarget} />
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', position: 'relative' }}>
              {/* Sticker picker */}
              <AnimatePresence>
                {showStickers && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    style={{
                      position: 'absolute', bottom: '100%', left: 16, padding: 12,
                      background: 'var(--surface3)', border: '1px solid var(--border2)',
                      borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: 6, boxShadow: 'var(--shadow-lg)', marginBottom: 8, zIndex: 10,
                    }}
                  >
                    {STICKERS.map(s => (
                      <button key={s} onClick={() => sendSticker(s)}
                        style={{ fontSize: 24, padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >{s}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="file" ref={fileInputRef} hidden onChange={onFileUpload} />
                
                {/* Emoji */}
                <button onClick={() => setShowStickers(v => !v)}
                  style={{ width: 38, height: 38, borderRadius: 12, background: showStickers ? 'rgba(99,102,241,0.15)' : 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 20, flexShrink: 0 }}>
                  😊
                </button>
                {/* Attach */}
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 20, flexShrink: 0 }}>
                  📎
                </button>

                {/* Text input */}
                {isRecording ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 24, border: '1px solid rgba(239,68,68,0.3)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', animation: 'pulse-red 1.5s infinite' }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#EF4444' }}>
                      Recording {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button onClick={() => stopRecording().then(() => toast('Recording cancelled'))}
                      style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <input
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message…"
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 24, fontSize: 14,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                    }}
                  />
                )}

                {/* Voice / Send */}
                {input.trim() ? (
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={sendMessage}
                    style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.35)', flexShrink: 0 }}>
                    ➤
                  </motion.button>
                ) : (
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={toggleVoice}
                    className={isRecording ? 'pulse-recording' : ''}
                    style={{ width: 42, height: 42, borderRadius: '50%', background: isRecording ? '#EF4444' : 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                    🎤
                  </motion.button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Welcome screen */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, boxShadow: '0 0 40px rgba(99,102,241,0.25)' }}>💬</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Najah Messages</h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', textAlign: 'center', maxWidth: 320 }}>
              Select a conversation or search for a student to start chatting
            </p>
            <button onClick={() => setSidebarVisible(true)}
              style={{ padding: '10px 24px', borderRadius: 24, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Open Contacts
            </button>
          </div>
        )}

        {/* Hidden audio for WebRTC */}
        <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

        {/* Incoming Call */}
        <AnimatePresence>
          {callState === 'incoming' && incomingCall && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(3,3,5,0.95)', backdropFilter: 'blur(20px)', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <div style={{ animation: 'float 3s ease-in-out infinite' }}>
                <Avatar src={incomingCall.callerAvatar} name={incomingCall.callerName} size={110} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{incomingCall.callerName}</h2>
                <p style={{ color: 'var(--text3)', fontSize: 14, letterSpacing: 2 }}>Incoming {incomingCall.callType} call…</p>
              </div>
              <div style={{ display: 'flex', gap: 28 }}>
                <button onClick={declineCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 26, border: 'none', cursor: 'pointer', boxShadow: '0 0 24px rgba(239,68,68,0.5)' }}>📵</button>
                <button onClick={acceptCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#10B981', color: '#fff', fontSize: 26, border: 'none', cursor: 'pointer', boxShadow: '0 0 24px rgba(16,185,129,0.5)' }}>📞</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Outgoing / In-call */}
        <AnimatePresence>
          {(callState === 'calling' || callState === 'in-call') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(3,3,5,0.95)', backdropFilter: 'blur(20px)', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <div style={{ animation: callState === 'calling' ? 'pulse-ring 1.5s infinite' : 'none' }}>
                <Avatar src={activeTarget?.avatar} name={activeTarget?.name} size={110} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{activeTarget?.name}</h2>
                <p style={{ color: callState === 'in-call' ? '#10B981' : 'var(--text3)', fontSize: 14, letterSpacing: 2 }}>
                  {callState === 'calling' ? 'Calling…' : 'Call connected'}
                </p>
              </div>
              <button onClick={endCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 26, border: 'none', cursor: 'pointer', boxShadow: '0 0 24px rgba(239,68,68,0.5)' }}>📞</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UserProfileModal userId={profileId} onClose={() => setProfileId(null)} onMessage={(u) => startChat(u)} />
    </div>
  );
}

function UserProfileModal({ userId, onClose, onMessage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (userId) { setLoading(true); usersAPI.getUser(userId).then(r => setData(r.data.profile)).finally(() => setLoading(false)); }
    else setData(null);
  }, [userId]);

  // Simple inline modal
  if (!userId) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(3,3,5,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 24, padding: 32, width: 340, boxShadow: 'var(--shadow-lg)' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div> : data && (
          <div style={{ textAlign: 'center' }}>
            <Avatar src={data.avatar_url} name={data.name} size={80} />
            <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 16, marginBottom: 4 }}>{data.name}</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{data.grade || 'Student'} · Level {data.level || 1}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
              {[['🔥', data.streak_days || 0, 'Streak'], ['⭐', data.xp_points || 0, 'XP'], ['📚', data.sessions_done || 0, 'Sessions']].map(([icon, val, lbl]) => (
                <div key={lbl} style={{ padding: '12px 8px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 20 }}>{icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>{lbl}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Close</button>
              <button onClick={() => { onMessage(data); onClose(); }} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Message</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
