// src/components/teacher/TeacherDashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../../context/store';
import { groupsAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';

/* ── stagger ──────────────────────────────────────────────── */
const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } },
  item:      { hidden: { opacity:0, y:18 }, visible: { opacity:1, y:0, transition:{ duration:0.4, ease:[0.16,1,0.3,1] } } },
};

/* ── Stat Card ───────────────────────────────────────────── */
function TeacherStatCard({ icon, value, label, sub, color }) {
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:18, padding:'22px 20px',
      display:'flex', alignItems:'center', gap:16,
    }}>
      <div style={{
        width:52, height:52, borderRadius:14, flexShrink:0,
        background:`${color}18`, border:`1px solid ${color}30`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize:28, fontWeight:900, fontFamily:'var(--font-head)', color, lineHeight:1, letterSpacing:'-0.04em', marginBottom:3 }}>{value}</div>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)' }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Group Mini Card ─────────────────────────────────────── */
function MiniGroupCard({ group, navigate }) {
  const color = group.color || '#7C3AED';
  return (
    <motion.div
      whileHover={{ y:-3 }}
      onClick={() => navigate(`/groups/${group._id}`)}
      style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:16, padding:'16px 18px', cursor:'pointer',
        borderLeft:`4px solid ${color}`,
        transition:'box-shadow 0.2s var(--ease)',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
        <span style={{ fontSize:22 }}>{group.emoji || '📚'}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'-0.02em' }}>{group.name}</div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>{group.subject}</div>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', flexShrink:0 }}>
          👥 {group.students?.length || 0}
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color, background:`${color}12`, border:`1px solid ${color}25`, padding:'2px 9px', borderRadius:7, letterSpacing:'0.08em' }}>
          #{group.code}
        </span>
        <span style={{ fontSize:11, color:'var(--text3)' }}>
          {group.institutionType === 'university' ? '🎓' : group.institutionType === 'college' ? '🏛️' : '🏫'} {group.institutionType}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Quick Action ────────────────────────────────────────── */
function QuickAction({ icon, label, sub, grad, onClick }) {
  return (
    <motion.button
      whileHover={{ y:-3, boxShadow:'0 12px 28px rgba(0,0,0,0.35)' }}
      whileTap={{ scale:0.96 }}
      onClick={onClick}
      style={{
        display:'flex', flexDirection:'column', alignItems:'flex-start',
        padding:'18px 16px',
        background:'var(--surface2)', border:'1px solid var(--border)',
        borderRadius:16, cursor:'pointer', gap:6,
        position:'relative', overflow:'hidden',
        transition:'all 0.22s var(--ease)',
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:grad, borderRadius:'16px 16px 0 0' }} />
      <span style={{ fontSize:26 }}>{icon}</span>
      <div style={{ fontSize:13, fontWeight:800, color:'var(--text)', lineHeight:1.2 }}>{label}</div>
      <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500 }}>{sub}</div>
    </motion.button>
  );
}

