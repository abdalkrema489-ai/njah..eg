// src/components/focus/FocusPage.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { usersAPI } from '../../api/index';
import { Card, Btn, Select, SectionHeader } from '../shared/UI';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n/index';

export default function FocusPage() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  const MODES = {
    focus: { label: isAr ? 'تركيز'         : 'Focus',       min: 25, color: 'var(--primary)' },
    short: { label: isAr ? 'استراحة قصيرة' : 'Short Break', min: 5,  color: 'var(--accent2)' },
    long:  { label: isAr ? 'استراحة طويلة' : 'Long Break',  min: 15, color: 'var(--accent)'  },
  };

  const TIPS = isAr ? [
    'اعمل متركز 25 دقيقة، ثم استرح 5 دقائق',
    'بعد 4 جلسات، خد استراحة طويلة 15-30 دقيقة',
    'بعّد كل المشتتات قبل ما تبدأ',
    'احتفظ بورقة لكتابة الأفكار التي بتيجي وسط المذاكرة',
    'اشرب مية في وقت الاستراحة',
  ] : [
    'Work focused for 25 min, then rest 5 min',
    'After 4 pomodoros, take a 15–30 min break',
    'Remove all distractions before starting',
    'Keep a notepad for interrupting thoughts',
    'Drink water during your breaks',
  ];

  const [mode,    setMode]   = useState('focus');
  const [secs,    setSecs]   = useState(25*60);
  const [running, setRunning]= useState(false);
  const [subject, setSubject]= useState('mathematics');
  const [done,    setDone]   = useState(0);
  const intv = useRef(null);
