import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { playPing } from '../../../context/store';
import { useTranslation } from '../../../i18n/index';

export default function useWebRTC(socket, activePrivateChat, recentChats, searchResults, selectChat) {
  const { t } = useTranslation();
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
      toast.error(t('toast.noMicCam') || 'Microphone or Camera access denied');
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

      for (const cand of iceQueueRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(err => console.warn(err));
      }
      iceQueueRef.current = [];

    } catch (err) {
      console.error(err);
      toast.error(t('toast.callAcceptFailed') || 'Could not accept call');
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

  return {
    callState, setCallState,
    callType, setCallType,
    callPartner, setCallPartner,
    incomingCall, setIncomingCall,
    localStream, setLocalStream,
    remoteStream, setRemoteStream,
    isMuted, isVideoOff,
    callDuration,
    localVideoRef, remoteVideoRef,
    iceQueueRef,
    startCall, acceptCall, declineCall, endCall, toggleMute, toggleCamera, cleanupCall
  };
}
