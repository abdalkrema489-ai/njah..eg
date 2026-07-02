// src/components/teacher/ExamBuilder.jsx — Najah v7
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';
import toast from 'react-hot-toast';
import { useDraftStore } from '../../context/store';

const SUBJECTS = ['الرياضيات','الفيزياء','الكيمياء','الأحياء','اللغة العربية','اللغة الإنجليزية','الدراسات الاجتماعية','الجيولوجيا','علم الحاسب','التربية الدينية'];
const GRADES   = ['الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي','الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي','الصف الأول الإعدادي','الصف الثاني الإعدادي','الصف الثالث الإعدادي','الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي'];

const TYPE_COLORS = {
  MCQ:       { bg:'rgba(99,102,241,0.12)',  border:'rgba(99,102,241,0.3)',  color:'#818CF8', label:'MCQ' },
  TrueFalse: { bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.3)', color:'#34D399', label:'صح/خطأ' },
  Short:     { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.3)', color:'#FBBF24', label:'قصير' },
  Essay:     { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)',  color:'#F87171', label:'مقال' },
};
const DIFF_COLORS = { easy:'#10B981', medium:'#F59E0B', hard:'#EF4444', critical:'#8B5CF6' };
const DIFF_LABELS = { easy:'سهل', medium:'متوسط', hard:'صعب', critical:'ناقد' };

function QuestionCard({ q, index, onToggle, selected }) {
  const tc = TYPE_COLORS[q.type] || TYPE_COLORS.Short;
  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0, transition:{ delay: index*0.05 } }}
      whileHover={{ y:-2, boxShadow:'0 8px 24px rgba(0,0,0,0.1)' }}
      style={{
        background: selected ? 'rgba(99,102,241,0.06)' : 'var(--surface)',
        border: `1px solid ${selected ? '#6366F1' : 'var(--border)'}`,
        borderRadius:16, padding:18, cursor:'pointer',
        transition:'all 0.2s', position:'relative', overflow:'hidden',
      }}
      onClick={() => onToggle(index)}
    >
      {/* Selection indicator */}
      <div style={{
        position:'absolute', top:12, right:12,
        width:20, height:20, borderRadius:'50%',
        background: selected ? '#6366F1' : 'var(--surface3)',
        border: `2px solid ${selected ? '#6366F1' : 'var(--border)'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, color:'#fff', fontWeight:800,
        transition:'all 0.2s',
      }}>
        {selected ? '✓' : ''}
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        <span style={{ padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:800, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>
          {tc.label}
        </span>
        <span style={{ padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:800, background:`${DIFF_COLORS[q.difficulty]}22`, color:DIFF_COLORS[q.difficulty], border:`1px solid ${DIFF_COLORS[q.difficulty]}44` }}>
          {DIFF_LABELS[q.difficulty] || q.difficulty}
        </span>
        {q.score && (
          <span style={{ padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:800, background:'rgba(14,165,233,0.12)', color:'#38BDF8', border:'1px solid rgba(14,165,233,0.24)' }}>
            {q.score} درجة
          </span>
        )}
      </div>

      <div style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', marginBottom: q.options?.length ? 10 : 0, lineHeight:1.55, paddingRight:28 }}>
        {index+1}. {q.question}
      </div>

      {q.options?.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {q.options.map((o,i) => (
            <div key={i} style={{
              padding:'6px 10px', borderRadius:8, fontSize:12, color:'var(--text3)',
              background: o === q.answer || i === q.correct ? 'rgba(16,185,129,0.1)' : 'var(--surface2)',
              border: `1px solid ${o === q.answer || i === q.correct ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
              fontWeight: o === q.answer || i === q.correct ? 700 : 400,
              color: o === q.answer || i === q.correct ? '#34D399' : 'var(--text3)',
            }}>
              {o}
            </div>
          ))}
        </div>
      )}
      {q.answer && !q.options?.length && (
        <div style={{ fontSize:12, color:'#34D399', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, padding:'6px 10px', marginTop:6 }}>
          ✅ {q.answer}
        </div>
      )}
    </motion.div>
  );
}

