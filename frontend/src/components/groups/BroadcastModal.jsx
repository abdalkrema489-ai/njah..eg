import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { groupsAPI } from '../../api/index';
import { haptic } from '../../utils/haptics';

export default function BroadcastModal({ groupId, studentsCount, isAr, onClose }) {
  const [msg, setMsg]   = useState('');
  const [type, setType] = useState('announcement');

  const mutation = useMutation({
    mutationFn: () => groupsAPI.broadcast(groupId, { message: msg, type }),
    onSuccess: (d) => {
      toast.success(isAr ? `✅ أُرسلت لـ ${d.data.sent} طالب` : `✅ Sent to ${d.data.sent} students`);
      haptic.success();
      onClose();
    },
    onError: () => toast.error(isAr ? 'فشل الإرسال' : 'Send failed'),
  });

  const TYPES = [
    { v:'announcement', icon:'📢', ar:'إعلان',  en:'Announcement' },
    { v:'reminder',     icon:'🔔', ar:'تذكير',  en:'Reminder'     },
    { v:'important',    icon:'⚠️', ar:'مهم',    en:'Important'    },
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        style={{ background:'var(--surface)', borderRadius:24, padding:32, width:480, maxWidth:'95vw', direction: isAr?'rtl':'ltr' }}>

        <h3 style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>
          📢 {isAr ? 'رسالة جماعية' : 'Broadcast Message'}
        </h3>

        {/* Type selector */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {TYPES.map(t => (
            <button key={t.v} onClick={() => setType(t.v)}
              style={{ flex:1, padding:'10px 8px', borderRadius:12, border:`2px solid ${type===t.v?'var(--primary)':'var(--border)'}`,
                background: type===t.v?'rgba(99,102,241,0.1)':'transparent', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--text)' }}>
              {t.icon} {isAr ? t.ar : t.en}
            </button>
          ))}
        </div>

        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} maxLength={500}
          placeholder={isAr ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
          style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1px solid var(--border)',
            background:'var(--surface2)', color:'var(--text)', fontSize:14, resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />

        <p style={{ fontSize:12, color:'var(--text3)', marginTop:6, marginBottom:20 }}>
          {isAr ? `سيُرسل لـ ${studentsCount} طالب` : `Will be sent to ${studentsCount} students`} • {msg.length}/500
        </p>

        <div style={{ display:'flex', gap:12 }}>
          <button onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--text)', fontWeight:700 }}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            onClick={() => { haptic.medium(); mutation.mutate(); }} disabled={!msg.trim() || mutation.isPending}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', fontWeight:800, fontSize:14,
              background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff',
              opacity: !msg.trim()?0.5:1 }}>
            {mutation.isPending ? '⏳' : (isAr ? '📨 إرسال للجميع' : '📨 Send to All')}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
