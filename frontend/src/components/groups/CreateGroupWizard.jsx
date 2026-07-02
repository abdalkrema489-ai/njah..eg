import { useState, useEffect } from 'react';
import { groupsAPI } from '../../api/index';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/index';
import { SCHOOL_CURRICULUM, UNIVERSITY_CURRICULUM } from '../../data/egyptianCurriculum';
import toast from 'react-hot-toast';
import { useDraftStore } from '../../context/store';
import PaidGroupActivationModal from './PaidGroupActivationModal';

const GROUP_TYPES = [
  { id: 'school_class',   icon: '🏫', colorHex: '#6366f1', bgHex: 'rgba(99,102,241,0.08)', borderHex: 'rgba(99,102,241,0.25)' },
  { id: 'university_course', icon: '🎓', colorHex: '#6366f1', bgHex: 'rgba(99,102,241,0.08)', borderHex: 'rgba(99,102,241,0.25)' },
  { id: 'private_tutoring',  icon: '👨‍🏫', colorHex: '#f59e0b', bgHex: 'rgba(245,158,11,0.08)', borderHex: 'rgba(245,158,11,0.25)' },
  { id: 'study_circle',   icon: '📚', colorHex: '#10b981', bgHex: 'rgba(16,185,129,0.08)', borderHex: 'rgba(16,185,129,0.25)' },
];

const COVER_COLORS = [
  'linear-gradient(135deg,#6366f1,#818cf8)',
  'linear-gradient(135deg,#6366f1,#a5b4fc)',
  'linear-gradient(135deg,#f59e0b,#fcd34d)',
  'linear-gradient(135deg,#10b981,#6ee7b7)',
  'linear-gradient(135deg,#ef4444,#fca5a5)',
  'linear-gradient(135deg,#8b5cf6,#c4b5fd)',
];

const allGrades = [
  ...SCHOOL_CURRICULUM.primary.grades,
  ...SCHOOL_CURRICULUM.preparatory.grades,
  ...SCHOOL_CURRICULUM.secondary.grades,
];

const STEPS = [
  { id: 1, icon: '🗂️' },
  { id: 2, icon: '✏️' },
  { id: 3, icon: '⚙️' },
  { id: 4, icon: '📖' },
  { id: 5, icon: '🔗' },
];

