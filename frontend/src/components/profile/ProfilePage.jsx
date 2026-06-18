// src/components/profile/ProfilePage.jsx — Professional v3
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { usersAPI, achievementsAPI } from '../../api/index';
import { useAuthStore } from '../../context/store';
import { Card, Button, Input, Select, Avatar, ProgressBar, Spinner, SectionHeader } from '../shared/UI';
import { useTranslation } from '../../i18n/index';

const GRADES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Prep 1','Prep 2','Prep 3','Sec 1','Sec 2','Sec 3'];
const LANGUAGES = [{ value:'en', label:'English' },{ value:'ar', label:'العربية' }];

/* ── SVG Icons ───────────────────────────────────────────── */
const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const StatIcons = {
  Sessions: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Knowledge: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  Archives: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Medals: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
};

/* ── Animation Config ────────────────────────────────────── */
const stagger = {
  hidden: {}, visible: { transition: { staggerChildren: 0.1 } }
};
const itemAnim = {
  hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16,1,0.3,1] } }
};

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const qc = useQueryClient();

  const { data: profileData, isLoading: loadingProfile } = useQuery({ queryKey:['profile'], queryFn:usersAPI.getProfile });
  const { data: achData }     = useQuery({ queryKey:['achievements'], queryFn:achievementsAPI.list });

  const profile  = profileData?.data?.profile || user;
  const earned   = (achData?.data?.achievements || []).filter(a => a.earned);
  const xpNext   = profile?.level * 500;
  const xpPct    = Math.min(100, (profile?.xp_points / xpNext) * 100) || 0;

  const { register, handleSubmit, formState:{isSubmitting}, reset } = useForm();

  const onSubmit = data => updateProfile(data);

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        grade: profile.grade,
        school: profile.school,
        language: profile.language,
        bio: profile.bio,
        dob: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
        phone: profile.phone || '',
        social_links: JSON.stringify(profile.social_links || {}, null, 2),
      });
    }
  }, [profile, reset]);

  const { mutate: updateProfile } = useMutation({
    mutationFn: (data) => {
      let parsedSocial = {};
      try { parsedSocial = JSON.parse(data.social_links || '{}'); } catch { parsedSocial = {}; }
      return usersAPI.updateProfile({ ...data, social_links: parsedSocial });
    },
    onSuccess: ({ data }) => { 
      setUser({ ...user, ...data.user }); 
      qc.invalidateQueries(['profile']); 
      toast.success('Profile updated successfully!'); 
    },
  });

  const { mutate: uploadAvatar } = useMutation({
    mutationFn: usersAPI.uploadAvatar,
    onSuccess: ({ data }) => { setUser({ ...user, avatar_url: data.avatarUrl }); toast.success('Profile picture updated!'); },
    onError:   (err) => toast.error(err.response?.data?.error || 'Upload failed'),
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] },
    maxSize: 5*1024*1024, maxFiles: 1,
    onDrop: ([file]) => file && uploadAvatar(file),
  });

  if (loadingProfile) return <div style={{ display:'flex', justifyContent:'center', padding:100 }}><Spinner size="lg" /></div>;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{ maxWidth: 1080, margin: '0 auto' }}>
      <SectionHeader 
        icon={<UserIcon />} 
        title={isAr ? 'الملف الشخصي' : 'My Profile'} 
        subtitle={isAr ? 'إدارة بياناتك الشخصية والأكاديمية' : 'Manage your personal and academic details'} 
        gradient
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 32, alignItems: 'start' }}>
        {/* Left: Identity Card */}
        <motion.div variants={itemAnim} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="floating-panel" style={{ padding: 'clamp(20px, 5vw, 48px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.1, pointerEvents: 'none' }} />
            
            <div {...getRootProps()} style={{ cursor:'pointer', display:'inline-block', marginBottom:32 }}>
              <input {...getInputProps()} />
              <div style={{ position:'relative', display:'inline-block' }}>
                <Avatar src={profile?.avatar_url} name={profile?.name} size={140} ring />
                <motion.div 
                  whileHover={{ scale: 1.1, backgroundColor: 'var(--primary)' }}
                  style={{ position:'absolute', bottom:4, right:4, width:44, height:44, borderRadius:'50%',
                    background:'var(--surface3)', border:'3px solid var(--surface)', color: 'var(--text)',
                    display:'flex', alignItems:'center', justifyContent:'center', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', transition: 'all 0.2s' }}>
                  <CameraIcon />
                </motion.div>
              </div>
            </div>

            <h2 style={{ fontSize:28, fontWeight:950, fontFamily:'var(--font-head)', color:'var(--text)', marginBottom:6, letterSpacing: '-0.04em' }}>
              {profile?.name}
            </h2>
            <div style={{ fontSize:14, color:'var(--text4)', fontWeight:800, marginBottom:28, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {profile?.email}
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginBottom:20 }}>
              {/* Primary Role Badge */}
              {(() => {
                const roleMap = {
                  teacher: {
                    label: isAr ? '👨‍🏫 معلم' : '👨‍🏫 Teacher',
                    color: '#818CF8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)'
                  },
                  university: {
                    label: isAr ? '🎓 طالب جامعي' : '🎓 University Student',
                    color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)'
                  },
                  admin: {
                    label: isAr ? '⚙️ مشرف' : '⚙️ Admin',
                    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)'
                  },
                };
                const cfg = roleMap[profile?.role] || { label: isAr ? '🎒 طالب' : '🎒 School Student', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)' };
                return (
                  <div style={{ padding: '8px 20px', borderRadius: 24, fontSize: 13, fontWeight: 900, color: cfg.color, background: cfg.bg, border: `1.5px solid ${cfg.border}`, letterSpacing: '0.03em' }}>
                    {cfg.label}
                  </div>
                );
              })()}
            </div>

            {/* Role-specific info chips */}
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginBottom:32 }}>
              {profile?.role === 'university' && profile?.faculty && (
                <div style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  🏛️ {profile.faculty}
                </div>
              )}
              {profile?.role === 'university' && profile?.universityName && (
                <div style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  🎓 {profile.universityName}
                </div>
              )}
              {(profile?.grade) && (
                <div style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  📚 {profile.grade}
                </div>
              )}
              {profile?.role === 'teacher' && profile?.subjects && (
                <div style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#818CF8', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  📖 {Array.isArray(profile.subjects) ? profile.subjects.join(', ') : profile.subjects}
                </div>
              )}
              <div style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                🏅 {isAr ? 'مستوى' : 'Level'} {profile?.level || 1}
              </div>
              <div style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                🔥 {profile?.streak_days || 0} {isAr ? 'يوم متواصل' : 'day streak'}
              </div>
            </div>

            <div style={{ marginBottom:40, textAlign: 'left' }}>
              <div style={{ marginBottom:10, fontSize:12, fontWeight:900, color:'var(--text4)', display:'flex', justifyContent:'space-between', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                <span>{isAr ? 'تقدم المستوى' : 'Level Progress'}</span>
                <span style={{ color: 'var(--primary)' }}>{Math.round(xpPct)}%</span>
              </div>
              <ProgressBar value={xpPct} max={100} color="var(--primary)" height={12} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: 'var(--text4)', fontWeight: 800, letterSpacing: '0.05em' }}>
                <span>{isAr ? `المستوى ${profile?.level}` : `LVL ${profile?.level}`}</span>
                <span>{xpNext - (profile?.xp_points || 0)} {isAr ? 'XP للمستوى التالي' : 'XP TO NEXT LEVEL'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label:'Sessions', val: profile?.sessions_done, key: 'Sessions', color: 'var(--primary)' },
                { label:'Knowledge', val: profile?.files_count, key: 'Knowledge', color: '#10b981' },
                { label:'Archives', val: profile?.notes_count, key: 'Archives', color: '#f59e0b' },
                { label:'Medals', val: profile?.ach_count, key: 'Medals', color: '#ec4899' },
              ].map(s=>(
                <div key={s.label} className="floating-card" style={{ padding: '20px 14px', borderRadius: 20 }}>
                  <div style={{ color: s.color, marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{StatIcons[s.key]}</div>
                  <div style={{ fontSize: 24, fontWeight: 950, color: 'var(--text)', fontFamily: 'var(--font-head)', letterSpacing: '-0.02em' }}>{s.val||0}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements Ribbon */}
          {earned.length > 0 && (
            <div className="floating-panel" style={{ padding: 28, borderRadius: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <span>Neural Merits</span>
                <motion.span 
                  whileHover={{ x: 4 }}
                  style={{ color: 'var(--primary)', fontSize: 11, cursor: 'pointer', fontWeight: 900 }}>ALL MARKERS →</motion.span>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                {earned.map(a => (
                  <motion.div 
                    key={a.id} whileHover={{ y: -6, scale: 1.1, rotate: 5 }}
                    title={a.name}
                    className="floating-card"
                    style={{ 
                      minWidth: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, cursor: 'help'
                    }}>
                    {a.icon}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: Configuration Form */}
        <motion.div variants={itemAnim} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="floating-panel" style={{ padding: 40, borderRadius: 28 }}>
            <h3 style={{ fontWeight:950, fontSize:22, color:'var(--text)', marginBottom:32, borderLeft: '4px solid var(--primary)', paddingLeft: 18, letterSpacing: '-0.04em', fontFamily: 'var(--font-head)' }}>
              {isAr ? 'المعلومات الشخصية' : 'Personal Information'}
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column', gap:28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 20 }}>
                <Input label={isAr ? 'الاسم الكامل' : 'Full Name'} {...register('name', { required:"Name is required" })} />
                <Input label={isAr ? 'تاريخ الميلاد' : 'Date of Birth'} type="date" {...register('dob')} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 20 }}>
                <Input label={isAr ? 'رقم الهاتف' : 'Phone Number'} placeholder="+20..." {...register('phone')} />
                <Select label={isAr ? 'الصف الدراسي' : 'Academic Grade'} {...register('grade')}>
                  {GRADES.map(g=><option key={g} value={g}>{g.toUpperCase()}</option>)}
                </Select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 20 }}>
                <Input label={isAr ? 'المدرسة / الجامعة' : 'School / University'} placeholder={isAr ? 'اسم المؤسسة...' : 'Institution name...'} {...register('school')} />
                <Select label={isAr ? 'اللغة' : 'Language'} {...register('language')}>
                  {LANGUAGES.map(l=><option key={l.value} value={l.value}>{l.label.toUpperCase()}</option>)}
                </Select>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:900, color:'var(--text4)', display:'flex', gap: 4, marginBottom:10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isAr ? 'نبذة شخصية' : 'Bio'}</label>
                <textarea {...register('bio')} placeholder={isAr ? 'اكتب نبذة عن نفسك...' : 'Tell us about yourself...'}
                  style={{ width:'100%', minHeight:140, padding:'18px 24px', fontSize:15, borderRadius:18, resize:'vertical',
                    background:'var(--surface2)', border:'1.5px solid var(--border)', color:'var(--text)', fontWeight: 500,
                    outline: 'none', transition: 'all 0.22s var(--ease)', fontFamily: 'inherit', lineHeight: 1.7 }} 
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = 'var(--surface3)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--surface2)'; }}
                />
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:900, color:'var(--text4)', display:'block', marginBottom:10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isAr ? 'روابط التواصل الاجتماعي (JSON)' : 'Social Links (JSON)'}</label>
                <Input placeholder='{"github": "...", "linkedin": "..."}' {...register('social_links')} />
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="primary" loading={isSubmitting} size="lg" style={{ height: 56, padding: '0 40px', borderRadius: 18, fontSize: 16, fontWeight: 900, letterSpacing: '0.02em', boxShadow: '0 12px 32px rgba(99,102,241,0.3)' }}>
                  {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>

          {/* Account Security Insight */}
          <div className="floating-panel" style={{ padding: 'clamp(16px, 4vw, 36px)', borderRadius: 24, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 20, border: '1px solid rgba(16,185,129,0.25)', background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, transparent 100%)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(16,185,129,0.2)' }}>
              <ShieldIcon />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-head)', letterSpacing: '-0.01em' }}>
                {isAr ? 'حسابك محمي' : 'Your Account is Protected'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text4)', lineHeight: 1.6, fontWeight: 500 }}>
                {isAr 
                  ? 'بياناتك محمية بتشفير متعدد الطبقات. معلوماتك الشخصية خاصة ولا يتم مشاركتها إلا بإذنك.'
                  : 'Your data is protected with multi-layer encryption. Personal information remains private and is only shared with your explicit permission.'
                }
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
