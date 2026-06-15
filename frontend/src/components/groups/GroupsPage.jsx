// src/components/groups/GroupsPage.jsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { groupsAPI } from '../../api/index';
import { useAuthStore } from '../../context/store';
import { useTranslation } from '../../i18n/index';
import CreateGroupWizard from './CreateGroupWizard';
import PaidGroupActivationModal from './PaidGroupActivationModal';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

/* ── helpers ────────────────────────────────────────────── */
const SUBJECT_COLORS = {
  mathematics:'#6366f1', // Sky Blue
  science:'#10B981',     // Emerald
  arabic:'#F59E0B',      // Amber
  english:'#2563EB',     // Royal Blue
  physics:'#6366F1',     // Indigo
  chemistry:'#EC4899',   // Pink
  biology:'#14B8A6',     // Teal
  history:'#D97706',     // Ochre
  geography:'#059669',   // Dark Green
  default:'#6366f1',
};
const getColor = s => SUBJECT_COLORS[s?.toLowerCase()] || SUBJECT_COLORS.default;

const INSTITUTION_ICONS = { school:'🏫', college:'🏛️', university:'🎓' };
const EMOJIS = ['📚','🧮','🔬','🌍','📖','✏️','🎨','💡','🏆','🌟'];
const COLORS  = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#8B5CF6','#F43F5E','#14B8A6'];

