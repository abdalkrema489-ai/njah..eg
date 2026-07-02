import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../shared/UI';
import { useTranslation } from '../../i18n/index';

export default function CallOverlay({
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
  incomingCall,
  acceptCall,
  declineCall
}) {
  const { t } = useTranslation();

  const formatDuration = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (localVideoRef?.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState, localVideoRef]);

  useEffect(() => {
    if (remoteVideoRef?.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState, remoteVideoRef]);

  if (!callState) return null;

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
        fontFamily: 'var(--font-head), sans-serif',
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
          border: 2.5px solid #6366F1;
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
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
          animation: audioWaveGlow 2s infinite ease-in-out;
          pointer-events: none;
        }
      `}</style>

      {/* Voice/Calling Background Wave Decorator */}
      {callType === 'audio' && (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(#6366F1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
      )}

      {/* ── 1. INCOMING CALL STATE ── */}
      {callState === 'incoming' && incomingCall && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 10 }}>
          <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="pulse-ring-element" style={{ borderColor: '#10B981' }}></div>
            <div className="pulse-ring-element" style={{ borderColor: '#10B981' }}></div>
            <Avatar src={incomingCall.callerAvatar} name={incomingCall.callerName} size={120} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>
              {incomingCall.callerName}
            </h2>
            <p style={{ fontSize: 15, color: '#10B981', fontWeight: 700 }} className="animate-pulse">
              📞 {t('chat.incoming') || 'Incoming Call'} ({incomingCall.callType === 'video' ? 'Video' : 'Voice'})
            </p>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={declineCall}
              style={{
                width: 64, height: 64, borderRadius: '50%', background: '#EF4444', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.4)', color: '#fff'
              }}
            >
              ✕
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={acceptCall}
              style={{
                width: 64, height: 64, borderRadius: '50%', background: '#10B981', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.4)', color: '#fff'
              }}
            >
              ✓
            </motion.button>
          </div>
        </div>
      )}

      {/* ── 2. CALLING STATE (OUTGOING) ── */}
      {callState === 'calling' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 10 }}>
          <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="pulse-ring-element"></div>
            <div className="pulse-ring-element"></div>
            <Avatar src={callPartner?.avatar} name={callPartner?.name} size={120} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>
              {callPartner?.name}
            </h2>
            <p style={{ fontSize: 15, color: '#6366F1', fontWeight: 600 }} className="animate-pulse">
              {t('chat.calling') || 'Calling...'}
            </p>
          </div>
        </div>
      )}

      {/* ── 3. CONNECTED STATE (AUDIO) ── */}
      {callState === 'connected' && callType === 'audio' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 10 }}>
          <div style={{ position: 'relative', width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="audio-wave-pulse"></div>
            <Avatar src={callPartner?.avatar} name={callPartner?.name} size={130} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: '#fff' }}>
              {callPartner?.name}
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} className="animate-pulse" />
              <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
                {t('chat.inCall') || 'In Call'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. CONNECTED STATE (VIDEO) ── */}
      {callState === 'connected' && callType === 'video' && (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {/* Remote Video Stream (Main screen) */}
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

          {/* Local PIP Video Stream (Bottom Right) */}
          <div
            style={{
              position: 'absolute',
              bottom: 120,
              right: 24,
              width: 120,
              height: 90,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              border: '2px solid rgba(255,255,255,0.2)',
              background: '#0f172a',
              zIndex: 100,
            }}
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
              <div style={{ position: 'absolute', inset: 0, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16 }}>🚫</span>
              </div>
            )}
          </div>

          {/* Callee info header HUD overlay */}
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
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: 1 }}>{t('chat.inCall') || 'In Call'}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. LOWER CONTROLS & HUD BAR ── */}
      {callState !== 'incoming' && (
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
          {/* Duration timer indicator */}
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
                color: '#6366F1',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              ⏱️ {formatDuration(callDuration)}
            </div>
          )}

          {/* Floating glass panel buttons container */}
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
            {/* Audio Mute toggle */}
            <CallControlBtn
              onClick={toggleMute}
              active={isMuted}
              activeColor="#EF4444"
              label={isMuted ? (t('chat.unmute') || 'Unmute') : (t('chat.mute') || 'Mute')}
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

            {/* Video Camera toggle */}
            {callType === 'video' && (
              <CallControlBtn
                onClick={toggleCamera}
                active={isVideoOff}
                activeColor="#EF4444"
                label={isVideoOff ? (t('chat.cameraOn') || 'Camera On') : (t('chat.cameraOff') || 'Camera Off')}
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

            {/* End Call red button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <motion.button
                whileHover={{ scale: 1.15, rotate: 135 }}
                whileTap={{ scale: 0.9 }}
                onClick={endCall}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  background: '#EF4444',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(239,68,68,0.5)',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(135deg)' }}>
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </motion.button>
              <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>{t('chat.endCall') || 'End'}</span>
            </div>

          </div>
        </div>
      )}

    </motion.div>
  );
}

function CallControlBtn({ onClick, active, activeColor = '#ef4444', label, icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        title={label}
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: active ? activeColor : 'rgba(255,255,255,0.08)',
          border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
          cursor: 'pointer',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? `0 6px 20px ${activeColor}60` : 'none',
          transition: 'all 0.2s',
        }}
      >
        {icon}
      </motion.button>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}
