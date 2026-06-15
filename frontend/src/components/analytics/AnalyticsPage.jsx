// src/components/analytics/AnalyticsPage.jsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { analyticsAPI, quizAPI } from '../../api/index';
import { Card, SectionHeader, ProgressBar, Spinner, EmptyState } from '../shared/UI';
import { useTranslation } from '../../i18n/index';

export default function AnalyticsPage() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const { data, isLoading } = useQuery({ queryKey:['analytics'], queryFn:analyticsAPI.dashboard });
  const { data: streak }    = useQuery({ queryKey:['streak'], queryFn:analyticsAPI.streakHistory });
  const { data: qStats }    = useQuery({ queryKey:['quiz-stats'], queryFn:quizAPI.stats });

  const d        = data?.data  || {};
  const streakDays = streak?.data?.history || [];
  const quizStats  = qStats?.data?.stats   || [];

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:64, minHeight: '60vh', alignItems: 'center'}}><Spinner size="lg"/></div>;

  return (
    <div className="animate-fade-up" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      <SectionHeader 
        icon="📊" 
        title={isAr ? "تحليلات الأداء" : "Performance Analytics"} 
        subtitle={isAr ? "استخدم البيانات لتحسين مسار تعلمك وإتقان موادك." : "Harness data to optimize your learning trajectory and master your subjects."} 
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: 24, marginBottom: 32 }}>
        <div className="floating-panel" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-head)', marginBottom: 20 }}>{isAr ? 'إتقان المعرفة' : 'Knowledge Mastery'}</h3>
          {!(d.subjectBreakdown?.length) ? <EmptyState icon="📖" title={isAr ? "في انتظار البيانات" : "Awaiting Data"} subtitle={isAr ? "أكمل جلسات الدراسة لبدء تعيين المواد." : "Complete study sessions to begin subject mapping."} /> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {d.subjectBreakdown.map((s,i) => {
                const maxMins = Math.max(...d.subjectBreakdown.map(x=>Number(x.total_mins)),1);
                const colors = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--accent)', 'var(--accent2)'];
                const SUBJECTS_LOC = {
                  mathematics: isAr ? 'الرياضيات' : 'Mathematics',
                  science: isAr ? 'العلوم' : 'Science',
                  arabic: isAr ? 'اللغة العربية' : 'Arabic',
                  english: isAr ? 'اللغة الإنجليزية' : 'English',
                  social_studies: isAr ? 'الدراسات الاجتماعية' : 'Social Studies',
                  physics: isAr ? 'الفيزياء' : 'Physics',
                  chemistry: isAr ? 'الكيمياء' : 'Chemistry',
                  biology: isAr ? 'الأحياء' : 'Biology',
                };
                return (
                  <div key={s.subject}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                      <span style={{ textTransform:'capitalize', fontWeight:800, color: 'var(--text)' }}>{SUBJECTS_LOC[s.subject] || s.subject.replace('_',' ')}</span>
                      <span style={{ color:'var(--text3)', fontWeight: 700 }}>
                        {Math.round(Number(s.total_mins)/60)}h {isAr ? 'ساعة دراسة' : 'Studied'} · {s.completed} {isAr ? 'مهام' : 'Tasks'}
                      </span>
                    </div>
                    <ProgressBar value={Number(s.total_mins)} max={maxMins} color={colors[i%colors.length]} height={10} />
                  </div>
                );
              })}
            </div>
          }
        </div>

        <div className="floating-panel" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-head)', marginBottom: 20 }}>{isAr ? 'التقييمات المعرفية' : 'Cognitive Assessments'}</h3>
          {!quizStats.length ? <EmptyState icon="📝" title={isAr ? "لا توجد تقييمات بعد" : "No Assessments Yet"} subtitle={isAr ? "خذ اختبارًا في المساعد الذكي لقياس تقدمك." : "Take a quiz in the AI Assistant to measure your progress."} /> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {quizStats.map((q,i) => (
                <motion.div key={q.subject} 
                  whileHover={{ scale: 1.02 }}
                  className="floating-card" 
                  style={{ 
                    display:'flex', alignItems:'center', gap:16, padding:'16px 20px', 
                    marginBottom: 10
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'var(--surface3)' }}>
                    {SUBJ_ICON[q.subject] || '📝'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:800, textTransform:'capitalize', color: 'var(--text)' }}>
                      {[
                        { id: 'mathematics', label: isAr ? 'الرياضيات' : 'Mathematics' },
                        { id: 'science', label: isAr ? 'العلوم' : 'Science' },
                        { id: 'arabic', label: isAr ? 'اللغة العربية' : 'Arabic' },
                        { id: 'english', label: isAr ? 'اللغة الإنجليزية' : 'English' },
                        { id: 'social_studies', label: isAr ? 'الدراسات الاجتماعية' : 'Social Studies' },
                        { id: 'physics', label: isAr ? 'الفيزياء' : 'Physics' },
                        { id: 'chemistry', label: isAr ? 'الكيمياء' : 'Chemistry' },
                        { id: 'biology', label: isAr ? 'الأحياء' : 'Biology' },
                      ].find(x => x.id === q.subject)?.label || q.subject.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text4)', marginTop: 2, fontWeight: 600 }}>{q.attempts} {isAr ? 'محاولات' : 'attempts'} · {q.perfect} {isAr ? 'درجات كاملة' : 'perfect scores'}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div className="neon-text" style={{ fontSize:22, fontWeight:900, fontFamily:'var(--font-head)',
                      color: q.avg_score>=80?'var(--success)':q.avg_score>=60?'var(--primary)':'#ef4444' }}>{q.avg_score}%</div>
                    <div style={{ fontSize:10, color:'var(--text4)', fontWeight: 800, textTransform: 'uppercase' }}>{isAr ? 'متوسط الدرجات' : 'Avg Score'}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          }
        </div>
      </div>

      <div className="floating-panel" style={{ marginBottom: 32, padding: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-head)', marginBottom: 24 }}>{isAr ? 'سرعة التعلم' : 'Learning Velocity'}</h3>
        {!d.weeklyActivity?.length ? <EmptyState icon="📅" title={isAr ? "لا يوجد نشاط حديث" : "No recent activity"} /> : (
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', height:160, padding: '0 10px' }}>
            {d.weeklyActivity.map((day, idx) => {
              const maxM = Math.max(...d.weeklyActivity.map(x=>Number(x.minutes)),1);
              const h = Math.max(12, Math.round((Number(day.minutes)/maxM)*140));
              return (
                <div key={day.date || idx} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                  <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                    whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                    style={{ 
                      width:'100%', height: h, background: idx === 6 ? 'var(--accent2)' : 'linear-gradient(to top, var(--primary), var(--brand-400))', 
                      borderRadius: 8, transformOrigin: 'bottom',
                      boxShadow: idx === 6 ? '0 0 15px rgba(244, 63, 94, 0.4)' : 'none'
                    }} 
                  />
                  <div style={{ fontSize:11, fontWeight: 800, color: idx === 6 ? 'var(--text)' : 'var(--text4)' }}>{day.date?.toString().slice(5, 10)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-head)' }}>{isAr ? 'خريطة تفاني الدراسة' : 'Study Dedication Heatmap'}</h3>
          <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text3)', fontWeight: 600 }}>
            {[['var(--surface3)', isAr ? 'لا يوجد' : 'NONE'],['var(--primary)', isAr ? 'درس' : 'STUDIED'],['var(--accent2)', isAr ? 'نخبة' : 'ELITE']].map(([c,l])=>(
              <span key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:10, height:10, borderRadius:2, background:c, display:'inline-block' }} />{l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {(() => {
            const now = new Date();
            return Array.from({ length: 140 }).map((_, i) => {
              const date = new Date(now);
              date.setDate(date.getDate() - (139 - i));
              const dateStr = date.toISOString().split('T')[0];
              const dayData = streakDays.find(s => s.date?.toString().split('T')[0] === dateStr);
              const count = Number(dayData?.sessions || 0);
              
              return (
                <motion.div key={`${dateStr}-${i}`} 
                  title={`${dateStr}: ${count} ${isAr ? 'جلسات' : 'sessions'}`}
                  whileHover={{ scale: 1.25, zIndex: 10 }}
                  style={{ 
                    width:16, height:16, borderRadius:4,
                    background: count >= 3 ? 'var(--accent2)' : count >= 1 ? 'var(--primary)' : 'var(--surface3)',
                    opacity: count >= 1 ? 1 : 0.2,
                    cursor: 'pointer',
                    boxShadow: count >= 3 ? '0 0 10px rgba(244, 63, 94, 0.4)' : 'none'
                  }} 
                />
              );
            });
          })()}
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
          {isAr ? 'تصور تفانيك على مدار 140 يومًا الماضية. حافظ على الشعلة حية! 🔥' : 'Visualizing your dedication over the last 140 days. Keep the flame alive! 🔥'}
        </p>
      </Card>
    </div>
  );
}

const SUBJ_ICON  = { 
  mathematics:'📐', 
  science:'🔬', 
  arabic:'📚', 
  english:'🌐', 
  social_studies:'🌍',
  physics: '⚡',
  chemistry: '⚗️',
  biology: '🧬'
};