const SUBJECTS = ['mathematics','science','arabic','english','social_studies'];
const S_ICONS  = { mathematics:'📐',science:'🔬',arabic:'📚',english:'🌐',social_studies:'🌍' };



  const maxSecs = MODES[mode].min * 60;
  const pct     = secs / maxSecs;
  const circ    = 2 * Math.PI * 88;

  const reset = (m=mode) => { clearInterval(intv.current); setRunning(false); setSecs(MODES[m].min*60); };
  const switchMode = m => { setMode(m); reset(m); };

  const toggle = () => {
    if (running) { clearInterval(intv.current); setRunning(false); return; }
    setRunning(true);
    intv.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(intv.current);
          setRunning(false);
          if (mode === 'focus') {
            setDone(d => d+1);
            usersAPI.recordPomodoro({ type:'focus', duration:25, subject, completed:true }).catch(()=>{});
            toast.success(isAr ? '🍅 بومودورو مكتمل! خذ استراحة!' : '🍅 Pomodoro complete! Take a break!');
            if (Notification.permission==='granted') new Notification('Najah',{body: isAr ? 'انتهت البومودورو! خذ استراحة.' : 'Pomodoro done! Take a break.'});
          } else {
            toast.success(isAr ? '☕ انتهت الاستراحة! وقت التركيز!' : '☕ Break over! Time to focus!');
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => { Notification.requestPermission?.(); return ()=>clearInterval(intv.current); }, []);

  const mm = String(Math.floor(secs/60)).padStart(2,'0');
  const ss = String(secs%60).padStart(2,'0');
  const modeColor = MODES[mode].color;

  // (bilingual TIPS defined above)

  return (
    <div>
      <SectionHeader icon="⏱️" title={isAr ? 'وضع التركيز' : 'Focus Mode'} subtitle={isAr ? 'مؤقت بومودورو للمذاكرة العميقة بدون تشتت' : 'Pomodoro timer for deep, distraction-free study'} />

      <div className="grid-2" style={{ gap:24 }}>
        <div className="floating-panel" style={{ textAlign:'center', padding:'48px 32px' }}>
          {/* Mode switcher */}
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:40 }}>
            {Object.entries(MODES).map(([k,v])=>(
              <motion.button key={k} onClick={()=>switchMode(k)} 
                whileHover={{scale:1.06, y: -2}} whileTap={{scale:0.95}}
                style={{ 
                  padding:'10px 22px', borderRadius:24, fontSize:13, fontWeight:900,
                  border:'none', cursor:'pointer', transition:'all 0.22s var(--ease)', fontFamily:'var(--font-head)',
                  background: mode===k ? v.color : 'rgba(255,255,255,0.04)',
                  boxShadow: mode===k ? `0 8px 24px ${v.color}40` : 'none',
                  color: mode===k ? '#fff' : 'var(--text4)',
                  letterSpacing: '0.02em'
                }}>{v.label.toUpperCase()}</motion.button>
            ))}
          </div>

          {/* SVG ring */}
          <div style={{ position:'relative', width:220, height:220, margin:'0 auto 36px' }}>
            <svg width="220" height="220" style={{ transform:'rotate(-90deg)' }}>
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12"/>
              <circle cx="110" cy="110" r="95" fill="none"
                stroke={modeColor} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 95} strokeDashoffset={(2 * Math.PI * 95)*(1-pct)}
                filter="url(#glow)"
                style={{ transition:'stroke-dashoffset 1s linear, stroke 0.4s' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center' }}>
              <motion.div 
                animate={{ scale: running ? [1, 1.02, 1] : 1 }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ fontSize:56, fontWeight:950, fontFamily:'var(--font-head)',
                fontVariantNumeric:'tabular-nums', color:modeColor, letterSpacing: '-0.04em' }}>{mm}:{ss}</motion.div>
              <div style={{ fontSize:12, color:'var(--text4)', fontWeight: 800, marginTop:4, letterSpacing: '0.15em' }}>{MODES[mode].label.toUpperCase()}</div>
            </div>
          </div>

          <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:32 }}>
            <Btn variant="primary" size="lg" onClick={toggle}
              style={{ background:modeColor, borderColor: 'transparent', minWidth:160, height: 56, fontSize: 16, fontWeight: 900, boxShadow: `0 12px 32px ${modeColor}40` }}>
              {running ? (isAr ? '⏸ إيقاف مؤقت' : '⏸ PAUSE') : (isAr ? '▶ ابدأ التركيز' : '▶ START FOCUS')}
            </Btn>
            <Btn size="lg" variant="glass" onClick={()=>reset()} style={{ height: 56, fontWeight: 900 }}>{isAr ? '↺ إعادة' : '↺ RESET'}</Btn>
          </div>

          {/* Pomodoro dots */}
          <div style={{ display:'flex', gap:8, justifyContent:'center', alignItems: 'center' }}>
            {[0,1,2,3].map(i=>(
              <motion.div key={i} 
                animate={{ scale: i < done%4 ? 1.2 : 1 }}
                style={{ width:12, height:12, borderRadius:'50%',
                  background: i<done%4 ? modeColor : 'rgba(255,255,255,0.05)',
                  boxShadow: i<done%4 ? `0 0 10px ${modeColor}` : 'none'
                }} />
            ))}
            <span style={{ fontSize:12, color:'var(--text4)', fontWeight: 800, marginLeft:12, letterSpacing: '0.05em' }}>
              {isAr ? `${done} جلسة مكتملة` : `${done} COMPLETED TODAY`}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="floating-panel" style={{ padding: 24 }}>
            <div style={{ fontWeight:900, marginBottom:20, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>{isAr ? '📊 الأداء' : '📊 Neural Performance'}</div>
            <div className="grid-2" style={{ gap:12 }}>
              {[
                { label: isAr ? 'بومودورو' : 'Pomodoros', value:done, icon:'🍅', color: 'var(--primary)' },
                { label: isAr ? 'وقت التركيز' : 'Focus Time', value:`${done*25}m`, icon:'⏱️', color: 'var(--brand-400)' },
              ].map(s=>(
                <div key={s.label} className="floating-card" style={{ padding:16, textAlign:'center', borderRadius: 16 }}>
                  <div style={{ fontSize:32, fontWeight:950, fontFamily:'var(--font-head)', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'var(--text4)', fontWeight: 800, marginTop: 4 }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="floating-panel" style={{ padding: 24 }}>
            <div style={{ fontWeight:900, marginBottom:16, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>{isAr ? '🎯 المادة' : '🎯 Session Core'}</div>
            <Select label={isAr ? 'المادة' : 'Focus Subject'} value={subject} onChange={e=>setSubject(e.target.value)}>
              {SUBJECTS.map(s=><option key={s} value={s}>{S_ICONS[s]} {s.replace('_',' ').toUpperCase()}</option>)}
            </Select>
          </div>

          <div className="floating-panel" style={{ padding: 24 }}>
            <div style={{ fontWeight:900, marginBottom:16, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>{isAr ? '💡 بروتوكول التركيز' : '💡 Focus Protocol'}</div>
            {TIPS.map((tip,i)=>(
              <div key={i} style={{ fontSize:13, color:'var(--text2)', padding:'10px 0', fontWeight: 500,
                borderBottom: i<TIPS.length-1?'1px solid var(--border)':'' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 900, marginRight: 8 }}>{i+1}.</span> {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