export default function CreateGroupWizard({ onClose, onCreated }) {
  const { t, lang } = useTranslation();
  const navigate     = useNavigate();
  const { groupWizardDraft, setGroupWizardDraft, clearGroupWizardDraft } = useDraftStore();

  const [step, setStep] = useState(() => groupWizardDraft?.step || 1);
  const [loading, setLoading] = useState(false);
  // Paid-group activation modal state
  const [activationData, setActivationData] = useState(null); // { group, listingFee, platformFeePercent }

  const [form, setForm] = useState(() => groupWizardDraft?.form || {
    groupType:   '',
    name:        '',
    subject:     '',
    gradeId:     '',
    facultyId:   '',
    deptId:      '',
    description: '',
    coverGrad:   COVER_COLORS[0],
    capacity:    30,
    enrollment:  'open',
    isPaid:      false,
    price:       '',
    curriculumLinked: null,
    joinCode:    Math.random().toString(36).slice(2,8).toUpperCase(),
  });

  useEffect(() => {
    setGroupWizardDraft({ step, form });
  }, [step, form, setGroupWizardDraft]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const canAdvance = () => {
    if (step === 1) return !!form.groupType;
    if (step === 2) return form.name.length > 2 && form.subject;
    if (step === 3) return true;
    return true;
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const payload = {
        name: form.name,
        subject: form.subject,
        grade: form.gradeId || 'General',
        institutionType: form.groupType.includes('school') ? 'school' : 'college',
        description: form.description,
        maxStudents: form.capacity,
        privacy: form.enrollment === 'open' ? 'public' : 'private',
        schedule: [],
        isPaid: form.isPaid,
        price: form.isPaid ? Number(form.price) : 0,
        curriculumLinked: form.curriculumLinked ? form.curriculumLinked.unit : null,
      };

      const { data } = await groupsAPI.create(payload);

      clearGroupWizardDraft();

      if (data.requiresPayment) {
        // Don't close wizard — show the activation payment modal instead
        setActivationData({
          group: data.group,
          listingFee: data.listingFee,
          platformFeePercent: data.platformFeePercent,
        });
      } else {
        toast.success(lang === 'ar' ? '✅ تم إنشاء المجموعة بنجاح!' : '✅ Group created!');
        if (onCreated) onCreated(data.group);
        if (onClose) onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(lang === 'ar' ? '❌ فشل إنشاء المجموعة' : '❌ Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = GROUP_TYPES.find(t => t.id === form.groupType);

  const typeLabel = (id) => {
    const map = { school_class:'schoolClass', university_course:'uniCourse', private_tutoring:'privateTutor', study_circle:'studyCircle' };
    return t(`groups.createGroup.${map[id]}`);
  };

  // ── Subjects from selected grade
  const gradeSubjects = form.gradeId ? (allGrades.find(g => g.grade === +form.gradeId)?.subjects || []) : [];

  return (
    <>
    <div style={{
      position: 'fixed', inset: 0, zIndex: 800,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, direction: lang === 'ar' ? 'rtl' : 'ltr',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.3, ease: [0.22,1,0.36,1] }}
        style={{
          background: 'var(--surface)', borderRadius: 24,
          width: '100%', maxWidth: 640,
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border)',
          overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* ── Top bar ── */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
              {t('groups.createGroup.title')}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>
              {lang === 'ar' ? `خطوة ${step} من ${STEPS.length}` : `Step ${step} of ${STEPS.length}`}
            </p>
          </div>
          {/* Steps bar */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {STEPS.map(s => (
              <div key={s.id} style={{
                width: s.id === step ? 32 : 24,
                height: 8, borderRadius: 99,
                background: s.id < step ? 'var(--success)' : s.id === step ? 'var(--primary)' : 'var(--surface4)',
                transition: 'all 0.35s',
              }} />
            ))}
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--surface3)', border: '1px solid var(--border)',
            fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text3)',
          }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >

              {/* STEP 1 — Group type */}
              {step === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {GROUP_TYPES.map(gt => (
                    <button key={gt.id}
                      onClick={() => set('groupType', gt.id)}
                      style={{
                        padding: '20px 16px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                        border: `2px solid ${form.groupType === gt.id ? gt.colorHex : 'var(--border)'}`,
                        background: form.groupType === gt.id ? gt.bgHex : 'var(--surface2)',
                        transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 34 }}>{gt.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: form.groupType === gt.id ? gt.colorHex : 'var(--text2)' }}>
                        {typeLabel(gt.id)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2 — Details */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Cover color picker */}
                  <div>
                    <label className="form-label">{lang === 'ar' ? 'لون الغلاف' : 'Cover Color'}</label>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      {COVER_COLORS.map(c => (
                        <button key={c} onClick={() => set('coverGrad', c)} style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: c, border: form.coverGrad === c ? '3px solid var(--text)' : '2px solid transparent',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }} />
                      ))}
                    </div>
                    {/* Preview strip */}
                    <div style={{
                      height: 56, borderRadius: 12, background: form.coverGrad, marginTop: 10,
                      display: 'flex', alignItems: 'center', paddingInlineStart: 18,
                    }}>
                      <span style={{ color: '#fff', fontSize: 16, fontWeight: 800, opacity: 0.9 }}>
                        {form.name || (lang === 'ar' ? 'اسم المجموعة' : 'Group Name')}
                      </span>
                    </div>
                  </div>

                  <Field label={t('groups.createGroup.name')} value={form.name} onChange={v => set('name', v)}
                    placeholder={lang === 'ar' ? 'مثال: رياضيات ثالثة ثانوي – مجموعة أ' : 'e.g. Physics Grade 10 – Group A'} />

                  {/* Grade (for school type) */}
                  {(form.groupType === 'school_class' || form.groupType === 'private_tutoring') && (
                    <div>
                      <label className="form-label">{t('groups.createGroup.grade')}</label>
                      <select value={form.gradeId} onChange={e => { set('gradeId', e.target.value); set('subject', ''); }}
                        style={{ marginTop: 4 }}>
                        <option value="">—</option>
                        <optgroup label={SCHOOL_CURRICULUM.primary.nameAr}>
                          {SCHOOL_CURRICULUM.primary.grades.map(g => (
                            <option key={g.grade} value={g.grade}>{g.nameAr}</option>
                          ))}
                        </optgroup>
                        <optgroup label={SCHOOL_CURRICULUM.preparatory.nameAr}>
                          {SCHOOL_CURRICULUM.preparatory.grades.map(g => (
                            <option key={g.grade} value={g.grade}>{g.nameAr}</option>
                          ))}
                        </optgroup>
                        <optgroup label={SCHOOL_CURRICULUM.secondary.nameAr}>
                          {SCHOOL_CURRICULUM.secondary.grades.map(g => (
                            <option key={g.grade} value={g.grade}>{g.nameAr}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  )}

                  {/* Subject */}
                  <div>
                    <label className="form-label">{t('groups.createGroup.subject')}</label>
                    {gradeSubjects.length > 0 ? (
                      <select value={form.subject} onChange={e => set('subject', e.target.value)} style={{ marginTop: 4 }}>
                        <option value="">—</option>
                        {/* Handle both flat and nested subject objs */}
                        {(Array.isArray(gradeSubjects) ? gradeSubjects : [...(gradeSubjects.core||[]), ...(gradeSubjects.science||[]), ...(gradeSubjects.arts||[])]).map(s => (
                          <option key={s.id} value={s.nameAr}>{s.nameAr}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={form.subject} onChange={e => set('subject', e.target.value)}
                        placeholder={lang === 'ar' ? 'اكتب اسم المادة...' : 'Type subject name...'}
                        style={{ marginTop: 4 }} />
                    )}
                  </div>

                  <div>
                    <label className="form-label">{t('groups.createGroup.description')}</label>
                    <textarea value={form.description} onChange={e => set('description', e.target.value)}
                      rows={3} placeholder={lang === 'ar' ? 'وصف مختصر للمجموعة...' : 'Short description...'}
                      style={{ marginTop: 4, height: 'auto', resize: 'vertical' }} />
                  </div>
                </div>
              )}

              {/* STEP 3 — Settings */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label className="form-label">{t('groups.createGroup.capacity')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                      <input type="range" min="5" max="100" value={form.capacity}
                        onChange={e => set('capacity', +e.target.value)}
                        style={{ flex: 1, height: 'auto', padding: 0, border: 'none', background: 'none' }} />
                      <span style={{
                        minWidth: 52, textAlign: 'center', fontWeight: 900, fontSize: 18,
                        color: 'var(--primary)', fontFamily: 'var(--font-mono)',
                      }}>{form.capacity}</span>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">{t('groups.createGroup.enrollment')}</label>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      {['open', 'request_to_join', 'invite_only'].map(opt => (
                        <button key={opt} onClick={() => set('enrollment', opt)} style={{
                          padding: '10px 18px', height: 40, borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${form.enrollment === opt ? 'var(--primary)' : 'var(--border2)'}`,
                          background: form.enrollment === opt ? 'rgba(99,102,241,0.08)' : 'var(--surface2)',
                          color: form.enrollment === opt ? 'var(--blue-700)' : 'var(--text3)',
                          fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
                        }}>
                          {t(`groups.createGroup.${opt === 'open' ? 'open' : opt === 'invite_only' ? 'inviteOnly' : 'requestToJoin'}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paid toggle */}
                  <div>
                    <label className="form-label">{lang === 'ar' ? 'نوع المجموعة' : 'Group Pricing'}</label>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      {[false, true].map(p => (
                        <button key={String(p)} onClick={() => set('isPaid', p)} style={{
                          padding: '10px 22px', height: 40, borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${form.isPaid === p ? 'var(--primary)' : 'var(--border2)'}`,
                          background: form.isPaid === p ? 'rgba(99,102,241,0.08)' : 'var(--surface2)',
                          color: form.isPaid === p ? 'var(--blue-700)' : 'var(--text3)',
                          fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
                        }}>
                          {p ? `💎 ${t('groups.createGroup.paid')}` : `🆓 ${t('groups.createGroup.free')}`}
                        </button>
                      ))}
                    </div>
                    {form.isPaid && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                          placeholder={lang === 'ar' ? 'سعر الحصة (جنيه)' : 'Price per session (EGP)'}
                          style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text)', outline: 'none', fontSize: 14, fontFamily: 'inherit' }} />
                        <div>
                          <label className="form-label">{lang === 'ar' ? 'بوابات الدفع المدعومة' : 'Supported Payment Gateways'}</label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {['InstaPay', 'Bank Transfer', 'Vodafone Cash', 'E-wallets'].map(gw => (
                              <span key={gw} style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)' }}>✓ {gw}</span>
                            ))}
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 8 }}>
                            {lang === 'ar' ? 'سيتمكن الطلاب من الدفع عبر هذه البوابات تلقائياً.' : 'Students can pay automatically via these integrated gateways.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4 — Curriculum Linking */}
              {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7 }}>
                    {lang === 'ar'
                      ? 'اربط مجموعتك بالمنهج الرسمي لتتبع تقدم الطلاب على مستوى كل درس.'
                      : 'Link your group to the official curriculum to track student progress lesson by lesson.'}
                  </p>
                  {allGrades.filter(g => form.gradeId ? g.grade === +form.gradeId : true).slice(0,4).map(grade => {
                    const subs = Array.isArray(grade.subjects) ? grade.subjects : [...(grade.subjects?.core||[]), ...(grade.subjects?.science||[])];
                    const matchSub = subs.find(s => s.nameAr === form.subject) || subs[0];
                    if (!matchSub) return null;
                    return matchSub.units?.map(unit => (
                      <div key={unit.unit} onClick={() => set('curriculumLinked', unit)}
                        style={{
                          padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                          border: `1.5px solid ${form.curriculumLinked?.unit === unit.unit ? 'var(--primary)' : 'var(--border)'}`,
                          background: form.curriculumLinked?.unit === unit.unit ? 'rgba(99,102,241,0.06)' : 'var(--surface2)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                          {lang === 'ar' ? `${unit.nameAr}` : `Unit ${unit.unit}`}: {unit.nameAr}
                        </div>
                        {unit.lessons?.length > 0 && (
                          <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4 }}>
                            {unit.lessons.slice(0,3).join(' · ')}
                            {unit.lessons.length > 3 && ` +${unit.lessons.length - 3}`}
                          </div>
                        )}
                      </div>
                    ));
                  })}
                  <button onClick={() => set('curriculumLinked', null)} style={{
                    padding: '12px 18px', borderRadius: 12, border: '1.5px dashed var(--border2)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    {lang === 'ar' ? '⏭️ تخطي — سأربط لاحقًا' : '⏭️ Skip — Link later'}
                  </button>
                </div>
              )}

              {/* STEP 5 — Share & Create */}
              {step === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Summary card */}
                  <div style={{
                    borderRadius: 16, overflow: 'hidden',
                    border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                  }}>
                    <div style={{ height: 80, background: form.coverGrad, display: 'flex', alignItems: 'center', paddingInlineStart: 20 }}>
                      <span style={{ fontSize: 28 }}>{selectedType?.icon}</span>
                      <div style={{ marginInlineStart: 14 }}>
                        <div style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{form.name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{form.subject}</div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {[
                        { icon: '👥', label: lang === 'ar' ? `${form.capacity} طالب` : `${form.capacity} students` },
                        { icon: '🔐', label: form.enrollment === 'open' ? t('groups.createGroup.open') : t('groups.createGroup.inviteOnly') },
                        { icon: form.isPaid ? '💎' : '🆓', label: form.isPaid ? `${form.price} EGP` : t('groups.createGroup.free') },
                      ].map((item, i) => (
                        <span key={i} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                          background: 'var(--surface3)', border: '1px solid var(--border)',
                          color: 'var(--text2)',
                        }}>
                          {item.icon} {item.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Join code */}
                  <div style={{
                    padding: '18px 22px', borderRadius: 16, textAlign: 'center',
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      {lang === 'ar' ? 'كود الانضمام' : 'Join Code'}
                    </div>
                    <div style={{
                      fontSize: 32, fontWeight: 900, color: 'var(--primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.2em',
                    }}>
                      {form.joinCode}
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(form.joinCode); toast.success(lang === 'ar' ? 'تم النسخ!' : 'Copied!'); }}
                      style={{
                        marginTop: 10, padding: '8px 20px', borderRadius: 99, border: 'none',
                        background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📋 {lang === 'ar' ? 'نسخ الكود' : 'Copy Code'}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer navigation ── */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--surface2)',
        }}>
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose?.()} style={{
            height: 40, padding: '0 20px', borderRadius: 10,
            background: 'var(--surface)', border: '1.5px solid var(--border2)',
            color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          }}>
            ← {t('teacherReg.back')}
          </button>

          {step < 5 ? (
            <button disabled={!canAdvance()} onClick={() => canAdvance() && setStep(s => s + 1)} style={{
              height: 40, padding: '0 28px', borderRadius: 10,
              background: canAdvance() ? 'var(--primary)' : 'var(--surface4)',
              color: canAdvance() ? '#fff' : 'var(--text4)',
              border: 'none', cursor: canAdvance() ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 800,
              boxShadow: canAdvance() ? '0 3px 12px rgba(99,102,241,0.28)' : 'none',
              transition: 'all 0.2s',
            }}>
              {t('teacherReg.next')} →
            </button>
          ) : (
            <button onClick={handleCreate} disabled={loading} style={{
              height: 40, padding: '0 28px', borderRadius: 10,
              background: loading ? 'var(--surface4)' : 'var(--primary)',
              color: loading ? 'var(--text4)' : '#fff',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 800, transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 3px 12px rgba(99,102,241,0.28)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {loading ? '⏳' : `🚀 ${t('common.create')}`}
            </button>
          )}
        </div>
      </motion.div>
    </div>

    {/* Paid Group Activation Modal — shown after creating a paid group */}
    {activationData && (
      <PaidGroupActivationModal
        group={activationData.group}
        listingFee={activationData.listingFee}
        platformFeePercent={activationData.platformFeePercent}
        onActivated={(activeGroup) => {
          setActivationData(null);
          if (onCreated) onCreated(activeGroup);
          if (onClose) onClose();
        }}
        onClose={() => {
          setActivationData(null);
          if (onCreated) onCreated(activationData.group);
          if (onClose) onClose();
        }}
      />
    )}
  </>
  );
}


function Field({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} style={{ marginTop: 4 }} />
    </div>
  );
}