/* ── Card ────────────────────────────────────────────────── */
function GroupCard({ group, isTeacher, isOwner, onOpen, onDelete, onActivate }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const color = group.color || getColor(group.subject);
  const isPending = group.status === 'pending_payment';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !isPending && onOpen(group._id)}
      className="floating-card"
      style={{
        overflow: 'hidden', cursor: isPending ? 'default' : 'pointer',
        position: 'relative', padding: 0, height: '100%',
        opacity: isPending ? 0.85 : 1,
      }}
    >
      {/* Color stripe */}
      <div style={{ height: 5, background: isPending ? '#F59E0B' : color }} />

      {/* Pending badge */}
      {isPending && (
        <div style={{
          position: 'absolute', top: 14, insetInlineStart: 14,
          background: 'rgba(245,158,11,0.9)', color: '#fff',
          fontSize: 10, fontWeight: 800, padding: '3px 10px',
          borderRadius: 99, backdropFilter: 'blur(6px)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>⏳ {isAr ? 'في انتظار الدفع' : 'Pending Payment'}</div>
      )}

      <div style={{ padding: '20px 22px 22px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: isPending ? '#F59E0B' : color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: '#fff',
            boxShadow: `0 8px 16px -4px ${isPending ? '#F59E0B' : color}66`,
          }}>
            {group.emoji || '📚'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 2, letterSpacing: '-0.025em', lineHeight: 1.25 }}>
              {group.name}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {INSTITUTION_ICONS[group.institutionType] || '🏫'} {group.institutionType} · {group.subject}
            </div>
          </div>
          {isOwner && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(group._id, group.name); }}
              style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                color: '#F87171', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}
              title={isAr ? 'حذف المجموعة' : 'Delete group'}
            >✕</button>
          )}
        </div>

        {group.description && (
          <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {group.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>
            👥 {group.students?.length || 0}/{group.maxStudents}
          </span>

          {group.isPaid && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: 6 }}>
              💰 EGP {group.price}
            </span>
          )}

          {isOwner && !isPending && <CodeBadge code={group.code} />}

          {!isOwner && group.institution && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>🏛 {group.institution}</span>
          )}
        </div>

        {/* Activate button for pending groups */}
        {isOwner && isPending && (
          <button
            onClick={e => { e.stopPropagation(); onActivate(group); }}
            style={{
              marginTop: 14, width: '100%', padding: '10px', borderRadius: 10,
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
            }}
          >
            ⚡ {isAr ? 'ادفع رسوم النشر لتفعيل المجموعة' : 'Pay Listing Fee to Activate'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CodeBadge({ code }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [copied, setCopied] = useState(false);
  const copy = e => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      title={isAr ? "انقر لنسخ كود الدعوة" : "Click to copy invite code"}
      style={{
        padding: '4px 10px', borderRadius: 8,
        background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(124,58,237,0.1)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.25)'}`,
        color: copied ? '#34D399' : 'var(--primary-light)',
        fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
        cursor: 'pointer', fontFamily: 'var(--font-mono)',
        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      {copied ? (isAr ? '✓ تم النسخ' : '✓ Copied') : `# ${code}`}
    </button>
  );
}

/* ── Modal base ──────────────────────────────────────────── */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 520,
            background: 'var(--surface3)',
            border: '1px solid var(--border2)',
            borderRadius: 24, padding: '32px 32px 28px',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '-0.03em' }}>{title}</h2>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 14, display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Create Group Modal ──────────────────────────────────── */
function CreateGroupModal({ open, onClose, onCreated, isTeacher }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [form, setForm] = useState({ name:'', description:'', subject:'', institutionType:'school', institution:'', maxStudents:40, color: COLORS[0], emoji: EMOJIS[0] });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const subjects = isAr 
    ? ['الرياضيات','العلوم','اللغة العربية','اللغة الإنجليزية','الفيزياء','الكيمياء','الأحياء','التاريخ','الجغرافيا','علوم الحاسب','الفنون','التربية البدنية']
    : ['Mathematics','Science','Arabic','English','Physics','Chemistry','Biology','History','Geography','Computer Science','Art','Physical Education'];

  const submit = async e => {
    e.preventDefault();
    if (!form.name || !form.subject) { toast.error(isAr ? 'الاسم والمادة مطلوبان' : 'Name and subject required'); return; }
    setLoading(true);
    try {
      const { data } = await groupsAPI.create({ ...form, maxStudents: Number(form.maxStudents) });
      confetti({ 
        particleCount: 180, 
        spread: 90, 
        origin: { y: 0.6 }, 
        colors: [form.color, '#ffffff', 'var(--primary)'],
        scalar: 1.2,
        gravity: 0.8
      });
      toast.success(isAr ? `تم إنشاء المجموعة "${data.group.name}"! الكود: ${data.group.code}` : `Group "${data.group.name}" created! Code: ${data.group.code}`);
      onCreated(data.group);
      onClose();
      setForm({ name:'', description:'', subject:'', institutionType:'school', institution:'', maxStudents:40, color: COLORS[0], emoji: EMOJIS[0] });
    } catch { }
    finally { setLoading(false); }
  };

  const inp = (label, key, type='text', placeholder='') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display:'block', marginBottom: 6 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'10px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text)', outline:'none', fontSize:14, fontFamily:'inherit' }} />
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={isTeacher ? (isAr ? "✨ إنشاء فصل جديد" : "✨ Create New Class") : (isAr ? "✨ إنشاء مجموعة دراسية" : "✨ Create Study Group")}>
      <form onSubmit={submit}>
        {inp(isTeacher ? (isAr ? 'اسم الفصل *' : 'Class Name *') : (isAr ? 'اسم المجموعة *' : 'Group Name *'), 'name', 'text', isTeacher ? (isAr ? 'مثال: فصل الرياضيات - الصف الثاني' : 'e.g. Math Class — Year 2') : (isAr ? 'مثال: مجموعة التفاضل' : 'e.g. Calculus Study Group'))}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display:'block', marginBottom: 6 }}>{isAr ? 'المادة *' : 'Subject *'}</label>
          <select value={form.subject} onChange={e => set('subject', e.target.value)}
            style={{ width:'100%', padding:'10px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text)', outline:'none', fontSize:14, fontFamily:'inherit' }}>
            <option value="">{isAr ? 'اختر المادة...' : 'Select subject…'}</option>
            {subjects.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display:'block', marginBottom: 6 }}>{isAr ? 'نوع المؤسسة' : 'Institution Type'}</label>
            <select value={form.institutionType} onChange={e => set('institutionType', e.target.value)}
              style={{ width:'100%', padding:'10px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text)', outline:'none', fontSize:14, fontFamily:'inherit' }}>
              <option value="school">🏫 {isAr ? 'مدرسة' : 'School'}</option>
              <option value="college">🏛️ {isAr ? 'كلية' : 'College'}</option>
              <option value="university">🎓 {isAr ? 'جامعة' : 'University'}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display:'block', marginBottom: 6 }}>{isAr ? 'الحد الأقصى للطلاب' : 'Max Students'}</label>
            <input type="number" min={2} max={200} value={form.maxStudents} onChange={e => set('maxStudents',e.target.value)}
              style={{ width:'100%', padding:'10px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text)', outline:'none', fontSize:14, fontFamily:'inherit' }} />
          </div>
        </div>
        {inp(isAr ? 'اسم المؤسسة (اختياري)' : 'Institution Name (optional)', 'institution', 'text', isAr ? 'مثال: جامعة القاهرة، مدرسة الأورمان' : 'e.g. Cairo University, Al-Azhar School')}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display:'block', marginBottom: 8 }}>{isAr ? 'الوصف' : 'Description'}</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder={isAr ? "وصف مختصر لهذه المجموعة..." : "Brief description of this group…"}
            style={{ width:'100%', padding:'10px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text)', outline:'none', fontSize:14, fontFamily:'inherit', resize:'vertical' }} />
        </div>
        {/* Color & Emoji pickers */}
        <div style={{ display:'flex', gap:12, marginBottom:20 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display:'block', marginBottom: 8 }}>{isAr ? 'اللون' : 'Color'}</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color',c)} style={{ width:24, height:24, borderRadius:6, background:c, border: form.color===c ? '2px solid white' : '2px solid transparent', cursor:'pointer', outline:'none' }} />
              ))}
            </div>
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display:'block', marginBottom: 8 }}>{isAr ? 'الأيقونة' : 'Icon'}</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => set('emoji',e)} style={{ width:28, height:28, borderRadius:6, background: form.emoji===e ? 'var(--surface4)' : 'var(--surface2)', border: form.emoji===e ? '1px solid var(--border2)' : '1px solid transparent', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>{e}</button>
              ))}
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} style={{
          width:'100%', padding:'12px', borderRadius:12,
          background: 'linear-gradient(135deg, var(--primary), var(--brand-600))',
          color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer', border:'none',
          fontFamily:'inherit', opacity: loading ? 0.7 : 1,
          boxShadow:'0 4px 20px rgba(124,58,237,0.35)',
        }}>
          {loading ? (isAr ? 'جاري الإنشاء...' : 'Creating…') : (isTeacher ? (isAr ? '✨ إنشاء فصل' : '✨ Create Class') : (isAr ? '✨ إنشاء مجموعة دراسية' : '✨ Create Study Group'))}
        </button>
      </form>
    </Modal>
  );
}

