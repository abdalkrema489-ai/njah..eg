import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useChatStore, playPing } from '../../../context/store';
import { useTranslation } from '../../../i18n/index';

export default function useChatSocket(socket, user, activePrivateChat, webrtc, setTypingUsers) {
  const { t } = useTranslation();
  const {
    addPrivateMessage,
    markMessagesRead,
    recentChats,
    setRecentChats,
    updateRecentChat,
    setPrivateMessages
  } = useChatStore();

  useEffect(() => {
    if (!socket || !user) return;

    const onNewPrivate = (msg) => {
      const targetId = msg.senderId === user?.id ? msg.receiverId : msg.senderId;
      addPrivateMessage(targetId, msg);
      if (msg.senderId !== user?.id) playPing();

      const existing = useChatStore.getState().recentChats.find(c => c.id === targetId);
      if (existing) {
        updateRecentChat(targetId, {
          lastMsgText: msg.type === 'text' ? msg.content : `sent a ${msg.type}`,
          lastMsgTime: msg.createdAt,
          lastMsgStatus: msg.status,
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
      webrtc.setIncomingCall({ callerId, callerName, callerAvatar, offer, callType });
      webrtc.setCallType(callType || 'audio');
      webrtc.setCallState('incoming');
    };

    const onCallAnswered = async ({ answererId, answer }) => {
      if (webrtc.peerRef?.current || webrtc.cleanupCall) {
        // Find peer connection
        const pc = webrtc.peerRef?.current;
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            webrtc.setCallState('connected');
            for (const cand of webrtc.iceQueueRef.current || []) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(err => console.warn(err));
            }
            if (webrtc.iceQueueRef) webrtc.iceQueueRef.current = [];
          } catch (err) {
            console.error(err);
            toast.error(t('toast.callFailed') || 'Call failed');
            webrtc.cleanupCall();
          }
        }
      }
    };

    const onIceCandidate = async ({ from, candidate }) => {
      const pc = webrtc.peerRef?.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => console.warn(err));
      } else if (webrtc.iceQueueRef) {
        webrtc.iceQueueRef.current.push(candidate);
      }
    };

    const onCallEnded = () => {
      toast(t('chat.callEnded') || 'Call ended');
      webrtc.cleanupCall();
    };

    const onCallDeclined = () => {
      toast.error(t('toast.callDeclined') || 'Call declined');
      webrtc.cleanupCall();
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
  }, [socket, user, activePrivateChat, webrtc, addPrivateMessage, setPrivateMessages, markMessagesRead, setRecentChats, updateRecentChat, setTypingUsers]);
}
