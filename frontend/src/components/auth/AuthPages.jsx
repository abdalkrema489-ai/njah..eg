// src/components/auth/AuthPages.jsx — Najah v6 — Split Role Auth
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/index';
import { useAuthStore, useUIStore } from '../../context/store';
import { Btn, Input, Spinner, Divider } from '../shared/UI';
import { useTranslation } from '../../i18n/index';
import { useBiometric } from '../../hooks/useBiometric';
import { haptic } from '../../utils/haptics';

const STUDENT_GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Prep 1', 'Prep 2', 'Prep 3', 'Sec 1', 'Sec 2', 'Sec 3',
];

const UNI_YEARS = [
  { value: 'Year 1', ar: 'الفرقة الأولى',   en: '1st Year' },
  { value: 'Year 2', ar: 'الفرقة الثانية',  en: '2nd Year' },
  { value: 'Year 3', ar: 'الفرقة الثالثة', en: '3rd Year' },
  { value: 'Year 4', ar: 'الفرقة الرابعة',  en: '4th Year' },
  { value: 'Year 5', ar: 'الفرقة الخامسة', en: '5th Year' },
  { value: 'Year 6', ar: 'الفرقة السادسة', en: '6th Year' },
  { value: 'Postgrad', ar: 'دراسات عليا',  en: 'Postgraduate' },
];

const UNI_FACULTIES = [
  { ar: 'الطب البشري',       en: 'Medicine' },
  { ar: 'طب الأسنان',        en: 'Dentistry' },
  { ar: 'الصيدلة',           en: 'Pharmacy' },
  { ar: 'الهندسة',           en: 'Engineering' },
  { ar: 'علوم الحاسب',      en: 'Computer Science' },
  { ar: 'الاقتصاد والتجارة', en: 'Commerce & Economics' },
  { ar: 'الحقوق',            en: 'Law' },
  { ar: 'التربية',           en: 'Education' },
  { ar: 'الفنون',             en: 'Fine Arts' },
  { ar: 'العلوم',             en: 'Sciences' },
  { ar: 'الآداب',            en: 'Arts & Humanities' },
  { ar: 'أخرى',              en: 'Other' },
];


const TEACHER_SUBJECTS = [
  'Mathematics', 'Science', 'Arabic', 'English', 'Physics',
  'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science',
  'Art', 'Physical Education', 'Philosophy', 'Economics',
];

/* ── SVG Icons ───────────────────────────────────────────── */
const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/* ── Dynamic Logo ────────────────────────────────────────── */
const LogoMark = ({ role = 'student' }) => {
  return (
    <img 
      src="/images/najah-logo.jpeg" 
      alt="Najah Logo" 
      style={{ width: 44, height: 44, borderRadius: 14, objectFit: 'cover' }} 
    />
  );
};

/* ── Password Strength Meter ────────────────────────────── */
function PasswordStrength({ password = '' }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const colors = ['', '#EF4444', '#F59E0B', '#10B981', '#6366F1'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colors[score] : 'var(--border)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: colors[score], transition: 'color 0.3s' }}>
        {labels[score]}
      </div>
    </div>
  );
}

