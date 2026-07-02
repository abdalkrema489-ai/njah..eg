// src/components/teacher/LessonPlanner.jsx — Najah v7
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';
import toast from 'react-hot-toast';
import { useDraftStore } from '../../context/store';

const SUBJECTS = ['الرياضيات','الفيزياء','الكيمياء','الأحياء','اللغة العربية','اللغة الإنجليزية','الدراسات الاجتماعية','الجيولوجيا','علم الحاسب','التربية الدينية'];
const GRADES   = ['الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي','الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي','الصف الأول الإعدادي','الصف الثاني الإعدادي','الصف الثالث الإعدادي','الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي'];
const STYLES   = [{ v:'lecture',   l:'شرح مباشر' },{ v:'activity',  l:'أنشطة تفاعلية' },{ v:'discussion',l:'نقاش ومشاركة' },{ v:'practical', l:'تطبيق عملي' },{ v:'mixed',     l:'مزيج متوازن' }];

const STEPS = ['المادة والصف','موضوع الدرس','خيارات الدرس','معاينة الخطة'];

function StepIndicator({ current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:32 }}>
      {STEPS.map((s,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 'none' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              background: i < current ? '#10B981' : i === current ? 'linear-gradient(135deg,#0EA5E9,#6366F1)' : 'var(--surface3)',
              border: `2px solid ${i < current ? '#10B981' : i === current ? '#6366F1' : 'var(--border)'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, fontWeight:800, color: i <= current ? '#fff' : 'var(--text4)',
              boxShadow: i === current ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
              transition:'all 0.3s',
            }}>
              {i < current ? '✓' : i+1}
            </div>
            <span style={{ fontSize:10, fontWeight:700, color: i <= current ? 'var(--text2)' : 'var(--text4)', whiteSpace:'nowrap', textAlign:'center' }}>{s}</span>
          </div>
          {i < STEPS.length-1 && (
            <div style={{ flex:1, height:2, background: i < current ? '#10B981' : 'var(--border)', margin:'0 4px', marginBottom:22, transition:'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

const fadeSlide = {
  hidden: { opacity:0, x:20 },
  show:   { opacity:1, x:0, transition:{ type:'spring', stiffness:300, damping:26 } },
  exit:   { opacity:0, x:-20 },
};

export default function LessonPlanner() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const { lessonPlannerDraft, setLessonPlannerDraft, clearLessonPlannerDraft } = useDraftStore();

  const [step,     setStep]     = useState(() => lessonPlannerDraft?.step     || 0);
  const [subject,  setSubject]  = useState(() => lessonPlannerDraft?.subject  || '');
  const [grade,    setGrade]    = useState(() => lessonPlannerDraft?.grade    || '');
  const [topic,    setTopic]    = useState(() => lessonPlannerDraft?.topic    || '');
  const [duration, setDuration] = useState(() => lessonPlannerDraft?.duration || 45);
  const [style,    setStyle]    = useState(() => lessonPlannerDraft?.style    || 'mixed');
  const [loading,  setLoading]  = useState(false);
  const [plan,     setPlan]     = useState(() => lessonPlannerDraft?.plan     || '');

  useEffect(() => {
    setLessonPlannerDraft({
      step,
      subject,
      grade,
      topic,
      duration,
      style,
      plan,
    });
  }, [step, subject, grade, topic, duration, style, plan, setLessonPlannerDraft]);

  const SelectBtn = ({ options, value, onChange }) => (
    <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.v;
        const l = typeof o === 'string' ? o : o.l;
        const active = value === v;
        return (
          <motion.button key={v} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
            onClick={() => onChange(v)}
            style={{
              padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer',
              background: active ? 'linear-gradient(135deg,#0EA5E9,#6366F1)' : 'var(--surface2)',
              color: active ? '#fff' : 'var(--text2)',
              border: `1px solid ${active ? '#6366F1' : 'var(--border)'}`,
              boxShadow: active ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
              transition:'all 0.2s',
            }}
          >{l}</motion.button>
        );
      })}
    </div>
  );

  const handleGenerate = async () => {
    if (!subject || !grade || !topic) {
      toast.error(isAr ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const { data } = await aiAPI.generateLessonPlan({ subject, grade, topic, duration, style });
      setPlan(data.plan);
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.error || (isAr ? 'تعذر توليد الخطة' : 'Failed to generate plan');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(plan);
    toast.success(isAr ? 'تم النسخ!' : 'Copied!');
  };

  const handlePrint = () => window.print();

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'0 4px' }}>
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:900, fontFamily:'var(--font-head)', letterSpacing:'-0.03em', color:'var(--text)' }}>
          📝 {isAr ? 'مخطط الدروس الذكي' : 'AI Lesson Planner'}
        </h1>
        <p style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
          {isAr ? 'أعدّ خطة درس احترافية خلال ثوانٍ بمساعدة الذكاء الاصطناعي' : 'Generate professional lesson plans in seconds with AI'}
        </p>
      </motion.div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:24, padding:'28px 32px' }}>
        <StepIndicator current={step} />

        <AnimatePresence mode="wait">
          {/* Step 0 — Subject + Grade */}
          {step === 0 && (
            <motion.div key="s0" variants={fadeSlide} initial="hidden" animate="show" exit="exit">
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:13, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:10 }}>
                  📚 {isAr ? 'المادة الدراسية' : 'Subject'}
                </label>
                <SelectBtn options={SUBJECTS} value={subject} onChange={setSubject} />
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:10 }}>
                  🎓 {isAr ? 'الصف الدراسي' : 'Grade Level'}
                </label>
                <SelectBtn options={GRADES} value={grade} onChange={setGrade} />
              </div>
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                onClick={() => { if (!subject || !grade) return toast.error(isAr ? 'اختر المادة والصف' : 'Select subject and grade'); setStep(1); }}
                style={{ marginTop:24, padding:'12px 32px', background:'linear-gradient(135deg,#0EA5E9,#6366F1)', color:'#fff', border:'none', borderRadius:14, fontSize:14, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 16px rgba(99,102,241,0.3)' }}
              >
                {isAr ? 'التالي ←' : 'Next →'}
              </motion.button>
            </motion.div>
          )}

          {/* Step 1 — Topic */}
          {step === 1 && (
            <motion.div key="s1" variants={fadeSlide} initial="hidden" animate="show" exit="exit">
              <label style={{ fontSize:13, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:10 }}>
                💡 {isAr ? 'موضوع الدرس' : 'Lesson Topic'}
              </label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={isAr ? 'مثال: الجمل الفعلية وأركانها' : 'e.g. Photosynthesis and chloroplasts'}
                autoFocus
                style={{
                  width:'100%', padding:'14px 16px', background:'var(--surface2)', border:'1px solid var(--border2)',
                  borderRadius:14, fontSize:15, color:'var(--text)', outline:'none', boxSizing:'border-box',
                  direction: isAr ? 'rtl' : 'ltr',
                }}
                onFocus={e => e.target.style.borderColor = '#6366F1'}
                onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
                onKeyDown={e => e.key === 'Enter' && topic && setStep(2)}
              />
              <p style={{ fontSize:11, color:'var(--text3)', marginTop:8 }}>
                {isAr ? 'كن محدداً قدر الإمكان للحصول على خطة أفضل' : 'Be as specific as possible for a better plan'}
              </p>
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button onClick={() => setStep(0)} style={{ padding:'11px 24px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--text2)' }}>
                  {isAr ? '← رجوع' : '← Back'}
                </button>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  onClick={() => { if (!topic.trim()) return toast.error(isAr ? 'أدخل موضوع الدرس' : 'Enter lesson topic'); setStep(2); }}
                  style={{ padding:'11px 28px', background:'linear-gradient(135deg,#0EA5E9,#6366F1)', color:'#fff', border:'none', borderRadius:12, fontSize:13, fontWeight:800, cursor:'pointer' }}
                >
                  {isAr ? 'التالي ←' : 'Next →'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Options */}
          {step === 2 && (
            <motion.div key="s2" variants={fadeSlide} initial="hidden" animate="show" exit="exit">
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:13, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:10 }}>
                  ⏱ {isAr ? 'مدة الحصة (بالدقائق)' : 'Lesson Duration (minutes)'}
                </label>
                <div style={{ display:'flex', gap:8 }}>
                  {[30,45,60,90].map(d => (
                    <motion.button key={d} whileHover={{ scale:1.06 }} whileTap={{ scale:0.94 }}
                      onClick={() => setDuration(d)}
                      style={{
                        padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:800, cursor:'pointer',
                        background: duration === d ? 'linear-gradient(135deg,#10B981,#059669)' : 'var(--surface2)',
                        color: duration === d ? '#fff' : 'var(--text2)',
                        border: `1px solid ${duration === d ? '#10B981' : 'var(--border)'}`,
                      }}
                    >{d} {isAr ? 'دقيقة' : 'min'}</motion.button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:13, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:10 }}>
                  🎨 {isAr ? 'أسلوب التدريس' : 'Teaching Style'}
                </label>
                <SelectBtn options={STYLES} value={style} onChange={setStyle} />
              </div>
              <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(14,165,233,0.06))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:16, padding:16, marginBottom:24 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', marginBottom:8 }}>📋 {isAr ? 'ملخص الخطة' : 'Plan Summary'}</div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
                  <strong>{isAr ? 'المادة:' : 'Subject:'}</strong> {subject} &nbsp;|&nbsp;
                  <strong>{isAr ? 'الصف:' : 'Grade:'}</strong> {grade}<br/>
                  <strong>{isAr ? 'الموضوع:' : 'Topic:'}</strong> {topic} &nbsp;|&nbsp;
                  <strong>{isAr ? 'المدة:' : 'Duration:'}</strong> {duration} {isAr ? 'دقيقة' : 'min'} &nbsp;|&nbsp;
                  <strong>{isAr ? 'الأسلوب:' : 'Style:'}</strong> {STYLES.find(s => s.v === style)?.l}
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep(1)} style={{ padding:'11px 24px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--text2)' }}>
                  {isAr ? '← رجوع' : '← Back'}
                </button>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  onClick={handleGenerate}
                  disabled={loading}
                  style={{ flex:1, padding:'13px', background:'linear-gradient(135deg,#0EA5E9,#6366F1)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:800, cursor: loading ? 'wait' : 'pointer', boxShadow:'0 4px 20px rgba(99,102,241,0.4)', opacity: loading ? 0.8 : 1 }}
                >
                  {loading ? (
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                      <span style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} />
                      {isAr ? 'جاري التوليد...' : 'Generating...'}
                    </span>
                  ) : (isAr ? '🤖 ولّد خطة الدرس' : '🤖 Generate Lesson Plan')}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Plan Preview */}
          {step === 3 && (
            <motion.div key="s3" variants={fadeSlide} initial="hidden" animate="show" exit="exit">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                <div style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>
                  ✅ {isAr ? 'تم توليد خطة الدرس!' : 'Lesson Plan Generated!'}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <motion.button whileHover={{ scale:1.04 }} onClick={handleCopy}
                    style={{ padding:'8px 16px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', color:'var(--text2)' }}>
                    📋 {isAr ? 'نسخ' : 'Copy'}
                  </motion.button>
                  <motion.button whileHover={{ scale:1.04 }} onClick={handlePrint}
                    style={{ padding:'8px 16px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', color:'var(--text2)' }}>
                    🖨️ {isAr ? 'طباعة' : 'Print'}
                  </motion.button>
                  <motion.button whileHover={{ scale:1.04 }} onClick={() => { setStep(0); setPlan(''); setSubject(''); setGrade(''); setTopic(''); }}
                    style={{ padding:'8px 16px', background:'linear-gradient(135deg,#0EA5E9,#6366F1)', color:'#fff', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    ✨ {isAr ? 'خطة جديدة' : 'New Plan'}
                  </motion.button>
                </div>
              </div>
              <div style={{
                background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:16, padding:24,
                maxHeight:560, overflowY:'auto', direction: isAr ? 'rtl' : 'ltr',
                fontFamily:'var(--font-body)', fontSize:14, lineHeight:1.8, color:'var(--text)',
                whiteSpace:'pre-wrap',
              }}>
                {plan}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print { body > *:not(.lesson-plan-content) { display: none; } }
      `}</style>
    </div>
  );
}
