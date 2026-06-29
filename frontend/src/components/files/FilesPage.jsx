// src/components/files/FilesPage.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { filesAPI, aiAPI } from '../../api/index';
import { Card, Button, Tag, Modal, Input, Select, Spinner, EmptyState, SectionHeader, Btn, ProgressBar } from '../shared/UI';
import { useTranslation } from '../../i18n/index';
import jsPDF from 'jspdf';

async function downloadSummaryPdf(summaryText, fileName, fileId) {
  const isArabic = /[\u0600-\u06FF]/.test(summaryText || '');
  if (isArabic) {
    try {
      const token = localStorage.getItem('token');
      let rawAPI = import.meta.env.VITE_API_URL;
      if (import.meta.env.PROD && rawAPI && rawAPI.includes('localhost')) {
        rawAPI = '/api';
      }
      const API = rawAPI || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

      const response = await fetch(`${API}/files/${fileId}/summary-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ summaryText, fileName })
      });
      if (!response.ok) throw new Error('Backend generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(fileName || 'summary').replace(/\.[^.]+$/, '')}-summary.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded PDF successfully!');
    } catch (err) {
      toast.error('Failed to download Arabic PDF from backend. Falling back to client-side.');
      generateClientPdf(summaryText, fileName);
    }
  } else {
    generateClientPdf(summaryText, fileName);
  }
}

function generateClientPdf(summaryText, fileName) {
  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text('Najah Platform - File Summary', 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(fileName || 'Untitled', 14, 26);
    doc.setTextColor(0);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(summaryText || '', 180);
    doc.text(lines, 14, 38);
    doc.save(`${(fileName || 'summary').replace(/\.[^.]+$/, '')}-summary.pdf`);
    toast.success('Downloaded PDF successfully!');
  } catch (err) {
    toast.error('Failed to generate PDF client-side.');
  }
}

const SUBJECTS = ['mathematics','science','physics','chemistry','biology','arabic','english','social_studies','other'];
const SUBJECT_ICONS = { mathematics:'📐', science:'🔬', physics:'⚛️', chemistry:'🧪', biology:'🧬', arabic:'📚', english:'🌐', social_studies:'🌍', other:'📎' };
const SUBJECTS_LOC_AR = { mathematics:'الرياضيات', science:'العلوم', physics:'الفيزياء', chemistry:'الكيمياء', biology:'الأحياء', arabic:'اللغة العربية', english:'اللغة الإنجليزية', social_studies:'الدراسات الاجتماعية', other:'أخرى' };
const SUBJECTS_LOC_EN = { mathematics:'Mathematics', science:'Science', physics:'Physics', chemistry:'Chemistry', biology:'Biology', arabic:'Arabic', english:'English', social_studies:'Social Studies', other:'Other' };
const MIME_ICONS = { 'application/pdf':'📄', 'image/jpeg':'🖼️', 'image/png':'🖼️', 'image/gif':'🖼️', 'image/webp':'🖼️' };

function UploadDropzone({ onUploaded }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [meta, setMeta] = useState({ subject: 'mathematics', tags: '', is_public: false });

  const onDrop = useCallback(async (files) => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    try {
      for (const file of files) {
        await filesAPI.upload(file, meta, setProgress);
        toast.success(`✅ ${file.name} uploaded successfully!`);
      }
      onUploaded?.();
    } catch (err) { 
      console.error(err);
      toast.error(err.response?.data?.error || 'Upload failed. Please check your connection.'); 
    }
    finally { setUploading(false); setProgress(0); }
  }, [meta, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, 
    accept: { 
      'application/pdf': ['.pdf'], 
      'image/*': ['.jpg','.jpeg','.png','.gif','.webp'] 
    },
    maxSize: 200 * 1024 * 1024, 
    disabled: uploading,
  });

  return (
    <div className="floating-panel" style={{ padding: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 18, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em' }}>{isAr ? '📥 رفع آمن للملفات' : '📥 Secure Vault Upload'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Select value={meta.subject} onChange={e => setMeta(m => ({ ...m, subject: e.target.value }))}>
          {SUBJECTS.map(s => (
            <option key={s} value={s}>{SUBJECT_ICONS[s]} {isAr ? SUBJECTS_LOC_AR[s] : SUBJECTS_LOC_EN[s]}</option>
          ))}
        </Select>
        <Input 
          placeholder={isAr ? "وسوم: ملاحظات، امتحان، ملخص..." : "Tags: notes, exam, summary..."} 
          value={meta.tags}
          onChange={e => setMeta(m => ({ ...m, tags: e.target.value }))}
        />
      </div>

      <motion.div {...getRootProps()}
        animate={{ 
          borderColor: isDragActive ? 'var(--primary)' : 'var(--border)',
          background: isDragActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)' 
        }}
        whileHover={{ scale: 1.01, borderColor: 'var(--primary)' }}
        style={{
          border: '2px dashed', borderRadius: 20, padding: '48px 24px',
          textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <Spinner size="lg" />
            <div style={{ marginTop: 16, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{isAr ? `جاري الرفع... ${progress}%` : `Uploading Excellence... ${progress}%`}</div>
            <div style={{ marginTop: 12, height: 8, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden', maxWidth: 300, margin: '12px auto 0' }}>
              <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--brand-400))', boxShadow: '0 0 15px var(--primary)' }}
                animate={{ width: `${progress}%` }} transition={{ ease: 'linear' }} />
            </div>
          </div>
        ) : (
          <>
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              style={{ fontSize: 48, marginBottom: 14, filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.3))' }}>
              {isDragActive ? '📂' : '✨'}
            </motion.div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>
              {isDragActive ? (isAr ? 'أفلت للرفع' : 'Release to Upload') : (isAr ? 'اسحب وأفلت الملفات الأكاديمية هنا' : 'Drag & drop academic assets here')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isAr ? 'أو انقر لتصفح الملفات' : 'OR CLICK TO BROWSE LOCAL FILES'}</div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function FileCard({ file, onDelete, onAnalyze }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.015, x: 4 }}
      className="floating-card file-card-item"
      style={{
        padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16,
        transition: 'all 0.22s var(--ease)',
        borderRadius: 18
      }}
    >
      <div style={{ 
        width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 24,
        background: file.mime_type === 'application/pdf' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.12)',
        border: '1px solid',
        borderColor: file.mime_type === 'application/pdf' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.25)'
      }}>
        {MIME_ICONS[file.mime_type] || '📎'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginBottom: 4, fontFamily: 'var(--font-head)' }} className="truncate">{file.original_name}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text4)' }}>{Math.round(file.size_bytes / 1024)} KB</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border2)' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{file.subject?.replace('_',' ')}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border2)' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text4)' }}>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn size="sm" variant="glass" onClick={() => onAnalyze(file)}>🤖 {isAr ? 'تحليل AI' : 'AI ANALYZE'}</Btn>
        <a href={file.file_url} target="_blank" rel="noopener noreferrer">
          <Btn size="sm" variant="ghost">👁</Btn>
        </a>
        <Btn size="sm" variant="danger" onClick={() => onDelete(file.id)}>🗑</Btn>
      </div>
    </motion.div>
  );
}

import QuizPanel from './QuizPanel';
import StudyToolsPanel from './StudyToolsPanel';

export default function FilesPage() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' | 'quiz' | 'tools'
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [analyzeFile, setAnalyzeFile] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['files', subject, search],
    queryFn: () => filesAPI.list({ subject: subject || undefined, search: search || undefined }),
  });
  const files = data?.data?.files || [];

  const { mutate: deleteFile } = useMutation({
    mutationFn: filesAPI.remove,
    onSuccess: () => { qc.invalidateQueries(['files']); toast.success('Removed from Vault'); },
    onError:   (err) => toast.error(err.response?.data?.error || 'Removal failed'),
  });

  return (
    <div className="animate-fade-up">
      <SectionHeader 
        icon="📁" 
        title={isAr ? "مخزن المعرفة" : "Knowledge Vault"} 
        subtitle={isAr ? "إدارة مستودعك الأكاديمي. يمكنك الوصول والتحليل وتنظيم المواد الدراسية بسهولة." : "Manage your academic repository. Access, analyze, and organize your study materials with ease."} 
      />

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab('vault')}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
            transition: 'all 0.25s',
            background: activeTab === 'vault' ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'transparent',
            color: activeTab === 'vault' ? '#fff' : 'var(--text3)',
            boxShadow: activeTab === 'vault' ? '0 4px 14px rgba(99,102,241,0.25)' : 'none',
          }}
        >
          📁 {isAr ? 'ملفات المخزن' : 'Vault Files'}
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
            transition: 'all 0.25s',
            background: activeTab === 'quiz' ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'transparent',
            color: activeTab === 'quiz' ? '#fff' : 'var(--text3)',
            boxShadow: activeTab === 'quiz' ? '0 4px 14px rgba(99,102,241,0.25)' : 'none',
          }}
        >
          🧠 {isAr ? 'اختبارات الذكاء الاصطناعي' : 'AI Quizzes'}
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
            transition: 'all 0.25s',
            background: activeTab === 'tools' ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'transparent',
            color: activeTab === 'tools' ? '#fff' : 'var(--text3)',
            boxShadow: activeTab === 'tools' ? '0 4px 14px rgba(99,102,241,0.25)' : 'none',
          }}
        >
          🛠️ {isAr ? 'أدوات الدراسة' : 'Study Tools'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'vault' ? (
          <motion.div
            key="vault"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.18 }}
            className="files-layout-grid"
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) min(320px, 100%)', gap: 24, marginBottom: 32 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <UploadDropzone onUploaded={() => qc.invalidateQueries(['files'])} />
              
              <div className="files-filter-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: 'var(--surface2)', padding: 8, borderRadius: 14, border: '1px solid var(--border)' }}>
                <Btn size="sm" variant={!subject ? 'primary' : 'ghost'} onClick={() => setSubject('')}>{isAr ? 'الكل' : 'ALL'}</Btn>
                {SUBJECTS.map(s => (
                  <Btn key={s} size="sm" variant={subject === s ? 'primary' : 'ghost'} onClick={() => setSubject(s)}>
                    {SUBJECT_ICONS[s]} {(isAr ? SUBJECTS_LOC_AR[s] : SUBJECTS_LOC_EN[s]).toUpperCase()}
                  </Btn>
                ))}
                <div className="files-search-wrapper" style={{ marginLeft: 'auto', width: 240 }}>
                  <Input placeholder={isAr ? "البحث في المخزن..." : "Search Vault..."} value={search} onChange={e => setSearch(e.target.value)} prefix="🔍" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isLoading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)
                ) : files.length === 0 ? (
                  <Card><EmptyState icon="📦" title={isAr ? "المخزن فارغ" : "Vault is Empty"} subtitle={isAr ? "ابدأ في رفع الأدلة والملاحظات الدراسية لملء مستودعك." : "Start uploading your study guides and notes to populate your repository."} /></Card>
                ) : (
                  <AnimatePresence>
                    {files.map(f => (
                      <FileCard key={f.id} file={f}
                        onDelete={(id) => { if (window.confirm('Remove this file from your vault?')) deleteFile(id); }}
                        onAnalyze={(f) => setAnalyzeFile(f)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="floating-panel" style={{ padding: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 20, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em' }}>{isAr ? 'تحليلات المخزن' : 'Vault Analytics'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                  <div className="floating-card" style={{ padding: 16, borderRadius: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-head)', color: 'var(--primary)' }}>{files.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isAr ? 'إجمالي الملفات' : 'TOTAL ASSETS'}</div>
                  </div>
                  <div className="floating-card" style={{ padding: 16, borderRadius: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-head)', color: 'var(--warning)' }}>{files.filter(f => f.mime_type === 'application/pdf').length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isAr ? 'أدلة PDF' : 'PDF GUIDES'}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 900, color: 'var(--text2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{isAr ? 'توزيع المواد' : 'Subject Distribution'}</h4>
                  {SUBJECTS.map(s => {
                    const count = files.filter(f => f.subject === s).length;
                    const pct = (count / (files.length || 1)) * 100;
                    return (
                      <div key={s}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, color: 'var(--text)' }}>{SUBJECT_ICONS[s]} {isAr ? SUBJECTS_LOC_AR[s] : SUBJECTS_LOC_EN[s]}</span>
                          <span style={{ color: 'var(--text4)', fontWeight: 900 }}>{count}</span>
                        </div>
                        <ProgressBar value={pct} height={7} color="var(--primary)" />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <Card style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)', border: 'none', color: '#fff' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{isAr ? 'تحليل الذكاء الاصطناعي للمخزن' : 'AI Vault Analysis'}</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 20 }}>
                  {isAr ? 'استخدم الذكاء الاصطناعي المتقدم الخاص بنا لتلخيص ملفات PDF وإنشاء اختبارات والإجابة على أسئلة محددة من مستنداتك فورًا.' : 'Use our advanced AI to summarize your PDFs, generate quizzes, and answer specific questions from your documents instantly.'}
                </p>
                <div style={{ fontSize: 40, textAlign: 'center', opacity: 0.5 }}>🤖</div>
              </Card>
            </div>
          </motion.div>
        ) : activeTab === 'quiz' ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.18 }}
          >
            <QuizPanel />
          </motion.div>
        ) : (
          <motion.div
            key="tools"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.18 }}
          >
            <StudyToolsPanel />
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={!!analyzeFile} onClose={() => setAnalyzeFile(null)} title={`🤖 ${isAr ? 'تحليل الذكاء الاصطناعي' : 'INTELLECT ANALYSIS'} — ${analyzeFile?.original_name}`} size="lg">
        {analyzeFile && <AIFileAnalysis file={analyzeFile} />}
      </Modal>
    </div>
  );
}
function TimerRing({ seconds, totalSeconds, isAr }) {
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const pct = totalSeconds > 0 ? (seconds / totalSeconds) : 0;
  const offset = circ * (1 - pct);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const ringColor = pct > 0.5 ? '#0ECDA8' : pct > 0.25 ? '#F7B731' : '#FF5470';

  return (
    <div style={{ position: 'relative', width: 78, height: 78, flexShrink: 0 }}>
      <svg width="78" height="78" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="39" cy="39" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="39" cy="39" r={radius} fill="none"
          stroke={ringColor} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: ringColor, lineHeight: 1 }}>{mm}:{ss}</div>
        <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>{isAr ? 'متبقي' : 'left'}</div>
      </div>
    </div>
  );
}

function AIFileAnalysis({ file }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [question, setQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [customCount, setCustomCount] = useState(10);
  const [customTime, setCustomTime] = useState(10); // in minutes
  const [explainLoading, setExplainLoading] = useState({});
  const [explanations, setExplanations] = useState({});

  const handleExplainQuestion = async (qi, questionText, correctOptText, userOptText) => {
    setExplainLoading(prev => ({ ...prev, [qi]: true }));
    try {
      const promptText = isAr
        ? `فسر لي بالتفصيل وبأسلوب تعليمي مبسط هذا السؤال:\nالسؤال: "${questionText}"\nالخيار الصحيح: "${correctOptText}"\nخيار الطالب: "${userOptText || 'لم يتم الإجابة'}"\n\nاشرح لماذا هذا الخيار هو الصحيح وكيف يتم التفكير للوصول للإجابة الصحيحة.`
        : `Explain this question in detail:\nQuestion: "${questionText}"\nCorrect Answer: "${correctOptText}"\nStudent Answer: "${userOptText || 'No Answer'}"\n\nProvide a clear, step-by-step breakdown of why the correct option is right and how to solve it.`;
      
      const res = await aiAPI.chat({ message: promptText, withFollowUps: false });
      setExplanations(prev => ({ ...prev, [qi]: res.data?.reply || '' }));
    } catch {
      toast.error(isAr ? 'فشل جلب التفسير من الذكاء الاصطناعي' : 'Failed to fetch AI explanation');
    } finally {
      setExplainLoading(prev => ({ ...prev, [qi]: false }));
    }
  };

  const saveToNotes = async (contentStr, titlePrefix = 'Summary') => {
    setSavingNote(true);
    try {
      const { notesAPI } = await import('../../api/index');
      await notesAPI.create({
        title: `${titlePrefix}: ${file.original_name}`,
        subject: file.subject || 'other',
        content: `<div>${contentStr.replace(/\n/g, '<br/>')}</div>`,
        linked_file: file.id
      });
      toast.success(isAr ? '📝 تم الحفظ في الملاحظات بنجاح!' : '📝 Saved to Notes successfully!');
    } catch (err) {
      toast.error(isAr ? 'فشل الحفظ في الملاحظات' : 'Failed to save to Notes');
    } finally {
      setSavingNote(false);
    }
  };

  // Mode: select | exam | summary
  const [mode, setMode] = useState('select');

  // Summary State
  const [summaryResult, setSummaryResult] = useState(null);

  // Exam / Quiz State
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [current, setCurrent] = useState(0);
  const [flagged, setFlagged] = useState(new Set());
  const [timeTaken, setTimeTaken] = useState(0);
  const startTimeRef = useRef(null);
  const [quizScore, setQuizScore] = useState(null);
  const [showReview, setShowReview] = useState(false);

  const timerRef = useRef(null);
  const answersRef = useRef({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submitExam = useCallback(async (finalAnswers = answersRef.current, wasTimedOut = false) => {
    clearInterval(timerRef.current);
    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;
    setTimeTaken(elapsed);

    const questions = exam?.questions || [];
    const correct = questions.filter((q, i) => finalAnswers[i] === q.correct).length;
    const score = Math.round((correct / questions.length) * 100);

    setQuizScore(score);

    try {
      await aiAPI.submitQuiz({
        subject: file.subject || 'general',
        topic: file.original_name,
        totalQ: questions.length,
        correctQ: correct,
        difficulty: 'medium',
        timeTaken: elapsed,
        questions: questions.map((q, i) => ({ ...q, userAnswer: finalAnswers[i] })),
      });
    } catch {}

    if (wasTimedOut) {
      toast.error(isAr ? `⏰ انتهى الوقت! درجتك: ${score}%` : `⏰ Time's up! You scored ${score}%`);
    } else {
      score >= 80
        ? toast.success(isAr ? `🎉 ممتاز! ${score}% — إجابات صحيحة ${correct}/${questions.length}!` : `🎉 Excellent! ${score}% — ${correct}/${questions.length} correct!`)
        : score >= 60
          ? toast(isAr ? `👍 مجهود جيد! ${score}% — استمر في المحاولة!` : `👍 Good effort! ${score}% — keep practising!`)
          : toast(isAr ? `📚 ${score}% — راجع المادة وحاول مجدداً` : `📚 ${score}% — review the material and try again`);
    }
  }, [exam, file, isAr]);

  useEffect(() => {
    if (mode === 'exam' && exam && quizScore === null) {
      const dur = exam.questions.length * 2 * 60; // 2 minutes per question
      setSeconds(dur);
      setTotalSeconds(dur);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            toast.error(isAr ? '⏰ انتهى الوقت! جاري إرسال الإجابات...' : '⏰ Time is up! Submitting exam...');
            submitExam(answersRef.current, true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [mode, exam, quizScore, isAr, submitExam]);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await aiAPI.askFile({ question: question.trim(), fileId: file.id });
      setAskAnswer(res.data.answer);
    } catch (err) { toast.error(err.response?.data?.error || 'Analysis engine failed'); }
    finally { setLoading(false); }
  };

  const runAction = async (action) => {
    if (action === 'summarize' && file.mime_type !== 'application/pdf') {
      toast.error(isAr ? 'التلخيص متاح حالياً لملفات PDF فقط' : 'Summarization is currently only available for PDF files');
      return;
    }
    setLoading(true);
    setSummaryResult(null);
    setExam(null);
    setAnswers({});
    setQuizScore(null);
    setFlagged(new Set());
    setCurrent(0);
    setAskAnswer('');
    try {
      if (action === 'summarize') {
        setMode('summary');
        const res = await aiAPI.summarize({ fileId: file.id });
        setSummaryResult(res.data.summary || '');
      } else {
        setMode('exam');
        const res = await aiAPI.generateQuiz({ subject: file.subject || 'general', topic: file.original_name, fileId: file.id, count: 10 });
        const questions = res.data.questions || [];
        if (!questions.length) throw new Error('No questions returned');
        setExam({ ...res.data, questions, subject: file.subject || 'general', difficulty: 'medium' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || (action === 'summarize'
        ? (isAr ? 'فشل التلخيص' : 'Summarization failed')
        : (isAr ? 'فشل إنشاء الاختبار' : 'Quiz generation failed')));
      setMode('select');
    } finally { setLoading(false); }
  };

  const handleOptionSelect = (oi) => {
    setAnswers(prev => ({ ...prev, [current]: oi }));
  };

  const toggleFlag = () => {
    setFlagged(f => {
      const n = new Set(f);
      n.has(current) ? n.delete(current) : n.add(current);
      return n;
    });
  };

  const handleFinalize = () => {
    const questions = exam?.questions || [];
    const answeredCount = Object.keys(answers).length;
    const unanswered = questions.length - answeredCount;
    if (unanswered > 0) {
      if (!window.confirm(isAr 
        ? `لديك ${unanswered} أسئلة غير مجابة. هل تريد الإنهاء على أي حال؟` 
        : `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) {
        return;
      }
    }
    submitExam(answers, false);
  };

  const isPDF = file.mime_type === 'application/pdf';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {mode === 'select' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isPDF ? '1fr 1fr' : '1fr', gap: 12 }}>
            {isPDF && (
              <Btn variant="glass" onClick={() => runAction('summarize')} disabled={loading}>
                📄 {isAr ? 'تلخيص الملف (PDF)' : 'Summarize File (PDF)'}
              </Btn>
            )}
            <Btn variant="glass" onClick={() => runAction('quiz')} disabled={loading}>
              📝 {isAr ? 'بدء محاكاة الامتحان' : 'Start Exam Simulator'}
            </Btn>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Input
              value={question} onChange={e => setQuestion(e.target.value)}
              placeholder={isAr ? "استفسر من هذا المستند..." : "Query this document..."}
              onKeyDown={e => e.key === 'Enter' && ask()}
            />
            <Btn variant="primary" onClick={ask} loading={loading}>{isAr ? 'اسأل الذكاء الاصطناعي' : 'ASK INTELLECT'}</Btn>
          </div>

          <AnimatePresence>
            {askAnswer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: 20, fontSize: 14, lineHeight: 1.8, color: 'var(--text)',
                    maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap',
                    boxShadow: 'var(--shadow-inner)'
                  }}
                >
                  {String(askAnswer)}
                </motion.div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Btn variant="glass" size="sm" onClick={() => saveToNotes(`Question: ${question}\n\nAnswer:\n${askAnswer}`, isAr ? 'سؤال وجواب' : 'Q&A')} disabled={savingNote}>
                    {savingNote ? <Spinner size="sm" /> : <>📝 {isAr ? 'حفظ في الملاحظات' : 'Save to Notes'}</>}
                  </Btn>
                </div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {loading && mode !== 'select' && (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <Spinner size="lg" />
          <p style={{ marginTop: 16, color: 'var(--text3)', fontSize: 14 }}>
            {mode === 'summary' 
              ? (isAr ? 'جاري تلخيص الملف بالذكاء الاصطناعي...' : 'Generating your summary with AI...') 
              : (isAr ? 'جاري بناء محاكي الامتحان الخاص بك...' : 'Generating your exam with AI...')}
          </p>
        </div>
      )}

      {!loading && mode === 'summary' && summaryResult && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 24,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid var(--primary)', flexWrap: 'wrap' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📄</div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {isAr ? 'ملخص الملف' : 'File Summary'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: '2px 0 0' }} className="truncate">{file.original_name}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => saveToNotes(summaryResult, isAr ? 'ملخص' : 'Summary')} disabled={savingNote}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', minHeight: 40, background: 'var(--success-dark)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: savingNote ? 0.6 : 1 }}>
                {savingNote ? <Spinner size="sm" /> : <>📝 {isAr ? 'حفظ في الملاحظات' : 'Save to Notes'}</>}
              </button>
              <button onClick={() => downloadSummaryPdf(summaryResult, file.original_name, file.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', minHeight: 40, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                📥 {isAr ? 'تحميل PDF' : 'Download PDF'}
              </button>
              <button onClick={() => setMode('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)' }}>✕</button>
            </div>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }} className="scroll-y">
            {summaryResult}
          </div>
        </motion.div>
      )}

      {!loading && mode === 'exam' && exam && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {quizScore !== null ? (
            // Results screen
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 18, padding: 28,
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #A78BFA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#A78BFA,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📝</div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                      {isAr ? 'نتائج الامتحان' : 'Exam Results'}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text3)', margin: '2px 0 0' }}>{file.original_name}</p>
                  </div>
                </div>
                <button onClick={() => setMode('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)' }}>✕</button>
              </div>

              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 52 }}>
                  {quizScore >= 90 ? '🏆' : quizScore >= 80 ? '⭐' : quizScore >= 70 ? '👍' : quizScore >= 60 ? '📚' : '💪'}
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--primary)', marginTop: 8 }}>{quizScore}%</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  {isAr ? 'التقدير: ' : 'Grade: '} 
                  <span style={{ color: quizScore >= 80 ? '#0ECDA8' : quizScore >= 60 ? '#F7B731' : '#FF5470' }}>
                    {quizScore >= 90 ? 'A+' : quizScore >= 80 ? 'A' : quizScore >= 70 ? 'B' : quizScore >= 60 ? 'C' : 'D'}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text3)', marginTop: 4 }}>
                  {isAr 
                    ? `إجابات صحيحة ${Math.round(quizScore / 100 * exam.questions.length)} من أصل ${exam.questions.length}` 
                    : `${Math.round(quizScore / 100 * exam.questions.length)}/${exam.questions.length} correct`}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 300, margin: '20px auto 0' }}>
                  <div style={{ padding: '10px', background: 'var(--surface)', borderRadius: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{isAr ? 'الوقت المستغرق' : 'Time taken'}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--surface)', borderRadius: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{Object.keys(answers).length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{isAr ? 'الأسئلة المجابة' : 'Answered'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
                  <Btn onClick={() => setShowReview(v => !v)}>
                    {showReview ? (isAr ? 'إخفاء المراجعة' : 'Hide Review') : (isAr ? '📋 مراجعة الإجابات' : '📋 Review Answers')}
                  </Btn>
                  <Btn variant="primary" onClick={() => runAction('quiz')}>
                    ↺ {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </Btn>
                </div>
              </div>

              <AnimatePresence>
                {showReview && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    {exam.questions.map((q, qi) => {
                      const ua = answers[qi];
                      const isCorrect = ua === q.correct;
                      return (
                        <div key={qi} style={{ padding: 16, background: 'var(--surface)', borderRadius: 12, border: `1px solid ${isCorrect ? 'rgba(14,205,168,0.25)' : 'rgba(255,84,112,0.25)'}` }}>
                          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 10, fontSize: 14 }}>
                            {qi + 1}. {q.question}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(q.options || []).map((opt, oi) => {
                              const isUserAns = oi === ua;
                              const isCorrectAns = oi === q.correct;
                              return (
                                <div key={oi} style={{
                                  padding: '8px 12px', borderRadius: 8, fontSize: 13,
                                  background: isCorrectAns ? 'rgba(14,205,168,0.1)' : isUserAns && !isCorrect ? 'rgba(255,84,112,0.1)' : 'var(--surface2)',
                                  color: isCorrectAns ? 'var(--accent2)' : isUserAns && !isCorrect ? 'var(--danger)' : 'var(--text2)',
                                  border: `1px solid ${isCorrectAns ? 'rgba(14,205,168,0.25)' : isUserAns && !isCorrect ? 'rgba(255,84,112,0.25)' : 'var(--border)'}`,
                                  display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                  <span style={{ fontWeight: 700 }}>{String.fromCharCode(65 + oi)})</span>
                                  {opt}
                                  {isCorrectAns && <span style={{ marginLeft: isAr ? 'unset' : 'auto', marginRight: isAr ? 'auto' : 'unset', fontSize: 11, fontWeight: 700 }}>✓ {isAr ? 'الإجابة الصحيحة' : 'Correct'}</span>}
                                  {isUserAns && !isCorrect && <span style={{ marginLeft: isAr ? 'unset' : 'auto', marginRight: isAr ? 'auto' : 'unset', fontSize: 11 }}>✗ {isAr ? 'إجابتك' : 'Your answer'}</span>}
                                </div>
                              );
                            })}
                          </div>
                          {q.explanation && (
                            <div style={{
                              marginTop: 10, padding: '10px 12px', background: 'rgba(108,99,255,0.07)',
                              borderRadius: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6,
                              borderLeft: '3px solid var(--primary)',
                            }}>
                              <strong style={{ color: 'var(--primary-light)' }}>💡 {isAr ? 'التفسير:' : 'Explanation:'}</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            // Active exam phase
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 18, padding: 24,
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              }}
            >
              {/* Exam active header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
                marginBottom: 20, paddingBottom: 16,
                borderBottom: '2px solid var(--primary)'
              }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
                    {isAr ? 'محاكي الامتحان النشط' : 'ACTIVE EXAM SIMULATOR'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4, fontWeight: 700 }}>
                    <span style={{ color: 'var(--primary)' }}>{Object.keys(answers).length}</span> / {exam.questions.length} {isAr ? 'مُجاب' : 'completed'}
                    {flagged.size > 0 && <span style={{ color: 'var(--warning)', marginLeft: 12 }}>🚩 {flagged.size} {isAr ? 'معلمة' : 'flagged'}</span>}
                  </div>
                </div>
                <TimerRing seconds={seconds} totalSeconds={totalSeconds} isAr={isAr} />
                <Btn variant="glass" onClick={handleFinalize} style={{ flexShrink: 0 }}>
                  {isAr ? 'إنهاء الامتحان ←' : 'Finalize Exam →'}
                </Btn>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #0ECDA8)', width: `${(Object.keys(answers).length / exam.questions.length) * 100}%`, transition: 'width 0.3s ease' }} />
              </div>

              {/* Question panel */}
              <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 20, border: '1px solid var(--border2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isAr ? `السؤال ${current + 1} من ${exam.questions.length}` : `Question ${current + 1} of ${exam.questions.length}`}
                  </div>
                  <Btn size="sm" variant="glass" onClick={toggleFlag}>
                    {flagged.has(current) ? (isAr ? 'إزالة العلامة 🚩' : 'Remove Flag 🚩') : (isAr ? 'تعليم السؤال 🏳️' : 'Flag Question 🏳️')}
                  </Btn>
                </div>

                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.6, marginBottom: 20, color: 'var(--text)' }}>
                  {exam.questions[current]?.question}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {(exam.questions[current]?.options || []).map((opt, oi) => {
                    const selected = answers[current] === oi;
                    return (
                      <motion.div key={oi} onClick={() => handleOptionSelect(oi)}
                        whileHover={{ scale: 1.01, x: isAr ? -4 : 4 }} whileTap={{ scale: 0.99 }}
                        style={{
                          padding: '12px 18px', borderRadius: 12, cursor: 'pointer',
                          background: selected ? 'rgba(99,102,241,0.1)' : 'var(--surface2)',
                          border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                          color: selected ? 'var(--text)' : 'var(--text2)',
                          fontSize: 14, transition: 'all 0.2s', display: 'flex', alignItems: 'center'
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: 8, fontWeight: 900,
                          marginRight: isAr ? 0 : 12, marginLeft: isAr ? 12 : 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: selected ? 'var(--primary)' : 'var(--surface)',
                          color: selected ? '#fff' : 'var(--text4)', fontSize: 12
                        }}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <div style={{ flex: 1 }}>{opt}</div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Question navigators prev/next */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <Btn onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                    {isAr ? '← السابق' : '← PREV'}
                  </Btn>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text4)' }}>{current + 1} / {exam.questions.length}</span>
                  <Btn variant="primary" onClick={() => setCurrent(c => Math.min(exam.questions.length - 1, c + 1))} disabled={current === exam.questions.length - 1}>
                    {isAr ? 'التالي →' : 'NEXT →'}
                  </Btn>
                </div>
              </div>

              {/* Protocol navigator grid */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isAr ? 'لوحة الملاحة' : 'QUESTION NAVIGATION'}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {exam.questions.map((_, qi) => {
                    const isAnswered = answers[qi] !== undefined;
                    const isFlagged = flagged.has(qi);
                    const isCurrent = qi === current;
                    return (
                      <motion.button key={qi} onClick={() => setCurrent(qi)}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: 'none',
                          cursor: 'pointer', fontSize: 12, fontWeight: 900,
                          background: isCurrent ? 'var(--primary)' : isFlagged ? 'var(--warning)' : isAnswered ? '#10B981' : 'var(--surface)',
                          color: isCurrent || isFlagged || isAnswered ? '#fff' : 'var(--text4)',
                          boxShadow: isCurrent ? '0 0 10px var(--primary)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {qi + 1}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

