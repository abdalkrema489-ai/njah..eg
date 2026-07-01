import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { chatAPI, filesAPI, usersAPI, groupsAPI } from '../../api/index';
import { getSocket, useSocket } from '../../hooks/index';
import { useVoice } from '../../hooks/useVoice';
import { useAuthStore, useChatStore, useUIStore, playPing } from '../../context/store';
import { useTranslation } from '../../i18n/index';
import { Avatar, Spinner, Modal, Button } from '../shared/UI';
import CreateGroupWizard from '../groups/CreateGroupWizard';

// ----------------------------------
// Helper: Format time
// ----------------------------------
const fmtTime = d => { try { return format(new Date(d), 'HH:mm'); } catch { return ''; } };

// ----------------------------------
// Subtle dot-grid background for chat area
// ----------------------------------
const CHAT_BG = {
  backgroundImage: `radial-gradient(circle, rgba(14,165,233,0.08) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { senderId: senderName }
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [editingMsg, setEditingMsg] = useState(null); // { id, content }
  // WebRTC Call States
  const [callState, setCallState] = useState(null); // null | 'calling' | 'incoming' | 'connected'
  const [callType, setCallType] = useState('audio'); // 'audio' | 'video'
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callPartner, setCallPartner] = useState(null); // { id, name, avatar }

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const cleanupCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setCallState(null);
    setIncomingCall(null);
    setCallPartner(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    iceQueueRef.current = [];
  }, []);

  const startCall = async (type = 'audio') => {
    if (!socket || !activePrivateChat) return;
    cleanupCall();
    try {
      setCallType(type);
      setCallState('calling');

      const partner = recentChats.find(c => c.id === activePrivateChat)
        || searchResults.find(c => c.id === activePrivateChat);
      if (partner) {
        setCallPartner({ id: partner.id, name: partner.name, avatar: partner.avatar || partner.avatar_url });
      } else {
        setCallPartner({ id: activePrivateChat, name: 'User', avatar: null });
      }

      const stream = await navigator.mediaDevices.getUserMedia(
        type === 'video' ? { audio: true, video: true } : { audio: true }
      );
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            targetId: activePrivateChat,
            candidate: event.candidate
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          cleanupCall();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_offer', {
        targetId: activePrivateChat,
        offer,
        callType: type
      });

    } catch (err) {
      console.error(err);
      toast.error(t('toast.noMicCam'));
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !socket) return;
    const callerId = incomingCall.callerId;
    const callOffer = incomingCall.offer;
    const type = incomingCall.callType;
    const callerName = incomingCall.callerName;
    const callerAvatar = incomingCall.callerAvatar;

    cleanupCall();
    try {
      setCallType(type);
      setCallState('connected');
      setCallPartner({ id: callerId, name: callerName, avatar: callerAvatar });
      setIncomingCall(null);

      const stream = await navigator.mediaDevices.getUserMedia(
        type === 'video' ? { audio: true, video: true } : { audio: true }
      );
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            targetId: callerId,
            candidate: event.candidate
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          cleanupCall();
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call_answer', {
        callerId,
        answer
      });

      // Process queued candidates
      for (const cand of iceQueueRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(err => console.warn(err));
      }
      iceQueueRef.current = [];

    } catch (err) {
      console.error(err);
      toast.error(t('toast.callAcceptFailed'));
      socket.emit('call_end', { targetId: callerId });
      cleanupCall();
    }
  };

  const declineCall = () => {
    if (!incomingCall || !socket) return;
    socket.emit('call_decline', { callerId: incomingCall.callerId });
    cleanupCall();
  };

  const endCall = () => {
    const targetId = callPartner?.id || activePrivateChat || (incomingCall ? incomingCall.callerId : null);
    if (socket && targetId) {
      socket.emit('call_end', { targetId });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Sync streams to video/audio tags
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // Call duration timer
  useEffect(() => {
    let timer;
    if (callState === 'connected') {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Ring tone loop for incoming calls
  useEffect(() => {
    let ringInterval;
    if (callState === 'incoming') {
      playPing();
      ringInterval = setInterval(() => {
        playPing();
      }, 2000);
    }
    return () => clearInterval(ringInterval);
  }, [callState]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);


  const activePartner = recentChats.find(c => c.id === activePrivateChat)
    || searchResults.find(c => c.id === activePrivateChat);
  const roomMessages = useChatStore(s => s.messages[activePartner?.subject] || []);
  const activeMsgs = activePartner?.chatType === 'group'
    ? roomMessages
    : (privateMessages[activePrivateChat] || []);

  // ---------------------------------- 1. Load recent chats + groups on mount ──
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

  // ---------------------------------- 2. Handle deep-link from notifications ──
  useEffect(() => {
    const targetId = searchParams.get('user');
    if (targetId && recentChats.length > 0) {
      const contact = recentChats.find(c => c.id === targetId);
      if (contact) selectChat(contact);
    }
  }, [searchParams, recentChats.length]);

  // ---------------------------------- 2b. Handle navigation from StudentsOverview ──
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

  // ---------------------------------- 3. Socket handlers ──
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
      setCallType(callType || 'audio');
      setCallState('incoming');
    };

    const onCallAnswered = async ({ answererId, answer }) => {
      if (peerRef.current) {
        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallState('connected');
          for (const cand of iceQueueRef.current) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch(err => console.warn(err));
          }
          iceQueueRef.current = [];
        } catch (err) {
          console.error(err);
          toast.error(t('toast.callFailed'));
          cleanupCall();
        }
      }
    };

    const onIceCandidate = async ({ from, candidate }) => {
      if (peerRef.current && peerRef.current.remoteDescription && peerRef.current.remoteDescription.type) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => console.warn(err));
      } else {
        iceQueueRef.current.push(candidate);
      }
    };

    const onCallEnded = () => {
      toast('Call ended');
      cleanupCall();
    };

    const onCallDeclined = () => {
      toast.error(t('toast.callDeclined'));
      cleanupCall();
    };

    socket.on('new_private_message', onNewPrivate);
    socket.on('private_history', onHistory);
    socket.on('messages_read_by_target', onMessagesRead);
    socket.on('private_user_typing', onPrivateTyping);
    socket.on('message_edited', onMessageEdited);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('call_incoming', onCallIncoming);
    socket.on('call_answered', onCallAnswered);
    socket.on('ice_candidate', onIceCandidate);
    socket.on('call_ended', onCallEnded);
    socket.on('call_declined', onCallDeclined);
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
      socket.off('call_answered', onCallAnswered);
      socket.off('ice_candidate', onIceCandidate);
      socket.off('call_ended', onCallEnded);
      socket.off('call_declined', onCallDeclined);
    };
  }, [socket, user, activePrivateChat, addPrivateMessage, setPrivateMessages, markMessagesRead, setRecentChats, updateRecentChat, cleanupCall]);

  // ---------------------------------- 4. User search ──
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

  // ---------------------------------- 5. Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMsgs]);

  // ---------------------------------- 6. Select a chat ──
  const selectChat = (item) => {
    setActivePrivateChat(item.id);
    setSearch('');
    setReplyTo(null);
    setEditingMsg(null);
    setSidebarOpen(false);

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

  // ---------------------------------- 7. Typing emit ──
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

  // ---------------------------------- 8. Send message ──
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

  // ---------------------------------- 9. File upload ──
  const onFileUpload = async (e) => {
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
      toast.success(t('toast.sent'), { id: 'upload' });
    } catch { toast.error(t('toast.uploadFailed'), { id: 'upload' }); }
  };

  // ---------------------------------- 10. Voice recording ──
  const toggleVoice = async () => {
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
          toast.success(t('toast.voiceSent'), { id: 'voice' });
        } catch { toast.error(t('toast.voiceFailed'), { id: 'voice' }); }
      }
    } else {
      const ok = await startRecording();
      if (!ok) toast.error(t('toast.micRequired'));
    }
  };

  // ---------------------------------- 11. Delete message ──
  const deleteMessage = (msgId) => {
    socket?.emit('delete_private_message', { messageId: msgId });
  };

  // ---------------------------------- 12. Message status icon ──
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

      {/* ══════════════════════════════
          LEFT SIDEBAR — Unified contacts
          ══════════════════════════════ */}
      <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        display: 'flex', flexDirection: 'column',
        background: 'var(--glass)', backdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--border)',
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
              placeholder={isAr ? 'ابحث عن شخص...' : 'Search people...'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Back button to clear active chat (exits chat view on mobile) */}
                <button
                  className="chat-sidebar-toggle"
                  onClick={() => setActivePrivateChat(null)}
                  style={{ padding: '4px 8px', fontSize: 18 }}
                >
                  ←
                </button>
                {/* Toggle button to open contacts drawer on mobile */}
                <button
                  className="chat-sidebar-toggle"
                  onClick={() => setSidebarOpen(true)}
                  style={{ marginRight: 4 }}
                >
                  👥 {isAr ? 'القائمة' : 'Menu'}
                </button>
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
            </div>

            {/* Header Actions */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {activePartner?.chatType !== 'group' && (
                  <>
                    <ChatHeaderBtn
                      onClick={() => startCall('audio')}
                      title="Voice Call"
                      icon={<PhoneIcon />}
                    />
                    <ChatHeaderBtn
                      onClick={() => startCall('video')}
                      title="Video Call"
                      icon={<VideoIcon />}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="scroll-y" style={{ ...CHAT_BG, flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
              padding: '12px 16px',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
              background: 'var(--glass)',
              backdropFilter: 'var(--glass-blur)', borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10, position: 'sticky',
              bottom: 0, zIndex: 10,
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
                    placeholder={editingMsg ? (isAr ? 'عدّل رسالتك...' : 'Edit your message...') : (isAr ? 'اكتب رسالة...' : 'Write a message...')}
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
            onAccept={acceptCall}
            onDecline={declineCall}
          />
        )}
      </AnimatePresence>

      {/* Immersive Calling Overlay */}
      <AnimatePresence>
        {callState && callState !== 'incoming' && (
          <CallingOverlay
            callState={callState}
            callType={callType}
            callPartner={callPartner}
            callDuration={callDuration}
            localStream={localStream}
            remoteStream={remoteStream}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            toggleMute={toggleMute}
            toggleCamera={toggleCamera}
            endCall={endCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------
// ContactRow
// ----------------------------------
function ContactRow({ r, active, onClick, user }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: 4 }}
      animate={{ backgroundColor: active ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0)' }}
      style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        cursor: 'pointer', borderRadius: 14, margin: '2px 8px',
        transition: 'background 0.15s',
        borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
        background: active ? 'rgba(99,102,241,0.08)' : undefined,
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

// ----------------------------------
// MessageBubble
// ----------------------------------
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

// ----------------------------------
// SVG Icon helpers
// ----------------------------------
function PhoneIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
  );
}

function VideoIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  );
}

// ----------------------------------
// ChatHeaderBtn — icon button in chat header with tooltip
// ----------------------------------
function ChatHeaderBtn({ onClick, title, icon }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={title}
        style={{
          width: 38, height: 38, borderRadius: 12,
          background: hovered ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.18s',
        }}
      >
        {icon}
      </motion.button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            style={{
              position: 'absolute', bottom: -34, left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15,23,42,0.92)',
              backdropFilter: 'blur(8px)',
              color: '#fff', fontSize: 11, fontWeight: 600,
              padding: '5px 10px', borderRadius: 8,
              whiteSpace: 'nowrap', zIndex: 200,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
            }}
          >{title}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------
// CallControlBtn — button in the active-call control bar
// ----------------------------------
function CallControlBtn({ onClick, active, activeColor = '#ef4444', label, icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        title={label}
        style={{
          width: 54, height: 54, borderRadius: '50%',
          background: active ? activeColor : 'rgba(255,255,255,0.1)',
          border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.14)'}`,
          cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: active ? `0 6px 20px ${activeColor}60` : '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'all 0.22s ease',
        }}
      >
        {icon}
      </motion.button>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ----------------------------------