/* ── Join Group Modal ────────────────────────────────────── */
function JoinGroupModal({ open, onClose, onJoined }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async e => {
    e.preventDefault();
    if (code.trim().length !== 6) { toast.error(isAr ? 'أدخل كود الدعوة المكون من 6 أحرف' : 'Enter the 6-character invite code'); return; }
    setLoading(true);
    try {
      const { data } = await groupsAPI.join(code.trim());
      confetti({ 
        particleCount: 250, 
        spread: 120, 
        origin: { y: 0.7 }, 
        colors: ['#3B82F6', '#10B981', '#ffffff'],
        scalar: 1.1,
        ticks: 200
      });
      toast.success(isAr ? `تم الانضمام إلى "${data.group.name}" بنجاح! 🎉` : `Joined "${data.group.name}" successfully! 🎉`);
      onJoined(data.group);
      onClose();
      setCode('');
    } catch (err) {
      if (err.response?.status === 402) {
        toast(err.response.data.error || (isAr ? 'الدفع مطلوب للانضمام إلى هذه المجموعة.' : 'Payment required to join this group.'), { icon: 'ℹ️' });
        onClose();
        navigate(`/payment?amount=${err.response.data.price}&groupId=${err.response.data.groupId}&type=group_join`);
      } else {
        toast.error(err.response?.data?.error || (isAr ? 'فشل الانضمام إلى المجموعة' : 'Failed to join group'));
      }
    }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isAr ? "🔑 الانضمام إلى مجموعة" : "🔑 Join a Group"}>
      <form onSubmit={submit}>
        <p style={{ fontSize: 13.5, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
          {isAr ? 'اطلب من معلمك كود الدعوة المكون من 6 أحرف وأدخله أدناه.' : 'Ask your teacher for the 6-character invite code and enter it below.'}
        </p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display:'block', marginBottom: 8 }}>{isAr ? 'كود الدعوة' : 'Invite Code'}</label>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
            style={{
              width:'100%', padding:'14px 18px',
              background:'var(--surface2)', border:'2px solid var(--border2)',
              borderRadius:12, color:'var(--text)', outline:'none',
              fontSize:22, fontFamily:'var(--font-mono)', fontWeight:800,
              letterSpacing:'0.25em', textAlign:'center', textTransform:'uppercase',
            }}
          />
        </div>
        <button type="submit" disabled={loading} style={{
          width:'100%', padding:'12px', borderRadius:12,
          background:'linear-gradient(135deg, #3B82F6, #1D4ED8)',
          color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer', border:'none',
          fontFamily:'inherit', opacity: loading ? 0.7 : 1,
          boxShadow:'0 4px 20px rgba(59,130,246,0.35)',
        }}>
          {loading ? (isAr ? 'جاري الانضمام...' : 'Joining…') : (isAr ? '🔑 انضمام للمجموعة' : '🔑 Join Group')}
        </button>
      </form>
    </Modal>
  );
}

