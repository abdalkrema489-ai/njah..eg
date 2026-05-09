// src/components/groups/GroupDetailPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { groupsAPI } from '../../api/index';
import { useAuthStore, useUIStore } from '../../context/store';
import BroadcastModal from './BroadcastModal';
import LeaderboardWidget from './LeaderboardWidget';

/* ── helpers ──────────────────────────────────────────────── */
const getTabs = (isAr) => [
  { key:'feed',        label: isAr ? '📢 الأخبار' : '📢 Feed' },
  { key:'assignments', label: isAr ? '📝 التكاليف' : '📝 Assignments' },
  { key:'progress',    label: isAr ? '📈 التقدم الأكاديمي' : '📈 Academic Progress' },
  { key:'members',     label: isAr ? '👥 الأعضاء' : '👥 Members' },
  { key:'insights',    label: isAr ? '📊 الرؤى' : '📊 Insights',  ownerOnly: true },
];

/* ── shared modal base ───────────────────────────────────── */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
        backdropFilter:'blur(8px)', zIndex:400,
        display:'flex', alignItems:'center', justifyContent:'center', padding:20,
      }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.93, y:18 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.93, y:10 }}
        transition={{ type:'spring', stiffness:380, damping:28 }}
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:520,
          background:'var(--surface3)', border:'1px solid var(--border2)',
          borderRadius:24, padding:'32px 32px 28px',
          boxShadow:'var(--shadow-xl)',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <h2 style={{ fontSize:17, fontWeight:800, fontFamily:'var(--font-head)', letterSpacing:'-0.02em' }}>{title}</h2>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)', cursor:'pointer', fontSize:13 }}>✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