function AuthScene() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', background: '#0f172a' }}>
      {/* Single static background image */}
      <img
        src="/images/najah-bg-1.jpeg"
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          filter: 'brightness(0.45) saturate(1.2)',
        }}
      />
      {/* Premium gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(135deg, rgba(15,23,42,0.75) 0%, rgba(49,46,129,0.5) 50%, rgba(15,23,42,0.82) 100%)',
      }} />
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06, zIndex: 2,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
    </div>
  );
}

/* ── Split Layout ────────────────────────────────────────── */
function AuthLayout({ children, wide = false, role = 'student', setRole }) {
  const isTeacher = role === 'teacher';
  const { darkMode, toggleDark, language, setLanguage } = useUIStore();
  const { t } = useTranslation();
  const isAr = language === 'ar';

  return (
    <div style={{ minHeight: '100vh', minHeight: '100dvh', display: 'flex', position: 'relative', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <AuthScene role={role} />

      {/* Floating Preferences */}
      <div style={{ position: 'absolute', top: 24, left: language === 'ar' ? 'auto' : 24, right: language === 'ar' ? 24 : 'auto', zIndex: 10, display: 'flex', gap: 12 }}>
        <button
          onClick={toggleDark}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
          title={language === 'ar' ? 'تبديل المظهر' : 'Toggle Theme'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
          title={language === 'ar' ? 'English' : 'عربي'}
        >
          {language === 'en' ? 'AR' : 'EN'}
        </button>
      </div>

      {/* Left panel — Role Specific Showcase */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px', position: 'relative', zIndex: 1,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(15,23,42,0.5) 100%)',
        backdropFilter: 'blur(12px)',
        transition: 'background 0.4s ease'
      }} className="auth-left-panel">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 50 }}>
            <LogoMark role={role} />
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', color: 'var(--text)' }}>Najah</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {isTeacher ? (isAr ? 'بوابة المعلم' : 'Teacher Portal') : (isAr ? 'بوابة الطالب' : 'Student Portal')}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={role} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <h1 style={{
                fontFamily: 'var(--font-head)', fontSize: 44, fontWeight: 800,
                letterSpacing: '-0.04em', lineHeight: 1.12, marginBottom: 20,
                background: isTeacher
                  ? 'linear-gradient(135deg, var(--text) 30%, #06B6D4 100%)'
                  : 'linear-gradient(135deg, var(--text) 30%, #818CF8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {isTeacher ? <>{isAr ? 'مكّن' : 'Empower Your'} {isAr ? 'طلابك.' : 'Students.'}</> : <>{isAr ? 'تعلم بذكاء،' : 'Learn Smarter,'} {isAr ? 'حقق المزيد.' : 'Achieve More.'}</>}
              </h1>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, maxWidth: 400, marginBottom: 40 }}>
                {isTeacher
                  ? (isAr ? "منصة إدارة الفصل الشاملة. تتبع تقدم الطلاب، استضف اختبارات تفاعلية، واستفد من الذكاء الاصطناعي لتخطيط الدروس بسهولة." : "The complete classroom management platform. Track student progress, host interactive quizzes, and leverage AI to plan lessons effortlessly.")
                  : (isAr ? "المنصة الشاملة المدعومة بالذكاء الاصطناعي للطلاب المصريين — أدوات دراسية، امتحانات، محادثات فورية، وتحليلات شخصية." : "The all-in-one AI-powered platform built for Egyptian students — study tools, exams, real-time chat, and personalized analytics.")}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(isTeacher ? [
                  { icon: '📊', label: isAr ? 'تحليلات الفصل' : 'Class Analytics', desc: isAr ? 'راقب التقدم فوراً' : 'Monitor progress instantly' },
                  { icon: '🧠', label: isAr ? 'مخطط دروس ذكي' : 'AI Lesson Planner', desc: isAr ? 'أنشئ خطط دراسية في ثوانٍ' : 'Create study plans in seconds' },
                  { icon: '📝', label: isAr ? 'اختبارات تلقائية' : 'Automated Quizzes', desc: isAr ? 'أنشئ وصحح الأسئلة بسهولة' : 'Generate & grade MCQ easily' },
                ] : [
                  { icon: '🤖', label: isAr ? 'معلم ذكي' : 'AI Tutor', desc: isAr ? 'خبير في المناهج المصرية' : 'Egyptian curriculum expert' },
                  { icon: '📅', label: isAr ? 'مخطط ذكي' : 'Smart Planner', desc: isAr ? 'جداول دراسية مخصصة' : 'Personalized study schedules' },
                  { icon: '💬', label: isAr ? 'المجتمع' : 'Community', desc: isAr ? 'محادثات جماعية وخاصة فورية' : 'Real-time group & private chat' },
                ]).map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11,
                      background: isTeacher ? 'rgba(99,102,241,0.12)' : 'rgba(129,140,248,0.12)',
                      border: '1px solid',
                      borderColor: isTeacher ? 'rgba(99,102,241,0.25)' : 'rgba(129,140,248,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {f.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Campus photo strip */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>{isAr ? 'حرمنا الجامعي' : 'Our Campus'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 5, 8, 10].map(n => (
                <div key={n} style={{ flex: 1, height: 66, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <img src={`/images/najah-bg-${n}.jpeg`} alt="campus" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.85) saturate(1.1)' }} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right panel — Form */}
      <div style={{
        width: wide ? '55%' : '520px', maxWidth: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative', zIndex: 2, margin: '0 auto',
      }}>
        {/* Top Role Switcher (Mobile & Desktop) */}
        {!setRole ? null : (
          <div style={{
            display: 'flex', background: 'var(--surface2)', padding: 4, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 32, width: '100%', maxWidth: 360
          }}>
            {['student', 'university', 'teacher'].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '10px', fontSize: 13, fontWeight: 700, borderRadius: 8,
                background: role === r ? (r === 'teacher' ? 'var(--teacher)' : r === 'university' ? '#10B981' : 'var(--student)') : 'transparent',
                color: role === r ? '#fff' : 'var(--text3)',
                textTransform: 'capitalize', transition: 'all 0.2s', boxShadow: role === r ? 'var(--shadow-sm)' : 'none'
              }}>
                {r === 'teacher' ? (isAr ? '👨‍🏫 معلم' : '👨‍🏫 Teacher') : r === 'university' ? (isAr ? '🎓 جامعي' : '🎓 University') : (isAr ? '🎒 طالب' : '🎒 Student')}
              </button>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 440 }}
        >
          {children}
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 960px) {
          .auth-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Google icon ─────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/* ────────────────────────────────────────────────────────
   LoginPage
   ──────────────────────────────────────────────────────── */
export function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState('student');
  const [pwdValue, setPwdValue] = useState('');
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useUIStore();
  const isAr = language === 'ar';

  const { isBiometricAvailable, loginWithBiometric, enableBiometric } = useBiometric();
  const [biometricAvail, setBiometricAvail] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvail);
  }, [isBiometricAvailable]);

  const onSubmit = async d => {
    try {
      const { data } = await authAPI.login({ ...d, role });
      setAuth(data);
      toast.success('Welcome back! 👋');

      const biometricEnabled = localStorage.getItem('biometric_enabled');
      if (!biometricEnabled && await isBiometricAvailable()) {
        const enable = window.confirm(
          isAr
            ? 'هل تريد تفعيل تسجيل الدخول بالبصمة في المرات القادمة؟'
            : 'Enable biometric login for next time?'
        );
        if (enable) {
          await enableBiometric({ email: d.email });
          haptic.success();
        }
      }

      // BUG #3 FIX: redirect back to original destination
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to sign in. Check your credentials.');
    }
  };

  const accentColor = role === 'teacher' ? '#4F46E5' : '#6366F1';

  return (
    <AuthLayout role={role} setRole={setRole}>
      {/* Themed form card to fix text contrast */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 24, padding: '36px 32px',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <LogoMark role={role} />
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Najah</div>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', marginTop: 14, marginBottom: 6, color: 'var(--text)' }}>
            {isAr ? 'مرحباً بعودتك' : 'Welcome Back'} {role === 'teacher' ? (isAr ? 'أستاذ' : 'Professor') : ''}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text3)' }}>{isAr ? 'سجل دخولك للمتابعة إلى لوحة التحكم' : 'Sign in to continue to your dashboard'}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label={isAr ? "البريد الإلكتروني" : "Email Address"} type="email" icon={<MailIcon />}
            placeholder={role === 'teacher' ? "professor@university.edu" : "student@email.com"}
            error={errors.email?.message}
            {...register('email', { required: isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required', pattern: { value: /\S+@\S+/, message: isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email' } })}
          />
          <div>
            <Input
              label={isAr ? "كلمة المرور" : "Password"} type={showPwd ? 'text' : 'password'} icon={<LockIcon />} placeholder="••••••••"
              error={errors.password?.message}
              rightIcon={showPwd ? <EyeOff /> : <EyeOpen />}
              onRightIconClick={() => setShowPwd(v => !v)}
              {...register('password', { required: isAr ? 'كلمة المرور مطلوبة' : 'Password is required', onChange: e => setPwdValue(e.target.value) })}
            />
          </div>

          <div style={{ textAlign: isAr ? 'left' : 'right', marginTop: -8 }}>
            <Link to="/forgot-password" style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </Link>
          </div>

          {biometricAvail && localStorage.getItem('biometric_enabled') === 'true' && (
            <motion.button
              type="button"
              whileTap={{ scale:0.95 }}
              onClick={async () => {
                haptic.medium();
                const email = await loginWithBiometric();
                if (email) {
                  setValue('email', email);
                  toast.success(isAr ? '✅ تم التحقق بالبصمة' : '✅ Biometric verified');
                  haptic.success();
                } else {
                  haptic.error();
                }
              }}
              style={{
                width:'100%', padding:'14px', borderRadius:14, marginBottom:12, marginTop:8,
                border:'1px solid var(--border)', background:'var(--surface2)',
                cursor:'pointer', fontSize:15, fontWeight:700, color:'var(--text)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:12,
              }}
            >
              🔐 {isAr ? 'تسجيل الدخول بالبصمة' : 'Login with Biometrics'}
            </motion.button>
          )}

          <Btn type="submit" loading={isSubmitting} size="lg"
            style={{ width: '100%', marginTop: 4, borderRadius: 12, background: `linear-gradient(135deg, ${accentColor}, #8B5CF6)`, color: '#fff', border: 'none', boxShadow: `0 4px 20px ${accentColor}55` }}>
            {isAr ? 'تسجيل الدخول ←' : 'Sign In →'}
          </Btn>
        </form>

        <Divider label={isAr ? "أو المتابعة باستخدام" : "or continue with"} margin={24} />

        <motion.button onClick={() => authAPI.googleLogin()}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          style={{ width: '100%', padding: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <GoogleIcon /> {isAr ? 'المتابعة باستخدام جوجل' : 'Continue with Google'}
        </motion.button>

        {role === 'student' && (
          <motion.button onClick={async () => {
            try {
              const { data } = await authAPI.guestRegister();
              setAuth(data);
              navigate('/');
            } catch { toast.error(isAr ? 'حدث خطأ' : 'Error starting guest session'); }
          }}
            style={{ width: '100%', marginTop: 12, padding: '12px', background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {isAr ? 'المتابعة كزائر' : 'Continue as Guest'}
          </motion.button>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
        {isAr ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
        <Link to="/register" style={{ color: '#C7D2FE', fontWeight: 700 }}>
          {isAr ? 'إنشاء حساب ←' : 'Create account →'}
        </Link>
      </p>
    </AuthLayout>
  );
}

/* ────────────────────────────────────────────────────────
   RegisterPage
   ──────────────────────────────────────────────────────── */
export function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState('student');
  const [grade, setGrade] = useState('');
  const [faculty, setFaculty] = useState('');
  const [uniName, setUniName] = useState('');
  const [instType, setInstType] = useState('school');
  const [subjects, setSubjects] = useState([]);
  const [pwdValue, setPwdValue] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const { language } = useUIStore();
  const isAr = language === 'ar';

  const toggleSubject = s => setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const onSubmit = async d => {
    if (role === 'student' && !grade) { toast.error(isAr ? 'يرجى اختيار المرحلة الدراسية' : 'Please select your grade level'); return; }
    if (role === 'university' && !grade) { toast.error(isAr ? 'يرجى اختيار السنة الدراسية' : 'Please select your year of study'); return; }
    if (role === 'teacher' && subjects.length === 0) { toast.error(isAr ? 'يرجى اختيار مادة واحدة على الأقل' : 'Please select at least one subject'); return; }
    try {
      const payload = {
        ...d, role,
        institutionType: role === 'university' ? 'university' : role === 'student' ? 'school' : instType,
        grade: (role === 'student' || role === 'university') ? grade : undefined,
        faculty: role === 'university' ? (faculty || undefined) : undefined,
        universityName: role === 'university' ? (uniName || undefined) : undefined,
        subjects: role === 'teacher' ? subjects.join(',') : undefined,
      };
      const { data } = await authAPI.register(payload);
      setAuth(data);
      toast.success(
        role === 'teacher'    ? (isAr ? 'أهلاً بك يا أستاذ! 🎉' : 'Welcome, Professor! 🎉') :
        role === 'university' ? (isAr ? 'أهلاً بك في مجتمع الجامعيين! 🎓' : 'Welcome to the university community! 🎓') :
                                (isAr ? 'رحلة تعلمك تبدأ الآن! 🚀' : 'Your learning journey begins! 🚀')
      );
      navigate('/');
    } catch (err) { toast.error(err.response?.data?.error || (isAr ? 'تعذر التسجيل' : 'Unable to register')); }
  };


  return (
    <AuthLayout role={role} setRole={setRole}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '36px 32px', boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', marginBottom: 5, color: 'var(--text)' }}>
            {isAr ? 'انضم إلى نجاح 🚀' : 'Join Najah 🚀'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>{isAr ? `سجل لتجربة ${role === 'teacher' ? 'المعلم' : 'الطالب'} كاملة` : `Register to unlock the full ${role} experience`}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label={isAr ? "الاسم الكامل" : "Full Name"} required icon={<UserIcon />} placeholder={role === 'teacher' ? (isAr ? 'اسمك الكامل (مثال: أ. أحمد)' : 'Your full name (e.g. Mr. Ahmed)') : (isAr ? 'اسمك الكامل' : 'Your full name')} {...register('name', { required: true })} />
          <Input label={isAr ? "البريد الإلكتروني" : "Email Address"} type="email" required icon={<MailIcon />} placeholder="your@email.com" {...register('email', { required: true })} />
          <div>
            <Input label={isAr ? "كلمة المرور" : "Password"} type={showPwd ? 'text' : 'password'} required icon={<LockIcon />} placeholder={isAr ? "8 أحرف كحد أدنى" : "Minimum 8 chars"} rightIcon={showPwd ? <EyeOff /> : <EyeOpen />} onRightIconClick={() => setShowPwd(v => !v)} {...register('password', { required: true, minLength: 8, onChange: e => setPwdValue(e.target.value) })} />
            <PasswordStrength password={pwdValue} />
          </div>

          {role === 'teacher' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isAr ? "نوع المؤسسة *" : "Institution Type *"}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ value: 'school', icon: '🏫', label: isAr ? 'مدرسة' : 'School (K-12)' }, { value: 'university', icon: '🎓', label: isAr ? 'جامعة / كلية' : 'University / College' }].map(opt => (
                  <button type="button" key={opt.value} onClick={() => setInstType(opt.value)} style={{
                    flex: 1, padding: '12px 14px', fontSize: 13, fontWeight: 700, borderRadius: 12, cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                    background: instType === opt.value
                      ? (opt.value === 'university' ? 'rgba(14,165,233,0.15)' : 'rgba(16,185,129,0.15)')
                      : 'transparent',
                    color: instType === opt.value
                      ? (opt.value === 'university' ? '#38BDF8' : '#10b981')
                      : 'var(--text3)',
                    border: `1.5px solid ${instType === opt.value
                      ? (opt.value === 'university' ? 'rgba(14,165,233,0.4)' : 'rgba(16,185,129,0.4)')
                      : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: instType === opt.value ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  }}>
                    <span style={{ fontSize: 18 }}>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {role === 'student' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{isAr ? "المرحلة الدراسية *" : "Current Grade *"}</label>
              <select value={grade} onChange={e => setGrade(e.target.value)} required style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, padding: 10, color: 'var(--text)', outline: 'none' }}>
                <option value="">{isAr ? "اختر مرحلتك..." : "Select your grade..."}</option>
                {STUDENT_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}

          {role === 'university' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'var(--surface2)', borderRadius: 16, border: '1.5px solid rgba(16,185,129,0.25)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', marginBottom: -4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎓 {isAr ? 'معلومات جامعية' : 'University Details'}</div>
              
              {/* Year selector — pill buttons */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>{isAr ? 'السنة الدراسية *' : 'Year of Study *'}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {UNI_YEARS.map(y => (
                    <button type="button" key={y.value} onClick={() => setGrade(y.value)} style={{
                      padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s',
                      background: grade === y.value ? 'rgba(16,185,129,0.18)' : 'var(--surface)',
                      color: grade === y.value ? '#10B981' : 'var(--text3)',
                      border: `1.5px solid ${grade === y.value ? '#10B981' : 'var(--border)'}`,
                    }}>{isAr ? y.ar : y.en}</button>
                  ))}
                </div>
              </div>

              {/* Faculty selector */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>{isAr ? 'الكلية / التخصص' : 'Faculty / Major'}</label>
                <select value={faculty} onChange={e => setFaculty(e.target.value)} style={{ width: '100%', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', outline: 'none', fontSize: 13 }}>
                  <option value="">{isAr ? 'اختر كليتك...' : 'Select your faculty...'}</option>
                  {UNI_FACULTIES.map(f => <option key={f.en} value={f.en}>{isAr ? f.ar : f.en}</option>)}
                </select>
              </div>

              {/* University Name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>{isAr ? 'اسم الجامعة' : 'University Name'}</label>
                <input value={uniName} onChange={e => setUniName(e.target.value)} placeholder={isAr ? 'مثال: جامعة القاهرة' : 'e.g. Cairo University'} style={{ width: '100%', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', outline: 'none', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          {role === 'teacher' && (
            <div style={{ padding: '16px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 12 }}>{isAr ? "أنا أُدرّس... (اختر كل ما ينطبق) *" : "I teach... (Select all that apply) *"}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TEACHER_SUBJECTS.map(s => (
                  <button type="button" key={s} onClick={() => toggleSubject(s)} style={{
                    padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s',
                    background: subjects.includes(s) ? 'var(--teacher)' : 'transparent',
                    color: subjects.includes(s) ? '#fff' : 'var(--text3)', border: `1px solid ${subjects.includes(s) ? 'var(--teacher)' : 'var(--border)'}`
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Btn type="submit" loading={isSubmitting} size="lg" style={{ marginTop: 8, borderRadius: 12, background: role === 'teacher' ? 'var(--teacher)' : 'var(--student)', color: '#fff', border: 'none' }}>
            {isAr ? 'إنشاء حساب' : 'Create Account'}
          </Btn>
        </form>
      </div>

      <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: 'var(--text3)' }}>
        {isAr ? 'هل لديك حساب بالفعل؟' : 'Already have an account?'} {' '}
        <Link to="/login" style={{ color: role === 'teacher' ? 'var(--teacher)' : 'var(--student)', fontWeight: 700 }}>
          {isAr ? 'تسجيل الدخول ←' : 'Sign in →'}
        </Link>
      </p>
    </AuthLayout>
  );
}

/* ────────────────────────────────────────────────────────
   Fallback standard components (Forgot/Reset PW)
   ──────────────────────────────────────────────────────── */
export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const [sent, setSent] = useState(false);
  const { language } = useUIStore();
  const isAr = language === 'ar';

  const onSubmit = async d => {
    try {
      setSent(true); // Immediate UI feedback
      await authAPI.forgotPassword(d.email);
      toast.success(isAr ? 'تم إرسال رابط إعادة الضبط! تحقق من بريدك الوارد.' : 'Reset link sent! Check your inbox.');
    } catch (e) {
      // Keep sent true for security, but allow retry if user wants
      console.error(e);
    }
  };

  if (sent) {
    return (
      <AuthLayout role="student" setRole={null}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📧</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--text)' }}>{isAr ? 'تحقق من بريدك الإلكتروني' : 'Check Your Email'}</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text3)', marginBottom: 28, lineHeight: 1.7 }}>
            {isAr ? 'إذا كان هذا البريد الإلكتروني مسجلاً، فستتلقى رابط إعادة تعيين كلمة المرور خلال بضع دقائق.' : "If this email is registered, you'll receive a password reset link within a few minutes."}
          </p>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>{isAr ? '← العودة إلى تسجيل الدخول' : '← Back to Sign In'}</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout role="student" setRole={null}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '36px 32px', boxShadow: 'var(--shadow-xl)',
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, textAlign: 'center', color: 'var(--text)' }}>{isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 24 }}>{isAr ? 'أدخل عنوان بريدك الإلكتروني لتلقي رابط الاسترداد.' : 'Enter your email address to receive a recovery link.'}</p>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label={isAr ? "البريد الإلكتروني" : "Email Address"} type="email" icon={<MailIcon />} placeholder="your@email.com" {...register('email', { required: isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required', pattern: { value: /\S+@\S+/, message: isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email' } })} />
          <Btn type="submit" loading={isSubmitting} variant="primary" size="lg" style={{ borderRadius: 12 }}>{isAr ? 'إرسال رابط إعادة الضبط ←' : 'Send Reset Link →'}</Btn>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20 }}><Link to="/login" style={{ fontSize: 13, color: 'var(--text3)' }}>{isAr ? '← العودة إلى تسجيل الدخول' : '← Back to login'}</Link></div>
      </div>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [searchParams] = useSearchParams();
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token') || window.location.pathname.split('/reset-password/')[1];
  const { language } = useUIStore();
  const isAr = language === 'ar';

  const onSubmit = async d => {
    if (d.password !== d.confirmPassword) { toast.error(isAr ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'); return; }
    try {
      await authAPI.resetPassword({ token, password: d.password });
      toast.success(isAr ? 'تم إعادة تعيين كلمة المرور بنجاح! يرجى تسجيل الدخول.' : 'Password reset successfully! Please sign in.');
      navigate('/login');
    } catch (e) {
      toast.error(e.response?.data?.error || (isAr ? 'انتهت صلاحية رابط الاسترداد. يرجى طلب رابط جديد.' : 'Reset link expired. Please request a new one.'));
    }
  };

  return (
    <AuthLayout role="student" setRole={null}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '36px 32px', boxShadow: 'var(--shadow-xl)',
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, textAlign: 'center', color: 'var(--text)' }}>{isAr ? 'تعيين كلمة مرور جديدة' : 'Set New Password'}</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 24 }}>{isAr ? 'اختر كلمة مرور قوية لحسابك.' : 'Choose a strong password for your account.'}</p>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label={isAr ? "كلمة المرور الجديدة" : "New Password"} type={showPwd ? 'text' : 'password'} icon={<LockIcon />} placeholder={isAr ? "8 أحرف كحد أدنى" : "Minimum 8 characters"}
            error={errors.password?.message}
            rightIcon={showPwd ? <EyeOff /> : <EyeOpen />}
            onRightIconClick={() => setShowPwd(v => !v)}
            {...register('password', { required: isAr ? 'كلمة المرور مطلوبة' : 'Password is required', minLength: { value: 8, message: isAr ? '8 أحرف كحد أدنى' : 'Minimum 8 characters' } })} />
          <Input label={isAr ? "تأكيد كلمة المرور" : "Confirm Password"} type={showPwd ? 'text' : 'password'} icon={<LockIcon />} placeholder={isAr ? "أعد كتابة كلمة المرور" : "Repeat your password"}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', { required: isAr ? 'يرجى تأكيد كلمة المرور' : 'Please confirm your password' })} />
          <Btn type="submit" loading={isSubmitting} variant="primary" size="lg" style={{ borderRadius: 12 }}>{isAr ? 'إعادة تعيين كلمة المرور ←' : 'Reset Password →'}</Btn>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20 }}><Link to="/login" style={{ fontSize: 13, color: 'var(--text3)' }}>{isAr ? '← العودة إلى تسجيل الدخول' : '← Back to login'}</Link></div>
      </div>
    </AuthLayout>
  );
}
export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const { language } = useUIStore();
  const isAr = language === 'ar';

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      toast.error(isAr ? 'فشلت المصادقة. لم يتم توفير رمز.' : 'Authentication failed. No code provided.');
      navigate('/login');
      return;
    }

    // Exchange the short-lived one-time code for real tokens (secure: no tokens in URL)
    authAPI.exchangeCode(code)
      .then(async ({ data }) => {
        const { token, refresh } = data;
        localStorage.setItem('token', token);
        if (refresh) localStorage.setItem('refresh', refresh);

        // Fetch full user profile
        const { data: meData } = await authAPI.me();
        setAuth({ user: meData.user, token, refresh });
        toast.success(isAr ? 'تم تسجيل الدخول بنجاح عبر جوجل!' : 'Successfully logged in with Google!');
        navigate('/');
      })
      .catch(err => {
        console.error('[AuthCallback] Code exchange failed:', err);
        toast.error(isAr ? 'تعذر استرداد بيانات الجلسة.' : 'Session exchange failed. Please try again.');
        navigate('/login');
      });
  }, []);

  return (
    <AuthLayout role="student" setRole={null}>
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Spinner size="lg" />
        <h3 style={{ marginTop: 24, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
          {isAr ? 'جاري المصادقة مع جوجل' : 'Authenticating with Google'}
        </h3>
        <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text3)' }}>
          {isAr ? 'يرجى الانتظار بينما نقوم بتسجيل دخولك بأمان...' : 'Please wait while we log you in securely...'}
        </p>
      </div>
    </AuthLayout>
  );
}