export default function ExamBuilder() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const { examBuilderDraft, setExamBuilderDraft, clearExamBuilderDraft } = useDraftStore();

  const [subject,  setSubject]  = useState(() => examBuilderDraft?.subject  || '');
  const [grade,    setGrade]    = useState(() => examBuilderDraft?.grade    || '');
  const [topic,    setTopic]    = useState(() => examBuilderDraft?.topic    || '');
  const [count,    setCount]    = useState(() => examBuilderDraft?.count    || 10);
  const [loading,  setLoading]  = useState(false);
  const [questions,setQuestions]= useState(() => examBuilderDraft?.questions || []);
  const [selected, setSelected] = useState(() => new Set(examBuilderDraft?.selected || []));
  const [examTitle,setExamTitle]= useState(() => examBuilderDraft?.examTitle || '');

  useEffect(() => {
    setExamBuilderDraft({
      subject,
      grade,
      topic,
      count,
      questions,
      selected: [...selected],
      examTitle,
    });
  }, [subject, grade, topic, count, questions, selected, examTitle, setExamBuilderDraft]);

  const handleGenerate = async () => {
    if (!subject || !grade || !topic) return toast.error(isAr ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
    setLoading(true);
    setQuestions([]);
    setSelected(new Set());
    try {
      const { data } = await aiAPI.generateExamQuestions({ subject, grade, topic, count });
      setQuestions(data.questions || []);
      setSelected(new Set([...Array(data.questions.length).keys()]));
      setExamTitle(`امتحان ${subject} — ${grade}`);
      toast.success(isAr ? `تم توليد ${data.questions.length} سؤال!` : `Generated ${data.questions.length} questions!`);
    } catch (err) {
      toast.error(err.response?.data?.error || (isAr ? 'تعذر التوليد' : 'Generation failed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (i) => {
    const s = new Set(selected);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelected(s);
  };

  const selectedQuestions = questions.filter((_, i) => selected.has(i));

  const handleExport = () => {
    const text = [
      `${examTitle || 'الامتحان'}`,
      `المادة: ${subject} | الصف: ${grade} | الموضوع: ${topic}`,
      `الأسئلة: ${selectedQuestions.length}`,
      '═'.repeat(50),
      '',
      ...selectedQuestions.map((q, i) => [
        `س${i+1}: ${q.question}`,
        ...(q.options?.map((o,j) => `   ${j+1}) ${o}`) || []),
        q.answer ? `   الإجابة: ${q.answer}` : '',
        '',
      ].join('\n')),
    ].join('\n');
    const blob = new Blob([text], { type:'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'exam.txt'; a.click();
    URL.revokeObjectURL(url);
    toast.success(isAr ? 'تم التصدير!' : 'Exported!');
  };

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'0 4px' }}>
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:900, fontFamily:'var(--font-head)', letterSpacing:'-0.03em', color:'var(--text)' }}>
          🧪 {isAr ? 'مولّد أسئلة الامتحانات' : 'AI Exam Builder'}
        </h1>
        <p style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
          {isAr ? 'ولّد أسئلة امتحان متنوعة بمستويات مختلفة وصدّرها بنقرة واحدة' : 'Generate diverse exam questions at multiple difficulty levels and export instantly'}
        </p>
      </motion.div>

      {/* Config panel */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:24, marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:6 }}>📚 {isAr ? 'المادة' : 'Subject'}</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', cursor:'pointer' }}>
              <option value="">{isAr ? 'اختر المادة' : 'Select subject'}</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:6 }}>🎓 {isAr ? 'الصف' : 'Grade'}</label>
            <select value={grade} onChange={e => setGrade(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', cursor:'pointer' }}>
              <option value="">{isAr ? 'اختر الصف' : 'Select grade'}</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:6 }}>💡 {isAr ? 'الموضوع' : 'Topic'}</label>
          <input value={topic} onChange={e => setTopic(e.target.value)}
            placeholder={isAr ? 'مثال: قوانين نيوتن' : 'e.g. Newton\'s Laws of Motion'}
            style={{ width:'100%', padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, fontSize:13, color:'var(--text)', boxSizing:'border-box', outline:'none', direction: isAr ? 'rtl' : 'ltr' }}
            onFocus={e => e.target.style.borderColor = '#6366F1'}
            onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
          />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:6 }}>🔢 {isAr ? 'عدد الأسئلة' : 'Question Count'}</label>
            <div style={{ display:'flex', gap:6 }}>
              {[5,10,15,20].map(n => (
                <motion.button key={n} whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }}
                  onClick={() => setCount(n)}
                  style={{ padding:'8px 14px', borderRadius:8, fontSize:13, fontWeight:800, cursor:'pointer', background: count === n ? 'var(--primary)' : 'var(--surface2)', color: count === n ? '#fff' : 'var(--text2)', border:`1px solid ${count === n ? 'var(--primary)' : 'var(--border)'}` }}
                >
                  {n}
                </motion.button>
              ))}
            </div>
          </div>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            onClick={handleGenerate} disabled={loading}
            style={{ marginTop:20, padding:'12px 28px', background:'linear-gradient(135deg,#0EA5E9,#6366F1)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:800, cursor: loading ? 'wait' : 'pointer', boxShadow:'0 4px 16px rgba(99,102,241,0.3)', opacity: loading ? 0.8 : 1, display:'flex', alignItems:'center', gap:8 }}
          >
            {loading
              ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} /> {isAr ? 'جاري التوليد...' : 'Generating...'}</>
              : `🤖 ${isAr ? 'ولّد الأسئلة' : 'Generate Questions'}`
            }
          </motion.button>
        </div>
      </div>

      {/* Questions grid */}
      <AnimatePresence>
        {questions.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            {/* Toolbar */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text2)' }}>
                {isAr ? `${selected.size} من ${questions.length} سؤال مختار` : `${selected.size} of ${questions.length} selected`}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setSelected(new Set([...Array(questions.length).keys()]))}
                  style={{ padding:'7px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', color:'var(--text2)' }}>
                  {isAr ? 'اختر الكل' : 'Select All'}
                </button>
                <button onClick={() => setSelected(new Set())}
                  style={{ padding:'7px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', color:'var(--text2)' }}>
                  {isAr ? 'إلغاء الكل' : 'Deselect All'}
                </button>
                <motion.button whileHover={{ scale:1.04 }} onClick={handleExport} disabled={selected.size === 0}
                  style={{ padding:'7px 16px', background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', border:'none', borderRadius:8, fontSize:11, fontWeight:800, cursor: selected.size === 0 ? 'not-allowed' : 'pointer', opacity: selected.size === 0 ? 0.5 : 1 }}>
                  📥 {isAr ? 'تصدير الامتحان' : 'Export Exam'}
                </motion.button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(380px, 100%), 1fr))', gap:14 }}>
              {questions.map((q, i) => (
                <QuestionCard key={i} q={q} index={i} selected={selected.has(i)} onToggle={toggleQuestion} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