/* ═════════════════════════════════════════════════════════
   Main GroupsPage
═════════════════════════════════════════════════════════ */
export default function GroupsPage() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { t, lang } = useTranslation();
  const isTeacher  = user?.role === 'teacher';

  const indicatorRef = usePullToRefresh(() => {
    qc.invalidateQueries({ queryKey: ['groups'] });
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);
  // Activation modal for pending groups
  const [activatingGroup, setActivatingGroup] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupsAPI.list(),
  });
  const groups = data?.data?.groups || [];

  const deleteGroup = async (id, name) => {
    if (!window.confirm(lang === 'ar' ? `هل أنت متأكد من حذف المجموعة "${name}"؟ لا يمكن التراجع عن هذا.` : `Delete group "${name}"? This cannot be undone.`)) return;
    try {
      await groupsAPI.remove(id);
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success(lang === 'ar' ? 'تم حذف المجموعة' : 'Group deleted');
    } catch { }
  };

  const handleCreated = () => qc.invalidateQueries({ queryKey: ['groups'] });
  const handleJoined  = () => qc.invalidateQueries({ queryKey: ['groups'] });

  return (
    <div style={{ direction: lang === 'ar' ? 'rtl' : 'ltr', position: 'relative' }}>
      <div ref={indicatorRef} style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%) rotate(0deg)', fontSize: 24, opacity: 0, transition: 'opacity 0.2s', zIndex: 999, pointerEvents: 'none' }}>🔄</div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text)', marginBottom:6 }}>
            {isTeacher ? `🏫 ${t('nav.myClasses')}` : `📚 ${t('groups.title')}`}
          </h1>
          <p style={{ fontSize:14, color:'var(--text3)' }}>
            {isTeacher
              ? `${groups.length} ${lang==='ar' ? 'فصل نشط · أنشئ وأدِر فصولك' : `active group${groups.length!==1?'s':''} · Create and manage your classes`}`
              : `${lang==='ar' ? `عضو في ${groups.length} مجموعة · انضم بكود الدعوة` : `Member of ${groups.length} group${groups.length!==1?'s':''} · Join with an invite code`}`}
          </p>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          {isTeacher ? (
            <button className="btn btn-primary btn-lg"
              onClick={() => setShowWizard(true)}
            >
              + {lang==='ar' ? 'فصل جديد' : 'New Class'}
            </button>
          ) : (
            <>
              <button className="btn btn-secondary"
                onClick={() => setShowJoin(true)}
              >🔑 {t('groups.join')}</button>
              <button className="btn btn-primary"
                onClick={() => setShowWizard(true)}
              >+ {t('groups.create')}</button>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display:'flex', justifyContent:'center', padding:60, color:'var(--text3)' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
            <div style={{ fontSize:14 }}>{lang === 'ar' ? 'جاري تحميل المجموعات...' : 'Loading groups…'}</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && groups.length === 0 && (
        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          style={{
            textAlign:'center', padding:'80px 40px',
            background:'var(--surface)', border:'1px dashed var(--border2)',
            borderRadius:24,
          }}
        >
          <div style={{ fontSize:64, marginBottom:20 }}>{isTeacher ? '🏫' : '🔑'}</div>
          <h3 style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-head)', marginBottom:10 }}>
            {isTeacher ? (lang === 'ar' ? 'أنشئ فصلك الأول' : 'Create your first class') : (lang === 'ar' ? 'لا توجد مجموعات بعد' : 'No groups yet')}
          </h3>
          <p style={{ fontSize:14, color:'var(--text3)', maxWidth:380, margin:'0 auto 28px', lineHeight:1.7 }}>
            {isTeacher
              ? (lang === 'ar' ? 'أنشئ مجموعة لطلابك، انشر الإعلانات، كلفهم بالواجبات وتتبع تقدمهم.' : 'Create a group for your students, post announcements, assign homework and track progress.')
              : (lang === 'ar' ? 'اطلب من معلمك كود الدعوة المكون من 6 أحرف للانضمام إلى مجموعة.' : 'Ask your teacher for a 6-character invite code to join a group.')}
          </p>
          {isTeacher ? (
            <button onClick={() => setShowWizard(true)} style={{ padding:'12px 28px', borderRadius:14, background:'linear-gradient(135deg,var(--primary),var(--brand-600))', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', border:'none', fontFamily:'inherit' }}>
              {lang === 'ar' ? '+ إنشاء أول فصل' : '+ Create First Class'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowJoin(true)} style={{ padding:'12px 28px', borderRadius:14, background:'linear-gradient(135deg,#3B82F6,#1D4ED8)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', border:'none', fontFamily:'inherit' }}>
                {lang === 'ar' ? '🔑 انضمام بالكود' : '🔑 Join with Code'}
              </button>
              <button onClick={() => setShowWizard(true)} style={{ padding:'12px 28px', borderRadius:14, background:'linear-gradient(135deg,var(--primary),var(--brand-600))', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', border:'none', fontFamily:'inherit' }}>
                {lang === 'ar' ? '+ إنشاء مجموعة دراسية' : '+ Create Study Group'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Groups grid */}
      {!isLoading && groups.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px, 100%),1fr))', gap:20 }}>
          {groups.map((g, i) => (
          <GroupCard
              key={g._id}
              group={g}
              isTeacher={isTeacher}
              isOwner={g.teacherId === (user?.id || user?.userId) || g.owner?.toString() === (user?.id || user?.userId)?.toString() || g.ownerId === (user?.id || user?.userId)}
              onOpen={id => navigate(`/groups/${id}`)}
              onDelete={deleteGroup}
              onActivate={grp => setActivatingGroup(grp)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} isTeacher={isTeacher} />
      <JoinGroupModal   open={showJoin}   onClose={() => setShowJoin(false)}   onJoined={handleJoined}  />

      {/* Activation modal for cards clicked "Activate" */}
      {activatingGroup && (
        <PaidGroupActivationModal
          group={activatingGroup}
          listingFee={Math.max(10, Math.round(activatingGroup.price * 0.05))}
          platformFeePercent={activatingGroup.platformFeePercent || 5}
          onActivated={() => { setActivatingGroup(null); qc.invalidateQueries({ queryKey: ['groups'] }); }}
          onClose={() => setActivatingGroup(null)}
        />
      )}

      {/* New wizard */}
      <AnimatePresence>
        {showWizard && (
          <CreateGroupWizard
            onClose={() => setShowWizard(false)}
            onCreated={() => { qc.invalidateQueries({ queryKey: ['groups'] }); setShowWizard(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
