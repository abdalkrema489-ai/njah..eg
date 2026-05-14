import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { groupsAPI } from '../../api/index';

const COLORS = ['#6366F1','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#3B82F6','#06B6D4'];
const EMOJIS = ['📚','🔬','🧮','⚡','🌍','🎨','💻','🏛️','🔭','🧬','📐','🎯','🚀','💡'];

export default function EditGroupModal({ group, isAr, onClose, onSave }) {
  const qc = useQueryClient();
  const [name, setName]     = useState(group.name || '');
  const [desc, setDesc]     = useState(group.description || '');
  const [color, setColor]   = useState(group.color || '#6366F1');
  const [emoji, setEmoji]   = useState(group.emoji || '📚');
  const [maxSt, setMaxSt]   = useState(group.maxStudents || 50);

  const mutation = useMutation({
    mutationFn: (data) => groupsAPI.updateGroup(group._id, data),
    onSuccess: (res) => {
      toast.success(isAr ? '✅ تم تحديث المجموعة' : '✅ Group updated');
      qc.invalidateQueries(['group', group._id]);
      qc.invalidateQueries(['groups']);
      onSave?.(res.data.group);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Update failed'),
  });

  const handleSubmit = () => {
    if (!name.trim()) return toast.error(isAr ? 'الاسم مطلوب' : 'Name is required');
    mutation.mutate({ name: name.trim(), description: desc.trim(), color, emoji, maxStudents: parseInt(maxSt) });
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:1000,padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }}
        style={{ background:'var(--surface)',borderRadius:24,padding:32,
          width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',
          direction: isAr?'rtl':'ltr' }}>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
          <h2 style={{ fontSize:20,fontWeight:800,color:'var(--text)',margin:0 }}>
            ✏️ {isAr ? 'تعديل المجموعة' : 'Edit Group'}
          </h2>
          <button onClick={onClose} style={{ width:36,height:36,borderRadius:50,border:'1px solid var(--border)',
            background:'var(--surface2)',cursor:'pointer',fontSize:18,color:'var(--text3)' }}>×</button>
        </div>

        {/* Preview */}
        <div style={{ display:'flex',alignItems:'center',gap:14,padding:16,
          background:color+'22',borderRadius:16,marginBottom:24,border:`2px solid ${color}44` }}>
          <span style={{ fontSize:36 }}>{emoji}</span>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:'var(--text)' }}>{name || (isAr?'اسم المجموعة':'Group Name')}</div>
            <div style={{ fontSize:12,color:'var(--text3)',marginTop:2 }}>{desc || (isAr?'وصف المجموعة':'Description')}</div>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13,fontWeight:700,color:'var(--text3)',display:'block',marginBottom:8 }}>
            {isAr ? 'اسم المجموعة *' : 'Group Name *'}
          </label>
          <input value={name} onChange={e=>setName(e.target.value)} maxLength={80}
            placeholder={isAr ? 'مثال: الصف الثالث الثانوي — رياضيات' : 'e.g., Grade 10 — Mathematics'}
            style={{ width:'100%',padding:'12px 16px',borderRadius:12,border:'1px solid var(--border)',
              background:'var(--surface2)',color:'var(--text)',fontSize:14,boxSizing:'border-box' }} />
        </div>

        {/* Description */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13,fontWeight:700,color:'var(--text3)',display:'block',marginBottom:8 }}>
            {isAr ? 'الوصف' : 'Description'}
          </label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} maxLength={300}
            placeholder={isAr ? 'وصف مختصر للمجموعة...' : 'Brief description...'}
            style={{ width:'100%',padding:'12px 16px',borderRadius:12,border:'1px solid var(--border)',
              background:'var(--surface2)',color:'var(--text)',fontSize:14,resize:'vertical',
              fontFamily:'inherit',boxSizing:'border-box' }} />
        </div>

        {/* Color */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13,fontWeight:700,color:'var(--text3)',display:'block',marginBottom:8 }}>
            {isAr ? 'اللون' : 'Color'}
          </label>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width:32,height:32,borderRadius:50,background:c,border:color===c?`3px solid var(--text)`:'3px solid transparent',
                cursor:'pointer',transition:'transform 0.15s',transform:color===c?'scale(1.2)':'scale(1)',
              }} />
            ))}
          </div>
        </div>

        {/* Emoji */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13,fontWeight:700,color:'var(--text3)',display:'block',marginBottom:8 }}>
            {isAr ? 'الأيقونة' : 'Icon'}
          </label>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{
                width:42,height:42,borderRadius:10,fontSize:20,border:`2px solid ${emoji==e?'var(--primary)':'var(--border)'}`,
                background:emoji===e?'rgba(99,102,241,0.1)':'var(--surface2)',cursor:'pointer',
              }}>{e}</button>
            ))}
          </div>
        </div>

        {/* Max Students */}
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:13,fontWeight:700,color:'var(--text3)',display:'block',marginBottom:8 }}>
            {isAr ? 'الحد الأقصى للطلاب' : 'Max Students'}
          </label>
          <input type="number" value={maxSt} onChange={e=>setMaxSt(e.target.value)} min={1} max={500}
            style={{ width:'100%',padding:'12px 16px',borderRadius:12,border:'1px solid var(--border)',
              background:'var(--surface2)',color:'var(--text)',fontSize:14,boxSizing:'border-box' }} />
        </div>

        {/* Actions */}
        <div style={{ display:'flex',gap:12 }}>
          <button onClick={onClose} style={{ flex:1,padding:'12px',borderRadius:12,
            border:'1px solid var(--border)',background:'transparent',cursor:'pointer',
            color:'var(--text)',fontWeight:700,fontSize:14 }}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            onClick={handleSubmit} disabled={!name.trim() || mutation.isPending}
            style={{ flex:2,padding:'12px',borderRadius:12,border:'none',cursor:'pointer',
              fontWeight:800,fontSize:14,color:'#fff',
              background:'linear-gradient(135deg,#6366F1,#8B5CF6)',
              opacity:(!name.trim()||mutation.isPending)?0.5:1 }}>
            {mutation.isPending ? '⏳' : (isAr ? '💾 حفظ التعديلات' : '💾 Save Changes')}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