// MessageContent — renders different types
// ----------------------------------
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

// ----------------------------------
// IncomingCallModal
// ----------------------------------
function IncomingCallModal({ call, onAccept, onDecline }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: 24,
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        minWidth: 320,
        color: '#fff',
      }}
    >
      <style>{`
        @keyframes incomingRingPulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); transform: scale(1); }
          50% { box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); transform: scale(1); }
        }
        .accept-btn-glow {
          animation: incomingRingPulse 1.6s infinite ease-in-out;
        }
        @keyframes avatarGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(56, 189, 248, 0.2); }
          50% { box-shadow: 0 0 25px rgba(56, 189, 248, 0.6); }
        }
        .caller-avatar-glow {
          animation: avatarGlow 2s infinite ease-in-out;
          border-radius: 50%;
        }
      `}</style>

      <div style={{ position: 'relative' }} className="caller-avatar-glow">
        <Avatar src={call.callerAvatar} name={call.callerName} size={80} />
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            border: '2px solid #0f172a',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          }}
        >
          {call.callType === 'video' ? '📹' : '📞'}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', color: '#fff' }}>
          {call.callerName}
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, fontWeight: 500 }} className="animate-pulse">
          Incoming {call.callType} call...
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onDecline}
          style={{
            flex: 1,
            padding: '12px 18px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            borderRadius: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
        >
          <span style={{ fontSize: 16 }}>✕</span> Decline
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onAccept}
          className="accept-btn-glow"
          style={{
            flex: 1,
            padding: '12px 18px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
          }}
        >
          <span style={{ fontSize: 16 }}>✓</span> Accept
        </motion.button>
      </div>
    </motion.div>
  );
}