/* ═════════════════════════════════════════════════════════
   TeacherDashboard
═════════════════════════════════════════════════════════ */
export default function TeacherDashboard() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const hr        = new Date().getHours();
  
  let greet = '';
  if (isAr) {
    greet = hr < 5 ? 'طابت ليلتك' : hr < 12 ? 'صباح الخير' : hr < 17 ? 'مساء الخير' : 'مساء الخير';
  } else {
    greet = hr < 5 ? 'Good Night' : hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
  }

  const firstName = user?.name?.split(' ')[0] || (isAr ? 'معلم' : 'Teacher');

  const { data: groupData } = useQuery({ queryKey:['groups'], queryFn:() => groupsAPI.list() });
  const groups = groupData?.data?.groups || [];

  // Aggregate simple stats from groups
  const totalStudents    = groups.reduce((acc, g) => acc + (g.students?.length || 0), 0);
  const activeGroups     = groups.length;

  const QUICK_ACTIONS = [
    { icon:'🏫', label: isAr ? 'مجموعة جديدة' : 'New Group',       sub: isAr ? 'إنشاء فصل' : 'Create a class',          grad:'linear-gradient(135deg,#7C3AED,#5B21B6)', path:'/groups' },
    { icon:'📝', label: isAr ? 'مخطط الدروس' : 'Lesson Planner',  sub: isAr ? 'توليد بالذكاء الاصطناعي' : 'AI Generation', grad:'linear-gradient(135deg,#7C3AED,#6366F1)', path:'/lesson-planner' },
    { icon:'🧪', label: isAr ? 'أسئلة امتحان' : 'Exam Builder',   sub: isAr ? 'أسئلة بنقرة واحدة' : '1-click questions',   grad:'linear-gradient(135deg,#6366F1,#4F46E5)', path:'/exam-builder' },
    { icon:'✍️', label: isAr ? 'مقيّم الإجابات' : 'Essay Grader',  sub: isAr ? 'تصحيح آلي' : 'Auto grading',            grad:'linear-gradient(135deg,#4F46E5,#4338CA)', path:'/essay-grader' },
    { icon:'📊', label: isAr ? 'التحليلات' : 'Analytics',       sub: isAr ? 'رؤى التعلم' : 'View learning insights',  grad:'linear-gradient(135deg,#10B981,#059669)', path:'/analytics' },
    { icon:'🚀', label: isAr ? 'التسويق' : 'Marketing',       sub: isAr ? 'نظام العمولات' : 'Affiliate system',      grad:'linear-gradient(135deg,#EC4899,#BE185D)', path:'/affiliates' },
    { icon:'📁', label: isAr ? 'المصادر' : 'Resources',       sub: isAr ? 'رفع مواد دراسية' : 'Upload study materials',  grad:'linear-gradient(135deg,#06B6D4,#0891B2)', path:'/files' },
  ];

  const TIPS = isAr ? [
    '💡 نصيحة: ثبّت الإعلانات الهامة ليراها الطلاب دائماً أولاً.',
    '📝 أنشئ واجبات بتواريخ استحقاق لإبقاء الطلاب على المسار الصحيح.',
    '📊 تحقق من رؤى المجموعات لتحديد الطلاب الذين يحتاجون لدعم إضافي.',
    '🔑 شارك كود دعوتك مباشرة مع الطلاب ليتمكنوا من الانضمام فوراً.',
    '⭐ قم بتقييم الإجابات بسرعة للحفاظ على تحفيز الطلاب.',
  ] : [
    '💡 Tip: Pin important announcements so students always see them first.',
    '📝 Create assignments with due dates to keep students on track.',
    '📊 Check group insights to identify students who need extra support.',
    '🔑 Share your group invite code directly with students to let them join instantly.',
    '⭐ Grade submissions quickly to keep students motivated.',
  ];
  const todayTip = TIPS[new Date().getDay() % TIPS.length];

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="visible">

      {/* ── Welcome Banner ── */}
      <motion.div variants={stagger.item} style={{
        marginBottom:28, borderRadius:24,
        background:'linear-gradient(135deg, rgba(99,102,241,0.16) 0%, rgba(124,58,237,0.08) 60%, rgba(99,102,241,0.04) 100%)',
        border:'1px solid rgba(99,102,241,0.25)',
        boxShadow:'0 8px 40px rgba(99,102,241,0.10)',
        overflow:'hidden', position:'relative',
      }}>
        {/* Deco */}
        <div style={{ position:'absolute', right:-50, top:-50, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.10) 0%,transparent 70%)', pointerEvents:'none' }} />

        <div style={{ padding:'30px 36px', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:800, color:'#38BDF8', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:8 }}>
                👨‍🏫 {greet}
              </p>
              <h2 style={{
                fontSize:34, fontWeight:800, fontFamily:'var(--font-head)',
                letterSpacing:'-0.04em', marginBottom:10,
                background:'linear-gradient(135deg,#fff 40%,#38BDF8 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>
                {firstName}
              </h2>
              <p style={{ color:'var(--text2)', fontSize:14, marginBottom:20, maxWidth:500, lineHeight:1.65 }}>
                {isAr ? 'أنت تدير ' : "You're managing "}
                <strong style={{ color:'#38BDF8' }}>{activeGroups}</strong> {isAr ? 'فصل/فصول' : `class${activeGroups !== 1 ? 'es' : ''}`} {isAr ? 'مع ' : 'with '}
                <strong style={{ color:'#38BDF8' }}>{totalStudents}</strong> {isAr ? 'طالب' : `student${totalStudents !== 1 ? 's' : ''}`} {isAr ? 'إجمالاً.' : 'total.'}
                {activeGroups === 0 && (isAr ? ' أنشئ مجموعتك الأولى للبدء!' : ' Create your first group to get started!')}
              </p>
              {/* Role badge */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span style={{ padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:700, color:'#38BDF8', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.28)', display:'inline-flex', alignItems:'center', gap:5 }}>
                  👨‍🏫 {isAr ? 'معلم' : 'Teacher'}
                </span>
                {user?.school && (
                  <span style={{ padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:700, color:'var(--text2)', background:'var(--surface)', border:'1px solid var(--border)', display:'inline-flex', alignItems:'center', gap:5 }}>
                    🏫 {user.school}
                  </span>
                )}
                <span style={{ padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:700, color:'var(--text2)', background:'var(--surface)', border:'1px solid var(--border)', display:'inline-flex', alignItems:'center', gap:5 }}>
                  📅 {format(new Date(), 'EEE, MMM d')}
                </span>
              </div>
            </div>

            {/* Right stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, minWidth:220 }}>
              {[
                { v: activeGroups, l: isAr ? 'فصول نشطة' : 'Active Classes', icon:'🏫', c:'#38BDF8' },
                { v: totalStudents, l: isAr ? 'إجمالي الطلاب' : 'Total Students',  icon:'👥', c:'#7C3AED' },
              ].map(s => (
                <div key={s.l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontSize:24, fontWeight:900, fontFamily:'var(--font-head)', color:s.c, letterSpacing:'-0.04em', lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={stagger.item} style={{ marginBottom:28 }}>
        <h3 style={{ fontSize:15, fontWeight:800, fontFamily:'var(--font-head)', marginBottom:14, letterSpacing:'-0.02em' }}>{isAr ? 'وصول سريع' : 'Quick Actions'}</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(170px, 100%),1fr))', gap:12 }}>
          {QUICK_ACTIONS.map(a => (
            <QuickAction key={a.label} {...a} onClick={() => navigate(a.path)} />
          ))}
        </div>
      </motion.div>

      {/* ── My Groups ── */}
      <motion.div variants={stagger.item} style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontSize:15, fontWeight:800, fontFamily:'var(--font-head)', letterSpacing:'-0.02em' }}>
            {isAr ? 'فصولي' : 'My Classes'}
          </h3>
          <button onClick={() => navigate('/groups')} style={{ fontSize:12, fontWeight:700, color:'var(--primary-light)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            {isAr ? 'عرض الكل ←' : 'View all →'}
          </button>
        </div>

        {groups.length === 0 ? (
          <div style={{
            textAlign:'center', padding:'50px 24px',
            background:'var(--surface)', border:'1px dashed var(--border2)',
            borderRadius:20,
          }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🏫</div>
            <p style={{ fontSize:14, color:'var(--text3)', marginBottom:20 }}>{isAr ? 'لا توجد فصول بعد. أنشئ مجموعتك الأولى!' : 'No classes yet. Create your first group!'}</p>
            <button onClick={() => navigate('/groups')} style={{ padding:'10px 24px', borderRadius:12, background:'linear-gradient(135deg,var(--primary),var(--brand-600))', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', border:'none', fontFamily:'inherit' }}>
              {isAr ? '+ إنشاء أول مجموعة' : '+ Create First Group'}
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(260px, 100%),1fr))', gap:14 }}>
            {groups.slice(0,6).map(g => <MiniGroupCard key={g._id} group={g} navigate={navigate} />)}
          </div>
        )}
      </motion.div>

      {/* ── Daily Tip ── */}
      <motion.div variants={stagger.item}>
        <div style={{
          padding:'22px 28px', borderRadius:18,
          background:'linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(124,58,237,0.06) 100%)',
          border:'1px solid rgba(99,102,241,0.2)',
        }}>
          <p style={{ fontSize:11, fontWeight:800, color:'#38BDF8', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8 }}>{isAr ? 'نصيحة للمعلم' : 'Teacher Tip'}</p>
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, fontStyle:'italic' }}>{todayTip}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
