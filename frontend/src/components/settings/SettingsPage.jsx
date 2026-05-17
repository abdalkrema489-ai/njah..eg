// src/components/settings/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { usersAPI } from '../../api/index';
import { useUIStore, useAuthStore } from '../../context/store';
import { Card, Btn, Input, SectionHeader, Divider } from '../shared/UI';
import { useTranslation } from '../../i18n/index';
import { haptic } from '../../utils/haptics';

/* ── SVG Icons ───────────────────────────────────────────── */
const PaintBrushIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const ShieldAlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M12 8v4M12 16h.01"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const BrainIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4 4.5 4.5 0 0 1-3-4"/>
  </svg>
);

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};
const itemAnim = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16,1,0.3,1] } }
};

export default function SettingsPage() {
  const { darkMode, toggleDark, language, setLanguage } = useUIStore();
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm();
  
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCfm, setShowCfm] = useState(false);

  // Preferred AI State
  const { user, setUser } = useAuthStore();
  const [aiProvider, setAiProvider] = useState('auto');
  
  // Wait for user to load
  useEffect(() => {
    if (user?.preferred_ai_provider) setAiProvider(user.preferred_ai_provider);
  }, [user]);

  const { mutate: changePwd, isSuccess: saved } = useMutation({
    mutationFn: usersAPI.changePassword,
    onSuccess: () => { toast.success('Password updated successfully!'); haptic.light(); reset(); },
    onError:   (err) => toast.error(err.response?.data?.error || 'Current password incorrect'),
  });

  const onPwdSubmit = d => {
    if (d.newPassword !== d.confirmPassword) { toast.error('Passwords do not match'); return; }
    changePwd({ currentPassword: d.currentPassword, newPassword: d.newPassword });
  };

  const updateAI = async (e) => {
    const val = e.target.value;
    setAiProvider(val);
    try {
      await usersAPI.updateProfile({ preferred_ai_provider: val });
      if (setUser) setUser({ ...user, preferred_ai_provider: val });
      toast.success(isAr ? 'تم تحديث مزود الذكاء الاصطناعي' : 'AI Provider updated');
      haptic.light();
    } catch {
      toast.error(isAr ? 'فشل التحديث' : 'Update failed');
    }
  };

  const newPwd = watch('newPassword', '');

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{ maxWidth: 840, margin: '0 auto' }}>
      
      <SectionHeader 
        icon={<PaintBrushIcon />} 
        title={isAr ? 'الإعدادات' : 'Settings'} 
        subtitle={isAr ? 'إدارة تفضيلات المنصة والأمان' : 'Manage your platform preferences and security'}
        gradient 
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Appearance & Language */}
        <motion.div variants={itemAnim}>
          <div className="floating-panel" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(124,58,237,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                <PaintBrushIcon />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 950, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', color: 'var(--text)', textTransform: 'uppercase' }}>
                {isAr ? 'المظهر واللغة' : 'Appearance & Language'}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* 3-way Theme selector */}
              <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', fontFamily: 'var(--font-head)', marginBottom: 12 }}>
                  {isAr ? 'وضع العرض' : 'Display Mode'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 16, fontWeight: 500 }}>
                  {isAr ? 'اختر بين الوضع الفاتح والداكن أو اتبع إعداد الجهاز' : 'Choose light, dark, or follow your device setting'}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'light',  icon: '☀️', ar: 'فاتح',       en: 'Light'  },
                    { value: 'dark',   icon: '🌙', ar: 'داكن',       en: 'Dark'   },
                    { value: 'system', icon: '🖥️', ar: 'تبع الجهاز', en: 'System' },
                  ].map(t => {
                    const saved = localStorage.getItem('najah-theme') || 'system';
                    const isSelected = saved === t.value || (!saved && t.value === 'system');
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => {
                          localStorage.setItem('najah-theme', t.value);
                          if (t.value === 'system') {
                            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                            toggleDark(isDark);
                          } else {
                            toggleDark(t.value === 'dark');
                          }
                        }}
                        style={{
                          flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                          fontSize: 13, fontWeight: 700, textAlign: 'center',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(99,102,241,0.1)' : 'var(--surface2)',
                          color: isSelected ? 'var(--primary)' : 'var(--text3)',
                          transition: 'all 0.2s',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{t.icon}</span>
                        <span>{isAr ? t.ar : t.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{isAr ? 'اللغة العربية (RTL)' : 'Arabic Language (RTL)'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text4)', marginTop: 4, fontWeight: 500 }}>{isAr ? 'تحويل الواجهة إلى اتجاه من اليمين لليسار' : 'Switch the interface to right-to-left layout'}</div>
                </div>
                <Toggle checked={language === 'ar'} onChange={() => setLanguage(language === 'ar' ? 'en' : 'ar')} />
              </div>
            </div>

          </div>
        </motion.div>

        {/* AI Preferences */}
        <motion.div variants={itemAnim}>
          <div className="floating-panel" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(236,72,153,0.12)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                <BrainIcon />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 950, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', color: 'var(--text)', textTransform: 'uppercase' }}>
                {isAr ? 'إعدادات الذكاء الاصطناعي' : 'AI Preferences'}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{isAr ? 'محرك الذكاء المفضل' : 'Preferred AI Engine'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text4)', marginTop: 4, fontWeight: 500 }}>{isAr ? 'اختر المحرك الذي تفضله للاستفسارات العامة' : 'Choose your preferred engine for general queries'}</div>
                </div>
                <select value={aiProvider} onChange={updateAI} style={{
                  padding: '10px 16px', borderRadius: 12, background: 'var(--surface3)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 14, fontWeight: 700, outline: 'none', cursor: 'pointer'
                }}>
                  <option value="auto">✨ Auto (Gemini)</option>
                  <option value="gemini">♊ Google Gemini (Pro/Flash)</option>
                  <option value="claude">🤖 Anthropic Claude</option>
                  <option value="ollama">⚡ Local AI (Ollama)</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security & Password */}
        <motion.div variants={itemAnim}>
          <div className="floating-panel" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(6,182,212,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                <LockIcon />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 950, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', color: 'var(--text)', textTransform: 'uppercase' }}>
                {isAr ? 'الأمان وكلمة المرور' : 'Security & Password'}
              </h3>
            </div>

            <form onSubmit={handleSubmit(onPwdSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Input 
                label={isAr ? 'كلمة المرور الحالية' : 'Current Password'} type={showCur ? 'text' : 'password'} 
                icon={<LockIcon />} placeholder={isAr ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                rightIcon={showCur ? <EyeOffIcon /> : <EyeIcon />}
                onRightIconClick={() => setShowCur(v => !v)}
                {...register('currentPassword', { required: 'Required' })} 
                error={errors.currentPassword?.message} 
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                <div>
                  <Input 
                    label={isAr ? 'كلمة المرور الجديدة' : 'New Password'} type={showNew ? 'text' : 'password'} 
                    icon={<ShieldAlertIcon />} placeholder={isAr ? 'حد أدنى 8 حروف' : 'Minimum 8 characters'}
                    rightIcon={showNew ? <EyeOffIcon /> : <EyeIcon />}
                    onRightIconClick={() => setShowNew(v => !v)}
                    error={errors.newPassword?.message}
                    {...register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} 
                  />
                  <PasswordStrengthBar password={newPwd} isAr={isAr} />
                </div>
                <Input 
                  label={isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'} type={showCfm ? 'text' : 'password'} 
                  icon={<ShieldAlertIcon />} placeholder={isAr ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                  rightIcon={showCfm ? <EyeOffIcon /> : <EyeIcon />}
                  onRightIconClick={() => setShowCfm(v => !v)}
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', {
                    required: 'Required',
                    validate: v => v === newPwd || 'Keys mismatch'
                  })} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <Btn type="submit" variant="primary" loading={isSubmitting} style={{ height: 52, padding: '0 32px', borderRadius: 14, fontWeight: 900, letterSpacing: '0.02em' }}>
                  {saved ? (isAr ? 'تم التحديث ✓' : 'Updated ✓') : (isAr ? 'تحديث كلمة المرور' : 'Update Password')}
                </Btn>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={itemAnim}>
          <div className="floating-panel" style={{ 
            padding: 32,
            border: '1px solid rgba(239,68,68,0.3)', 
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, transparent 100%)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                <ShieldAlertIcon />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 950, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', color: 'var(--danger)', textTransform: 'uppercase' }}>
                {isAr ? 'منطقة الخطر' : 'Danger Zone'}
              </h3>
            </div>
            
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28, lineHeight: 1.7, fontWeight: 500 }}>
              {isAr 
                ? <>حذف الحساب هو <strong style={{ color: 'var(--danger)' }}>إجراء لا يمكن التراجع عنه</strong>. سيتم حذف جميع بياناتك ورسائلك وملفاتك نهائياً.</>
                : <>Deleting your account is an <strong style={{ color: 'var(--danger)' }}>irreversible action</strong>. All your data, messages, and files will be permanently removed.</>
              }
            </p>
            
            <Btn variant="danger" style={{ height: 52, padding: '0 32px', fontWeight: 900, letterSpacing: '0.02em' }}
              onClick={() => { 
                if (window.confirm(isAr ? 'هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete your account? This cannot be undone.')) {
                  toast.error(isAr ? 'يرجى التواصل مع الدعم: support@najah.edu.eg' : 'Please contact support: support@najah.edu.eg'); 
                }
              }}>
              {isAr ? 'حذف الحساب نهائياً' : 'Delete Account Permanently'}
            </Btn>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

/* ── Password Strength Bar ───────────────────────────────── */
function PasswordStrengthBar({ password, isAr }) {
  if (!password) return null;
  const checks = [
    /.{8,}/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const colors   = ['#EF4444', '#F59E0B', '#10B981', '#6366F1'];
  const labelsAr = ['ضعيفة', 'مقبولة', 'جيدة', 'قوية جداً'];
  const labelsEn = ['Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 4,
            background: i <= strength ? colors[strength - 1] : 'var(--surface3)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      {strength > 0 && (
        <p style={{ fontSize: 11, fontWeight: 700, color: colors[strength - 1], margin: 0 }}>
          {isAr ? labelsAr[strength - 1] : labelsEn[strength - 1]}
        </p>
      )}
    </div>
  );
}

/* ── Custom Toggle Switch ──────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <motion.button
      type="button"
      onClick={onChange}
      style={{
        width: 50, height: 26, borderRadius: 13,
        background: checked ? 'var(--primary)' : 'var(--surface3)',
        border: '1px solid',
        borderColor: checked ? 'var(--primary)' : 'var(--border2)',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex', alignItems: 'center',
        transition: 'background 0.3s, border-color 0.3s',
        flexShrink: 0
      }}
    >
      <motion.div
        layout
        initial={false}
        animate={{ 
          x: checked ? 24 : 2,
          boxShadow: checked ? '0 2px 5px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: 20, height: 20,
          borderRadius: 10,
          background: '#fff',
        }}
      />
    </motion.button>
  );
}