// ----------------------------------
// CallingOverlay
// ----------------------------------
function CallingOverlay({
  callState,
  callType,
  callPartner,
  callDuration,
  localStream,
  remoteStream,
  localVideoRef,
  remoteVideoRef,
  isMuted,
  isVideoOff,
  toggleMute,
  toggleCamera,
  endCall,
}) {
  const formatDuration = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: '"Outfit", "Cairo", sans-serif',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 0.2; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .pulse-ring-element {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2.5px solid #0ea5e9;
          animation: pulseRing 2.4s infinite ease-out;
          pointer-events: none;
        }
        .pulse-ring-element:nth-child(2) {
          animation-delay: 0.8s;
        }
        .pulse-ring-element:nth-child(3) {
          animation-delay: 1.6s;
        }
        @keyframes audioWaveGlow {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.15); opacity: 0.75; }
        }
        .audio-wave-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%);
          animation: audioWaveGlow 2s infinite ease-in-out;
          pointer-events: none;
        }
      `}</style>

      {/* Voice/Calling Background Wave Decorator */}
      {callType === 'audio' && (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(#38bdf8 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
      )}

      {/* CALLING state */}
      {callState === 'calling' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 10 }}>
          <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="pulse-ring-element"></div>
            <div className="pulse-ring-element"></div>
            <div className="pulse-ring-element"></div>
            <Avatar src={callPartner?.avatar} name={callPartner?.name} size={120} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.02em', color: '#fff' }}>
              {callPartner?.name}
            </h2>
            <p style={{ fontSize: 15, color: '#38bdf8', letterSpacing: '0.05em', fontWeight: 600 }} className="animate-pulse">
              Calling ({callType === 'video' ? 'Video' : 'Voice'})...
            </p>
          </div>
        </div>
      )}

      {/* CONNECTED state (AUDIO) */}
      {callState === 'connected' && callType === 'audio' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 10 }}>
          <div style={{ position: 'relative', width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="audio-wave-pulse"></div>
            <Avatar src={callPartner?.avatar} name={callPartner?.name} size={130} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, color: '#fff' }}>
              {callPartner?.name}
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} className="animate-pulse" />
              <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>Voice Connected</span>
            </div>
          </div>
        </div>
      )}

      {/* CONNECTED state (VIDEO) */}
      {callState === 'connected' && callType === 'video' && (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {/* Remote Video Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              background: '#020617',
            }}
          />

          {/* Draggable Local PIP */}
          <motion.div
            drag
            dragConstraints={{ left: 16, right: window.innerWidth - 176, top: 16, bottom: window.innerHeight - 256 }}
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              width: 130,
              height: 195,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              border: '2px solid rgba(255,255,255,0.18)',
              background: '#0f172a',
              cursor: 'grab',
              zIndex: 100,
            }}
            whileTap={{ scale: 0.98, cursor: 'grabbing' }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {isVideoOff && (
              <div style={{ position: 'absolute', inset: 0, background: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>🚫</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Camera Off</span>
              </div>
            )}
          </motion.div>

          {/* Caller Details Header HUD (floating top left) */}
          <div
            style={{
              position: 'absolute',
              top: 24,
              left: 24,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(16px)',
              padding: '12px 18px',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              zIndex: 90,
            }}
          >
            <Avatar src={callPartner?.avatar} name={callPartner?.name} size={38} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{callPartner?.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: 1 }}>Video Calling</div>
            </div>
          </div>
        </div>
      )}

      {/* Control overlay container */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          zIndex: 100,
          width: '100%',
          padding: '0 24px',
        }}
      >
        {/* Timer Badge */}
        {callState === 'connected' && (
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
              color: '#38bdf8',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            ⏱️ {formatDuration(callDuration)}
          </div>
        )}

        {/* Floating Glass Control Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            background: 'rgba(15, 23, 42, 0.65)',
            padding: '14px 28px',
            borderRadius: 99,
            backdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          }}
        >
          {/* Mute Button */}
          <CallControlBtn
            onClick={toggleMute}
            active={isMuted}
            activeColor="#ef4444"
            label="Mute"
            icon={
              isMuted ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-1.01.9-2.17.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l6 6zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.79 1.79C13.56 15.85 12.79 16 12 16c-3.14 0-6-2.54-6-6H4.3c0 3.84 2.87 7.02 6.57 7.61V21h2.26v-3.39c1.07-.15 2.09-.49 3-.98l2.6 2.6L20 18 4.27 3z"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              )
            }
          />

          {/* Camera Button (Only shows for Video Calls) */}
          {callType === 'video' && (
            <CallControlBtn
              onClick={toggleCamera}
              active={isVideoOff}
              activeColor="#ef4444"
              label="Camera"
              icon={
                isVideoOff ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2z"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                )
              }
            />
          )}

          {/* End Call Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <motion.button
              whileHover={{ scale: 1.15, rotate: 135 }}
              whileTap={{ scale: 0.9 }}
              onClick={endCall}
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: '#ef4444',
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239,68,68,0.5)',
              }}
              title="End Call"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(135deg)' }}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </motion.button>
            <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>End Call</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ----------------------------------
// OutgoingCallModal
// ----------------------------------
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(20px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        style={{
          background: 'rgba(30, 41, 59, 0.65)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: 32,
          padding: '48px 64px',
          textAlign: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <style>{`
          @keyframes outgoingGlowPulse {
            0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.35); transform: scale(1); }
            50% { box-shadow: 0 0 0 24px rgba(56, 189, 248, 0); transform: scale(1.08); }
            100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); transform: scale(1); }
          }
          .outgoing-icon-pulse {
            animation: outgoingGlowPulse 1.8s infinite ease-in-out;
          }
        `}</style>

        <div
          className="outgoing-icon-pulse"
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            color: '#fff',
            boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
          }}
        >
          {callType === 'video' ? '📹' : '📞'}
        </div>

        <div>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.02em' }}>
            {partner.name}
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 6, fontWeight: 500 }} className="animate-pulse">
            Calling ({callType === 'video' ? 'Video' : 'Voice'})...
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            socket?.emit('call_end', { targetId: partner.id });
            onClose();
          }}
          style={{
            padding: '14px 38px',
            background: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            borderRadius: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.28)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
        >
          ✕ Cancel Call
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ----------------------------------
// UserModal
// ----------------------------------
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