const inputStyle = { width:'100%', padding:'10px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text)', outline:'none', fontSize:14, fontFamily:'inherit', marginBottom:14 };
const labelStyle = { fontSize:12, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:6 };
const submitBtn  = (label, loading, color='var(--primary)', isAr) => (
  <button type="submit" disabled={loading} style={{ width:'100%', padding:'11px', borderRadius:11, background:`linear-gradient(135deg,${color},${color}cc)`, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', border:'none', fontFamily:'inherit', opacity: loading ? 0.7 : 1 }}>
    {loading ? (isAr ? 'جاري الحفظ...' : 'Saving…') : label}
  </button>
);

/* ── Announcement Card ───────────────────────────────────── */
function AnnouncementCard({ ann, isOwner, groupId, onPin, onDelete, isAr }) {
  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      style={{
        background:'var(--surface)', border:`1px solid ${ann.pinned ? 'rgba(245,158,11,0.35)' : 'var(--border)'}`,
        borderRadius:16, padding:'18px 20px',
        borderLeft: ann.pinned ? '4px solid #F59E0B' : '4px solid var(--primary)',
        position:'relative',
      }}
    >
      {ann.pinned && (
        <span style={{ position:'absolute', top:14, [isAr ? 'left' : 'right']:16, fontSize:11, fontWeight:700, color:'#FBBF24', background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', padding:'2px 8px', borderRadius:6 }}>{isAr ? '📌 مثبت' : '📌 Pinned'}</span>
      )}
      <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:6, letterSpacing:'-0.02em', paddingRight: !isAr && ann.pinned ? 80 : 0, paddingLeft: isAr && ann.pinned ? 80 : 0 }}>{ann.title}</div>
      <p style={{ fontSize:13.5, color:'var(--text2)', lineHeight:1.65, marginBottom:12 }}>{ann.body}</p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'var(--text3)' }}>
          {ann.teacherName} · {formatDistanceToNow(new Date(ann.createdAt), { addSuffix:true })}
        </span>
        {isOwner && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => onPin(ann._id)} style={{ fontSize:11, fontWeight:600, color:'#FBBF24', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:7, padding:'3px 9px', cursor:'pointer' }}>
              {ann.pinned ? (isAr ? 'إلغاء التثبيت' : 'Unpin') : (isAr ? '📌 تثبيت' : '📌 Pin')}
            </button>
            <button onClick={() => onDelete(ann._id)} style={{ fontSize:11, fontWeight:600, color:'#F87171', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:7, padding:'3px 9px', cursor:'pointer' }}>
              {isAr ? 'حذف' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Assignment Card ─────────────────────────────────────── */
function AssignmentCard({ assignment, isOwner, userId, groupId, onGrade, onSubmit, onTrack, isAr }) {
  const mySubmission  = assignment.submissions?.find(s => s.studentId === userId);
  const isOverdue     = assignment.dueDate && isPast(new Date(assignment.dueDate)) && !mySubmission;
  const totalSubs     = assignment.submissions?.length || 0;

  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:16, padding:'18px 20px',
        borderLeft: isOverdue ? '4px solid #EF4444' : mySubmission?.status === 'graded' ? '4px solid #10B981' : '4px solid #3B82F6',
      }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', letterSpacing:'-0.02em', flex:1 }}>{assignment.title}</div>
        <span style={{
          fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:7, flexShrink:0, [isAr ? 'marginRight' : 'marginLeft']:10,
          background: mySubmission?.status === 'graded'
            ? 'rgba(16,185,129,0.12)' : mySubmission
            ? 'rgba(59,130,246,0.12)' : isOverdue
            ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
          color: mySubmission?.status === 'graded'
            ? '#34D399' : mySubmission
            ? '#60A5FA' : isOverdue
            ? '#F87171' : '#FBBF24',
          border: '1px solid currentColor',
        }}>
          {mySubmission?.status === 'graded' ? (isAr ? `✓ تم التقييم ${mySubmission.score}/${assignment.maxScore}` : `✓ Graded ${mySubmission.score}/${assignment.maxScore}`) : mySubmission ? (isAr ? '📤 تم التسليم' : '📤 Submitted') : isOverdue ? (isAr ? '⚠ متأخر' : '⚠ Overdue') : (isAr ? '📋 قيد الانتظار' : '📋 Pending')}
        </span>
      </div>
      {assignment.description && (
        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:10 }}>{assignment.description}</p>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text3)' }}>
          {assignment.dueDate && (
            <span>{isAr ? '📅 التسليم:' : '📅 Due:'} {format(new Date(assignment.dueDate), 'EEE, MMM d, HH:mm')}</span>
          )}
          <span>{isAr ? '⭐ أقصى:' : '⭐ Max:'} {assignment.maxScore} {isAr ? 'نقاط' : 'pts'}</span>
          {isOwner && <span>📤 {totalSubs} {isAr ? 'تسليمات' : 'submissions'}</span>}
        </div>
        {!isOwner && !mySubmission && (
          <button onClick={() => onSubmit(assignment)} style={{ padding:'6px 14px', borderRadius:9, background:'linear-gradient(135deg,#3B82F6,#1D4ED8)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', border:'none', fontFamily:'inherit' }}>
            {isAr ? 'تسليم ←' : 'Submit →'}
          </button>
        )}
        {isOwner && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => onTrack(assignment)} style={{ padding:'6px 14px', borderRadius:9, background:'rgba(99,102,241,0.12)', color:'#818CF8', border:'1px solid rgba(99,102,241,0.25)', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              {isAr ? `👁 متابعة (${totalSubs}/${assignment.groupStudentCount||'?'})` : `👁 Track (${totalSubs})`}
            </button>
            {totalSubs > 0 && (
              <button onClick={() => onGrade(assignment)} style={{ padding:'6px 14px', borderRadius:9, background:'rgba(16,185,129,0.12)', color:'#34D399', border:'1px solid rgba(16,185,129,0.25)', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                {isAr ? `📋 تقييم (${totalSubs})` : `📋 Grade (${totalSubs})`}
              </button>
            )}
          </div>
        )}
        {mySubmission?.feedback && (
          <div style={{ width:'100%', marginTop:8, padding:'8px 12px', borderRadius:9, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', fontSize:12, color:'var(--text2)' }}>
            {isAr ? '💬 تعليق:' : '💬 Feedback:'} {mySubmission.feedback}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════════════
   GroupDetailPage
═════════════════════════════════════════════════════════ */
export default function GroupDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { language: lang } = useUIStore();
  const qc        = useQueryClient();
  const isTeacher = user?.role === 'teacher';
  const userId    = user?.id;

  const [tab,           setTab]           = useState('feed');
  const [broadcastModal,setBroadcastModal]= useState(false);
  const [annModal,      setAnnModal]      = useState(false);
  const [assignModal,   setAssignModal]   = useState(false);
  const [submitModal,   setSubmitModal]   = useState(null); // assignment obj
  const [gradeModal,    setGradeModal]    = useState(null); // assignment obj
  const [gradeTarget,   setGradeTarget]   = useState(null); // submission obj
  const [trackModal,    setTrackModal]    = useState(null); // assignment obj for submission tracking
  const [trackData,     setTrackData]     = useState(null); // { submitted, notSubmitted }
  const [trackLoading,  setTrackLoading]  = useState(false);
  const [annForm,       setAnnForm]       = useState({ title:'', body:'', pinned:false });
  const [assignForm,    setAssignForm]    = useState({ title:'', description:'', dueDate:'', maxScore:100 });
  const [submitContent, setSubmitContent] = useState('');
  const [submitFile,    setSubmitFile]    = useState(null);
  const [gradeForm,     setGradeForm]     = useState({ score:'', feedback:'' });
  const [saving,        setSaving]        = useState(false);

  // ── Queries ──
  const { data: gData } = useQuery({ 
    queryKey:['group',id], 
    queryFn:() => groupsAPI.get(id),
    enabled: !!id && id !== 'undefined'
  });
  const { data: aData, refetch:refetchAnns } = useQuery({ 
    queryKey:['group-anns',id], 
    queryFn:() => groupsAPI.getAnnouncements(id),
    enabled: !!id && id !== 'undefined'
  });
  const { data: asData, refetch:refetchAsgn } = useQuery({ 
    queryKey:['group-asgn',id], 
    queryFn:() => groupsAPI.getAssignments(id),
    enabled: !!id && id !== 'undefined'
  });
  const group       = gData?.data?.group;
  const isOwner     = group ? String(group.teacherId) === String(userId) : false;

  // Use isOwner in queries that restrict to teacher
  const { data: insData } = useQuery({ queryKey:['group-insights',id], queryFn:() => groupsAPI.getInsights(id), enabled: isOwner && tab==='insights' });

  const anns        = aData?.data?.announcements || [];
  const assignments = asData?.data?.assignments  || [];
  const insights    = insData?.data?.insights    || null;
  const isAr        = lang === 'ar';

  if (!group) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60, color:'var(--text3)' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:40, marginBottom:10 }}>⏳</div>{isAr ? 'جاري التحميل...' : 'Loading…'}</div>
    </div>
  );

  // ── Announcement actions ──
  const postAnn = async e => {
    e.preventDefault();
    if (!annForm.title || !annForm.body) { toast.error(isAr ? 'املأ العنوان والرسالة' : 'Fill in title and body'); return; }
    setSaving(true);
    try {
      await groupsAPI.createAnnouncement(id, annForm);
      toast.success(isAr ? 'تم نشر الإعلان!' : 'Announcement posted!');
      setAnnModal(false);
      setAnnForm({ title:'', body:'', pinned:false });
      refetchAnns();
    } catch { }
    finally { setSaving(false); }
  };
  const pinAnn    = async annId => { await groupsAPI.pinAnnouncement(id, annId); refetchAnns(); };
  const deleteAnn = async annId => { if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا الإعلان؟' : 'Delete this announcement?')) return; await groupsAPI.deleteAnnouncement(id, annId); refetchAnns(); };

  // ── Assignment actions ──
  const createAssign = async e => {
    e.preventDefault();
    if (!assignForm.title) { toast.error(isAr ? 'العنوان مطلوب' : 'Title required'); return; }
    setSaving(true);
    try {
      await groupsAPI.createAssignment(id, assignForm);
      toast.success(isAr ? 'تم إنشاء التكليف!' : 'Assignment created!');
      setAssignModal(false);
      setAssignForm({ title:'', description:'', dueDate:'', maxScore:100 });
      refetchAsgn();
    } catch { }
    finally { setSaving(false); }
  };

  const submitAssign = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { content: submitContent };
      if (submitFile) {
        const reader = new FileReader();
        reader.readAsDataURL(submitFile);
        await new Promise(r => reader.onload = r);
        payload.attachmentData = reader.result;
        payload.attachmentType = submitFile.type;
      }
      await groupsAPI.submitAssignment(id, submitModal._id, payload);
      toast.success(isAr ? 'تم التسليم بنجاح! ✅' : 'Submitted successfully! ✅');
      setSubmitModal(null);
      setSubmitContent('');
      setSubmitFile(null);
      refetchAsgn();
    } catch (err) { 
      toast.error(err.response?.data?.error || (isAr ? 'حدث خطأ' : 'Error submitting')); 
    }
    finally { setSaving(false); }
  };

  const gradeSub = async e => {
    e.preventDefault();
    if (gradeForm.score === '') { toast.error(isAr ? 'أدخل درجة' : 'Enter a score'); return; }
    setSaving(true);
    try {
      await groupsAPI.gradeSubmission(id, gradeModal._id, gradeTarget._id, gradeForm);
      toast.success(isAr ? 'تم التقييم!' : 'Graded!');
      setGradeModal(null);
      setGradeTarget(null);
      setGradeForm({ score:'', feedback:'' });
      refetchAsgn();
    } catch { }
    finally { setSaving(false); }
  };

  const removeMember = async uid => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من إزالة هذا الطالب من المجموعة؟' : 'Remove this student from the group?')) return;
    try {
      await groupsAPI.removeMember(id, uid);
      qc.invalidateQueries({ queryKey:['group',id] });
      toast.success(isAr ? 'تمت إزالة الطالب' : 'Student removed');
    } catch { }
  };

  const openTrack = async (assignment) => {
    setTrackModal(assignment);
    setTrackData(null);
    setTrackLoading(true);
    try {
      const { data } = await groupsAPI.getSubmissionStatus(id, assignment._id);
      setTrackData(data);
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء تحميل البيانات' : 'Error loading submission data');
    } finally {
      setTrackLoading(false);
    }
  };

  const visibleTabs = getTabs(isAr).filter(t => !t.ownerOnly || isOwner);

  const color = group.coverGrad || (group.subject.toLowerCase() === 'mathematics' ? '#6366f1' : '#10B981');

  return (
    <div className="animate-fade-up" style={{ minHeight: '100%', display:'flex', flexDirection:'column', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* ── Group Header (Premium View) ── */}
      <div style={{
        background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)',
        overflow: 'hidden', marginBottom: 20
      }}>
        {/* Banner with Vibrant Gradient */}
        <div style={{ height: 140, background: color, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.3))' }} />
          <button 
            onClick={() => navigate('/groups')}
            style={{ position: 'absolute', top: 16, [isAr ? 'right' : 'left']: 16, padding: '8px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {lang === 'ar' ? 'العودة →' : '← Back'}
          </button>
        </div>

        <div style={{ padding: '0 32px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginTop: -50 }}>
            <div style={{ 
              width: 100, height: 100, borderRadius: 24, background: 'var(--surface2)', 
              border: '5px solid var(--surface)', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', fontSize: 44, boxShadow: 'var(--shadow-md)', flexShrink: 0
            }}>
              {group.emoji || '📚'}
            </div>
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.03em' }}>{group.name}</h1>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>
                <span>🎓 {group.subject}</span>
                <span>🏫 {group.grade}</span>
                <span>👤 {group.teacherName || (isAr ? 'المدرب' : 'Instructor')}</span>
                <span>👥 {group.students?.length || 0} {isAr ? 'أعضاء' : 'Members'}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
              {isOwner && (
                <>
                  <div style={{ padding:'8px 16px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontWeight:800, fontSize:16, color:'var(--primary)', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'var(--text3)', fontFamily:'var(--font-body)', letterSpacing:0 }}>{isAr ? 'كود' : 'CODE'}</span>
                    {group.code}
                  </div>
                  <button 
                    onClick={() => setBroadcastModal(true)}
                    style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', fontWeight: 800, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    📢 {isAr ? 'رسالة للكل' : 'Broadcast'}
                  </button>
                </>
              )}
              <button 
                onClick={() => navigate('/chat')}
                style={{ padding: '10px 24px', borderRadius: 12, background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                💬 {isAr ? 'الدردشة' : 'Chat'}
              </button>
            </div>
          </div>
        </div>

        {/* Unified Tab Bar */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', padding: '0 20px' }}>
          {visibleTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '16px 24px', fontSize: 13.5, fontWeight: 800,
                color: tab === t.key ? 'var(--primary)' : 'var(--text3)',
                borderTop: 0, borderLeft: 0, borderRight: 0,
                borderBottom: `3px solid ${tab === t.key ? 'var(--primary)' : 'transparent'}`,
                background: 'transparent', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {tab === 'feed' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
            {/* Main Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
                 <h2 style={{ fontSize:15, fontWeight:800, color: 'var(--text)' }}>{isAr ? 'الإعلانات' : 'Announcements'}</h2>
                 {isOwner && <button onClick={() => setAnnModal(true)} style={{ padding:'8px 16px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ {isAr ? 'جديد' : 'New'}</button>}
              </div>
            {anns.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📢</div>
                <div style={{ fontSize:15, fontWeight:600 }}>{isAr ? 'لا توجد إعلانات بعد' : 'No announcements yet'}</div>
              </div>
            ) : anns.map(a => (
              <AnnouncementCard key={a._id} ann={a} isOwner={isOwner} groupId={id} onPin={pinAnn} onDelete={deleteAnn} isAr={isAr} />
            ))}
            </div>
            
            {/* Sidebar Leaderboard */}
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px' }}>
              <LeaderboardWidget groupId={id} currentUserId={userId} isAr={isAr} />
            </div>
          </div>
        )}

        {tab === 'assignments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
               <h2 style={{ fontSize:15, fontWeight:800, color: 'var(--text)' }}>{isAr ? 'التكاليف' : 'Assignments'}</h2>
               {isOwner && <button onClick={() => setAssignModal(true)} style={{ padding:'8px 16px', borderRadius:10, background:'var(--primary)', color: '#fff', fontSize:12, fontWeight:700, cursor:'pointer', border: 'none' }}>+ {isAr ? 'إنشاء' : 'Create'}</button>}
            </div>
            {assignments.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📝</div>
                <div style={{ fontSize:15, fontWeight:600 }}>{isAr ? 'لا توجد تكاليف بعد' : 'No assignments yet'}</div>
              </div>
            ) : assignments.map(a => (
              <AssignmentCard
                key={a._id}
                assignment={{ ...a, groupStudentCount: group.students?.length || 0 }}
                isOwner={isOwner} userId={userId} groupId={id}
                onSubmit={a => setSubmitModal(a)}
                onGrade={a => setGradeModal(a)}
                onTrack={openTrack}
                isAr={isAr}
              />
            ))}
          </div>
        )}

        {tab === 'progress' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
               <h2 style={{ fontSize:15, fontWeight:800, color: 'var(--text)' }}>{isAr ? 'التقدم الأكاديمي' : 'Academic Progress'}</h2>
            </div>
            {group.curriculumLinked ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'24px', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom:16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background:'rgba(16,185,129,0.15)', color:'#10B981', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📈</div>
                  <div>
                    <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{group.curriculumLinked}</h3>
                    <p style={{ fontSize:13, color:'var(--text3)' }}>{isAr ? 'وحدة المنهج المتتبعة' : 'Curriculum Unit Tracked'}</p>
                  </div>
                </div>
                <p style={{ fontSize:14, color:'var(--text2)', marginBottom:20, lineHeight: 1.6 }}>
                  {isAr ? 'تقدمك مرتبط بشكل وثيق بوحدة المنهج هذه. سيؤدي إكمال التكاليف وحضور المحاضرات وإجراء اختبارات الذكاء الاصطناعي في هذه المجموعة إلى تحديث إتقانك العام تلقائيًا.' : 'Your progress is strictly linked to this curriculum unit. Completing assignments, attending lectures, and taking AI quizzes in this group will automatically update your overall mastery.'}
                </p>
                <div style={{ display:'flex', gap:20, alignItems:'center', padding: '16px', background: 'var(--surface2)', borderRadius: 12 }}>
                  <div style={{ flex:1, height:12, background:'var(--surface3)', borderRadius:6, overflow:'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                    <motion.div initial={{ width:0 }} animate={{ width:'45%' }} transition={{ duration: 1.2, ease: 'easeOut' }}
                      style={{ height:'100%', background:'linear-gradient(90deg, #10B981, #34D399)', borderRadius:6 }} />
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>45% {isAr ? 'إتقان' : 'Mastery'}</div>
                </div>
              </motion.div>
            ) : (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🔗</div>
                <div style={{ fontSize:15, fontWeight:600 }}>{isAr ? 'لا توجد وحدة منهج محددة مرتبطة بهذه المجموعة.' : 'No specific curriculum unit linked to this group.'}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
               <h2 style={{ fontSize:15, fontWeight:800, color: 'var(--text)' }}>{isAr ? 'الأعضاء' : 'Members'}</h2>
            </div>
            {/* Instructor */}
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>👨‍🏫</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{group.teacherName || (isAr ? 'المعلم' : 'Teacher')}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{isAr ? 'مالك المجموعة' : 'Group Owner'}</div>
              </div>
            </div>
            {group.students?.map(s => (
              <motion.div key={s.userId} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16 }}>
                <div style={{ width:38, height:38, borderRadius:11, background: 'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>🎓</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{s.name || (isAr ? 'طالب' : 'Student')}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{isAr ? 'طالب' : 'Student'}</div>
                </div>
                {isOwner && (
                  <button onClick={() => removeMember(s.userId)} style={{ padding:'4px 10px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)', color:'#F87171', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    {isAr ? 'إزالة' : 'Remove'}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'insights' && isOwner && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
            {[
              { label: isAr ? 'إجمالي الطلاب' : 'Total Students',   value: insights?.totalStudents || 0,    icon:'👥', color:'#6366f1' },
              { label: isAr ? 'التكاليف' : 'Assignments',       value: insights?.totalAssignments || 0, icon:'📝', color:'#6366f1' },
              { label: isAr ? 'معدل التسليم' : 'Submission Rate',   value: `${insights?.submissionRate || 0}%`, icon:'📤', color:'#10B981' },
              { label: isAr ? 'متوسط الدرجات' : 'Avg Score',         value: insights?.avgScore != null ? `${insights.avgScore}%` : '—', icon:'⭐', color:'#F59E0B' },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:'24px 20px', textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:28, fontWeight:900, color:s.color, letterSpacing:'-0.04em', marginBottom:4 }}>{s.value}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals remain same as defined above */}
      <AnimatePresence>
        {annModal && (
          <Modal open={annModal} onClose={() => setAnnModal(false)} title={isAr ? "📢 نشر إعلان" : "📢 Post Announcement"}>
            <form onSubmit={postAnn}>
              <label style={labelStyle}>{isAr ? 'العنوان' : 'Title'}</label>
              <input style={inputStyle} value={annForm.title} onChange={e => setAnnForm(f=>({...f,title:e.target.value}))} placeholder={isAr ? "عنوان الإعلان..." : "Announcement title…"} />
              <label style={labelStyle}>{isAr ? 'الرسالة' : 'Message'}</label>
              <textarea rows={5} style={{...inputStyle, resize:'vertical', marginBottom:14}} value={annForm.body} onChange={e => setAnnForm(f=>({...f,body:e.target.value}))} placeholder={isAr ? "اكتب إعلانك هنا..." : "Write your announcement here…"} />
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text2)', marginBottom:18, cursor:'pointer' }}>
                <input type="checkbox" checked={annForm.pinned} onChange={e => setAnnForm(f=>({...f,pinned:e.target.checked}))} /> {isAr ? 'تثبيت هذا الإعلان' : 'Pin this announcement'}
              </label>
              {submitBtn(isAr ? '📢 نشر إعلان' : '📢 Post Announcement', saving, '#F59E0B', isAr)}
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assignModal && (
          <Modal open={assignModal} onClose={() => setAssignModal(false)} title={isAr ? "📝 إنشاء تكليف" : "📝 Create Assignment"}>
            <form onSubmit={createAssign}>
              <label style={labelStyle}>{isAr ? 'العنوان *' : 'Title *'}</label>
              <input style={inputStyle} value={assignForm.title} onChange={e => setAssignForm(f=>({...f,title:e.target.value}))} placeholder={isAr ? "عنوان التكليف..." : "Assignment title…"} />
              <label style={labelStyle}>{isAr ? 'الوصف' : 'Description'}</label>
              <textarea rows={3} style={{...inputStyle, resize:'vertical', marginBottom:14}} value={assignForm.description} onChange={e => setAssignForm(f=>({...f,description:e.target.value}))} placeholder={isAr ? "تعليمات التكليف..." : "Assignment instructions…"} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:4 }}>
                <div>
                  <label style={labelStyle}>{isAr ? 'تاريخ التسليم' : 'Due Date'}</label>
                  <input type="datetime-local" style={inputStyle} value={assignForm.dueDate} onChange={e => setAssignForm(f=>({...f,dueDate:e.target.value}))} />
                </div>
                <div>
                  <label style={labelStyle}>{isAr ? 'الدرجة القصوى' : 'Max Score'}</label>
                  <input type="number" style={inputStyle} min={1} max={1000} value={assignForm.maxScore} onChange={e => setAssignForm(f=>({...f,maxScore:Number(e.target.value)}))} />
                </div>
              </div>
              {submitBtn(isAr ? '+ إنشاء تكليف' : '+ Create Assignment', saving, 'var(--primary)', isAr)}
            </form>
          </Modal>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {submitModal && (
          <Modal open={!!submitModal} onClose={() => { setSubmitModal(null); setSubmitContent(''); setSubmitFile(null); }} title={isAr ? `تسليم: ${submitModal.title}` : `Submit: ${submitModal.title}`}>
            <form onSubmit={submitAssign}>
              <label style={labelStyle}>{isAr ? 'إجابتك / المحتوى' : 'Your Answer / Content'}</label>
              <textarea rows={5} style={{...inputStyle, resize:'vertical', marginBottom:14}} value={submitContent} onChange={e => setSubmitContent(e.target.value)} placeholder={isAr ? "اكتب إجابتك هنا..." : "Type your answer here…"} />
              <label style={labelStyle}>{isAr ? 'إرفاق ملف (صورة/PDF)' : 'Attach File (Image/PDF)'}</label>
              <input type="file" accept="image/*,.pdf" onChange={e => setSubmitFile(e.target.files[0])} style={{ marginBottom: 18 }} />
              {submitBtn(isAr ? '📤 تأكيد التسليم' : '📤 Submit Assignment', saving, '#3B82F6', isAr)}
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gradeModal && !gradeTarget && (
          <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title={isAr ? `تقييم: ${gradeModal.title}` : `Grade: ${gradeModal.title}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {gradeModal.submissions?.map(s => (
                <div key={s._id} style={{ padding: 14, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ fontSize: 14 }}>{s.studentName}</strong>
                    <span style={{ fontSize: 12, color: s.status === 'graded' ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                      {s.status === 'graded' ? (isAr ? `✓ مقيّم (${s.score})` : `✓ Graded (${s.score})`) : (isAr ? '⏳ بانتظار التقييم' : '⏳ Pending')}
                    </span>
                  </div>
                  {s.content && <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{s.content}</p>}
                  {s.attachmentData && (
                    <div style={{ marginBottom: 8 }}>
                      {s.attachmentType?.startsWith('image/') ? (
                        <img src={s.attachmentData} alt="attachment" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'contain' }} />
                      ) : s.attachmentType === 'application/pdf' ? (
                        <a href={s.attachmentData} download={`submission-${s.studentName}.pdf`} style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>{isAr ? '📥 تحميل PDF' : '📥 Download PDF'}</a>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{isAr ? 'ملف مرفق' : 'Attached File'}</span>
                      )}
                    </div>
                  )}
                  <button onClick={() => { setGradeTarget(s); setGradeForm({ score: s.score || '', feedback: s.feedback || '' }); }} style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {isAr ? 'التقييم' : 'Grade'}
                  </button>
                </div>
              ))}
              {(!gradeModal.submissions || gradeModal.submissions.length === 0) && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>{isAr ? 'لا توجد تسليمات بعد' : 'No submissions yet'}</div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gradeTarget && (
          <Modal open={!!gradeTarget} onClose={() => { setGradeTarget(null); setGradeForm({ score:'', feedback:'' }); }} title={isAr ? `تقييم ${gradeTarget.studentName}` : `Grading ${gradeTarget.studentName}`}>
            <form onSubmit={gradeSub}>
              <label style={labelStyle}>{isAr ? `الدرجة (من ${gradeModal.maxScore}) *` : `Score (out of ${gradeModal.maxScore}) *`}</label>
              <input type="number" min={0} max={gradeModal.maxScore} required style={inputStyle} value={gradeForm.score} onChange={e => setGradeForm(f=>({...f,score:e.target.value}))} />
              
              <label style={labelStyle}>{isAr ? 'ملاحظات (اختياري)' : 'Feedback (Optional)'}</label>
              <textarea rows={3} style={{...inputStyle, resize:'vertical'}} value={gradeForm.feedback} onChange={e => setGradeForm(f=>({...f,feedback:e.target.value}))} />
              
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setGradeTarget(null); setGradeForm({ score:'', feedback:'' }); }} style={{ flex: 1, padding: '11px', borderRadius: 11, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700 }}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                {submitBtn(isAr ? 'حفظ التقييم' : 'Save Grade', saving, '#10B981', isAr)}
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Submission Tracker Modal ── */}
      <AnimatePresence>
        {trackModal && (
          <Modal open={!!trackModal} onClose={() => { setTrackModal(null); setTrackData(null); }} title={isAr ? `👁 متابعة التسليم: ${trackModal.title}` : `👁 Submission Tracker: ${trackModal.title}`}>
            {trackLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>⏳ {isAr ? 'جاري التحميل...' : 'Loading...'}</div>
            ) : trackData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Summary Bar */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                  <div style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981' }}>{trackData.submitted.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{isAr ? 'سلّموا ✅' : 'Submitted ✅'}</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#EF4444' }}>{trackData.notSubmitted.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{isAr ? 'لم يسلّموا ❌' : 'Not Submitted ❌'}</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)' }}>{trackData.totalStudents}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{isAr ? 'إجمالي' : 'Total'}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--surface3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${trackData.totalStudents > 0 ? Math.round((trackData.submitted.length / trackData.totalStudents) * 100) : 0}%`, background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textAlign: 'right' }}>
                    {trackData.totalStudents > 0 ? Math.round((trackData.submitted.length / trackData.totalStudents) * 100) : 0}% {isAr ? 'معدل التسليم' : 'submission rate'}
                  </div>
                </div>

                {/* Submitted List */}
                {trackData.submitted.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isAr ? '✅ سلّموا' : '✅ Submitted'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {trackData.submitted.map(s => (
                        <div key={s.studentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>🎓</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{s.studentName}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {s.hasAttachment && <span style={{ fontSize: 10, color: '#60A5FA', fontWeight: 700, background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: 4 }}>📎 {isAr ? 'مرفق' : 'File'}</span>}
                            <span style={{ fontSize: 10, fontWeight: 800, color: s.status === 'graded' ? '#10B981' : s.status === 'late' ? '#F59E0B' : '#818CF8', background: s.status === 'graded' ? 'rgba(16,185,129,0.1)' : s.status === 'late' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                              {s.status === 'graded' ? (isAr ? `تم التقييم ${s.score}` : `Graded ${s.score}`) : s.status === 'late' ? (isAr ? 'متأخر' : 'Late') : (isAr ? 'قيد الانتظار' : 'Pending')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Not Submitted List */}
                {trackData.notSubmitted.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#EF4444', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isAr ? '❌ لم يسلّموا بعد' : '❌ Not Submitted Yet'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {trackData.notSubmitted.map(s => (
                        <div key={s.studentId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.05)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
                          <span style={{ fontSize: 16 }}>😶</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{s.studentName || (isAr ? 'طالب' : 'Student')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {trackData.submitted.length === 0 && trackData.notSubmitted.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 13 }}>{isAr ? 'لا يوجد طلاب في المجموعة بعد' : 'No students in the group yet'}</div>
                )}
              </div>
            ) : null}
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {broadcastModal && (
          <BroadcastModal 
            groupId={id} 
            studentsCount={group.students?.length || 0} 
            isAr={isAr} 
            onClose={() => setBroadcastModal(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
