// src/components/ai/HomeworkCorrector.jsx
// Homework image correction — Camera (native) or file upload (web)
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import client from '../../api/index';
import DOMPurify from 'dompurify';
import { haptic } from '../../utils/haptics';

export default function HomeworkCorrector({ isAr }) {
  const [img, setImg]         = useState(null);
  const [preview, setPreview] = useState(null);
  const [subject, setSubject] = useState('mathematics');
  const [grade, setGrade]     = useState('الثانوي');
  const [result, setResult]   = useState(null);
  const fileRef = useRef();

  const mutation = useMutation({
    mutationFn: (data) => client.post('/ai/correct-homework', data).then(r => r.data),
    onSuccess: (data) => {
      setResult(data.correction);
      haptic.success();
    },
    onError: () => {
      toast.error(isAr ? 'فشل التصحيح' : 'Correction failed');
      haptic.error();
    },
  });

  // ── Web file input fallback ──────────────────────────────────
  const handleFile = (file) => {
    if (!file?.type.startsWith('image/')) {
      return toast.error(isAr ? 'ارفع صورة فقط' : 'Images only');
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImg(e.target.result);
      setPreview(e.target.result);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  // ── Camera / Gallery (Capacitor native) or fallback ─────────
  const takePhoto = async () => {
    haptic.light();
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({
          quality:      90,
          allowEditing: false,
          resultType:   CameraResultType.Base64,
          source:       CameraSource.Prompt, // lets user choose Camera or Gallery
        });
        const base64 = `data:image/jpeg;base64,${photo.base64String}`;
        setImg(base64);
        setPreview(base64);
        setResult(null);
      } catch (err) {
        // User cancelled — not an error
        if (err.message !== 'User cancelled photos app') {
          toast.error(isAr ? 'فشل التقاط الصورة' : 'Failed to capture photo');
        }
      }
    } else {
      // Fallback to native file picker on web
      fileRef.current?.click();
    }
  };

  const handleSubmit = () => {
    if (!img) return toast.error(isAr ? 'ارفع صورة أولاً' : 'Upload image first');
    haptic.medium();
    mutation.mutate({ imageBase64: img, subject, grade, language: isAr ? 'ar' : 'en' });
  };

  const SUBJECTS = [
    { v:'mathematics', ar:'رياضيات', en:'Mathematics' },
    { v:'physics',     ar:'فيزياء',  en:'Physics'     },
    { v:'chemistry',   ar:'كيمياء',  en:'Chemistry'   },
    { v:'biology',     ar:'أحياء',   en:'Biology'     },
    { v:'arabic',      ar:'عربي',    en:'Arabic'      },
    { v:'english',     ar:'إنجليزي', en:'English'     },
    { v:'general',     ar:'عام',     en:'General'     },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:720, margin:'0 auto', width:'100%', padding:'20px' }}>
      <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>
        📸 {isAr ? 'تصحيح الواجب بالـ AI' : 'AI Homework Correction'}
      </h3>

      {/* Upload / Preview area */}
      <div
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFile(e.dataTransfer.files[0]); }}
        style={{ border:'2px dashed var(--border)', borderRadius:16, padding: preview ? 0 : 40,
          textAlign:'center', cursor:'pointer', background:'var(--surface2)',
          transition:'border-color 0.2s', ...(preview ? { border:'none' } : {}) }}
      >
        {preview ? (
          <img src={preview} alt="homework" style={{ width:'100%', borderRadius:14, maxHeight:400, objectFit:'contain' }} />
        ) : (
          <>
            <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
            <p style={{ color:'var(--text3)', fontSize:14 }}>
              {isAr ? 'اسحب الصورة هنا أو اضغط للرفع' : 'Drag image here or click to upload'}
            </p>
          </>
        )}
      </div>

      {/* Camera / Upload button row */}
      <div style={{ display:'flex', gap:12 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={takePhoto}
          style={{ flex:1, padding:'14px', borderRadius:14, border:'2px dashed var(--border)',
            background:'var(--surface2)', cursor:'pointer', fontSize:14, fontWeight:700,
            color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
        >
          {Capacitor.isNativePlatform()
            ? (isAr ? '📷 صوّر الواجب' : '📷 Take Photo')
            : (isAr ? '📁 ارفع صورة'   : '📁 Upload Image')}
        </motion.button>

        {preview && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setImg(null); setPreview(null); setResult(null); haptic.light(); }}
            style={{ padding:'14px 18px', borderRadius:14, border:'1px solid var(--border)',
              background:'transparent', cursor:'pointer', color:'var(--danger)', fontSize:18 }}
          >
            🗑️
          </motion.button>
        )}
      </div>

      {/* Hidden file input for web */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
        onChange={e => handleFile(e.target.files[0])} />

      {/* Options */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        <select value={subject} onChange={e => setSubject(e.target.value)}
          style={{ flex:1, padding:'10px 14px', borderRadius:12, border:'1px solid var(--border)',
            background:'var(--surface)', color:'var(--text)', fontSize:13 }}>
          {SUBJECTS.map(s => <option key={s.v} value={s.v}>{isAr ? s.ar : s.en}</option>)}
        </select>
        <input value={grade} onChange={e => setGrade(e.target.value)}
          placeholder={isAr ? 'الصف (مثال: الثاني الثانوي)' : 'Grade'}
          style={{ flex:1, padding:'10px 14px', borderRadius:12, border:'1px solid var(--border)',
            background:'var(--surface)', color:'var(--text)', fontSize:13 }} />
      </div>

      <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} onClick={handleSubmit}
        disabled={!img || mutation.isPending}
        style={{ padding:'14px 28px', borderRadius:14, border:'none', cursor:'pointer', fontWeight:800, fontSize:15,
          background: img ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'var(--surface3)',
          color: img ? '#fff' : 'var(--text4)' }}>
        {mutation.isPending
          ? (isAr ? '⏳ جاري التصحيح...' : '⏳ Correcting...')
          : (isAr ? '✨ صحّح الواجب' : '✨ Correct Homework')}
      </motion.button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="glass-panel" style={{ padding:24, borderRadius:16, background:'var(--surface2)', border:'1px solid var(--border)' }}>
            <h4 style={{ fontSize:15, fontWeight:800, marginBottom:16 }}>
              📋 {isAr ? 'نتيجة التصحيح' : 'Correction Result'}
            </h4>
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(
              result.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>')
            )}} style={{ fontSize:14, lineHeight:1.8, color:'var(--text)' }} />
            <button onClick={() => { setImg(null); setPreview(null); setResult(null); haptic.light(); }}
              style={{ marginTop:16, fontSize:13, color:'var(--text3)', background:'none', border:'1px solid var(--border)',
                borderRadius:8, padding:'6px 14px', cursor:'pointer' }}>
              {isAr ? '🔄 تصحيح واجب آخر' : '🔄 Correct Another'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
