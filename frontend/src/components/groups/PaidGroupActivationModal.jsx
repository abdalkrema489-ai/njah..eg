// PaidGroupActivationModal.jsx — shown right after a teacher creates a paid group
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { groupsAPI, paymentAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';

const GATEWAYS = [
  { id: 'instapay', icon: '⚡', label: 'InstaPay', color: '#7C3AED',
    desc: 'Transfer to: najah@instapay', descAr: 'حوّل إلى: najah@instapay' },
  { id: 'card', icon: '💳', label: 'Card', color: '#3B82F6',
    desc: 'Secure card payment', descAr: 'دفع بالبطاقة البنكية' },
  { id: 'wallet', icon: '📱', label: 'E-Wallet', color: '#10B981',
    desc: 'Vodafone Cash / Orange Cash', descAr: 'فودافون كاش / أورنج كاش' },
  { id: 'fawry', icon: '🏪', label: 'Fawry', color: '#F59E0B',
    desc: 'Pay at any Fawry point', descAr: 'ادفع في أي نقطة فوري' },
];

export default function PaidGroupActivationModal({ group, listingFee, platformFeePercent, onActivated, onClose }) {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [step, setStep]       = useState('overview'); // overview | pay | success
  const [gateway, setGateway] = useState('instapay');
  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);

  if (!group) return null;

  const selectedGw = GATEWAYS.find(g => g.id === gateway);
  const teacherEarnings = Math.round(group.price * (1 - platformFeePercent / 100));

  const handleActivate = async () => {
    setLoading(true);
    try {
      const payload = {
        amount: listingFee,
        gateway,
        groupId: group._id,
        type: 'listing_fee',
        title: `Listing fee - ${group.name}`,
        extraData: { phone: phone || '+201000000000' }
      };
      const { data } = await paymentAPI.initiate(payload);

      if (data.iframeUrl) {
        window.open(data.iframeUrl, '_blank');
      } else if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
      } else if (data.referenceCode) {
        toast.success(`Fawry Reference: ${data.referenceCode}`, { duration: 5000 });
      }

      // Automatically simulate success in development
      if (data.transactionId && import.meta.env.DEV) {
        await paymentAPI.simulateSuccess({ transactionId: data.transactionId });
      }

      setStep('success');
      if (onActivated) onActivated({ ...group, status: 'active', listingFeePaid: true });
    } catch (err) {
      toast.error(err.response?.data?.error || (isAr ? 'فشل إتمام عملية الدفع' : 'Payment failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, direction: isAr ? 'rtl' : 'ltr',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        style={{
          background: 'var(--surface)', borderRadius: 28,
          width: '100%', maxWidth: 520,
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* ── Success State ── */}
        {step === 'success' && (
          <div style={{ padding: '48px 40px', textAlign: 'center' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              style={{ fontSize: 72, marginBottom: 20 }}>🎉</motion.div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginBottom: 10 }}>
              {isAr ? 'تم تفعيل المجموعة! 🚀' : 'Group is Live! 🚀'}
            </h2>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
              {isAr
                ? `مجموعة "${group.name}" أصبحت نشطة الآن. شارك كود الانضمام مع طلابك.`
                : `"${group.name}" is now active. Share the join code with your students.`}
            </p>
            <div style={{
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 16, padding: '20px', marginBottom: 28,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isAr ? 'كود الانضمام' : 'Join Code'}
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary)', fontFamily: 'monospace', letterSpacing: '0.25em' }}>
                {group.code}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(group.code); toast.success(isAr ? 'تم النسخ!' : 'Copied!'); }}
                style={{
                  marginTop: 12, padding: '8px 20px', borderRadius: 99, border: 'none',
                  background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                📋 {isAr ? 'نسخ الكود' : 'Copy Code'}
              </button>
            </div>
            <button onClick={onClose} style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
            }}>
              {isAr ? '✅ رائع! اذهب إلى المجموعة' : '✅ Go to My Groups'}
            </button>
          </div>
        )}

        {/* ── Overview Step ── */}
        {step === 'overview' && (
          <>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              padding: '28px 32px 24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {isAr ? 'مجموعة مدفوعة جديدة' : 'New Paid Group'}
                  </div>
                  <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: 0 }}>
                    {group.name}
                  </h2>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>
                    {group.subject} · {isAr ? `${group.price} ج.م / طالب` : `EGP ${group.price} / student`}
                  </div>
                </div>
                <button onClick={onClose} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff', cursor: 'pointer', fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '24px 32px' }}>
              {/* Fee Breakdown */}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '20px', marginBottom: 20,
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
                  📊 {isAr ? 'تفاصيل الرسوم' : 'Fee Breakdown'}
                </div>
                {[
                  {
                    label: isAr ? 'سعر الاشتراك للطالب' : 'Student subscription price',
                    value: `EGP ${group.price}`,
                    color: 'var(--text)',
                    bold: true,
                  },
                  {
                    label: isAr ? `عمولة المنصة (${platformFeePercent}%)` : `Platform commission (${platformFeePercent}%)`,
                    value: `− EGP ${Math.round(group.price * platformFeePercent / 100)}`,
                    color: '#EF4444',
                  },
                  {
                    label: isAr ? 'صافي أرباحك لكل طالب' : 'Your net earnings per student',
                    value: `EGP ${teacherEarnings}`,
                    color: '#10B981',
                    bold: true,
                    border: true,
                  },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0',
                    borderTop: row.border ? '1px solid var(--border)' : 'none',
                    marginTop: row.border ? 8 : 0,
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: row.bold ? 800 : 600, color: row.color }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Listing Fee Notice */}
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 14, padding: '16px 18px', marginBottom: 24,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 22 }}>💡</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#D97706', fontSize: 13, marginBottom: 4 }}>
                    {isAr ? `رسوم نشر المجموعة: EGP ${listingFee}` : `Group listing fee: EGP ${listingFee}`}
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.6 }}>
                    {isAr
                      ? 'رسوم لمرة واحدة تُدفع لتفعيل مجموعتك وجعلها مرئية للطلاب. يتم احتسابها كـ 5% من سعر الاشتراك.'
                      : 'A one-time fee to activate your group and make it visible to students. Calculated as 5% of the subscription price.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text2)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                  {isAr ? 'لاحقاً' : 'Later'}
                </button>
                <button onClick={() => setStep('pay')} style={{
                  flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                }}>
                  💳 {isAr ? `ادفع EGP ${listingFee} وفعّل المجموعة` : `Pay EGP ${listingFee} & Activate`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Payment Step ── */}
        {step === 'pay' && (
          <>
            {/* Header */}
            <div style={{
              padding: '22px 28px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                  {isAr ? '💳 اختر طريقة الدفع' : '💳 Choose Payment Method'}
                </h2>
                <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>
                  {isAr ? `المبلغ المستحق: EGP ${listingFee}` : `Amount due: EGP ${listingFee}`}
                </p>
              </div>
              <button onClick={() => setStep('overview')} style={{
                padding: '6px 14px', borderRadius: 8, background: 'var(--surface2)',
                border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12,
              }}>← {isAr ? 'رجوع' : 'Back'}</button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Gateway grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {GATEWAYS.map(gw => (
                  <button key={gw.id} onClick={() => setGateway(gw.id)} style={{
                    padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${gateway === gw.id ? gw.color : 'var(--border)'}`,
                    background: gateway === gw.id ? gw.color + '12' : 'var(--surface2)',
                    transition: 'all 0.18s',
                  }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{gw.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: gateway === gw.id ? gw.color : 'var(--text)' }}>
                      {gw.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {isAr ? gw.descAr : gw.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Gateway-specific instructions */}
              <AnimatePresence mode="wait">
                <motion.div key={gateway}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  style={{
                    background: selectedGw.color + '0F',
                    border: `1px solid ${selectedGw.color}33`,
                    borderRadius: 12, padding: '14px 16px', marginBottom: 20,
                  }}>
                  {gateway === 'instapay' && (
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                      {isAr
                        ? <>حوّل مبلغ <strong>EGP {listingFee}</strong> إلى عنوان InstaPay:<br /><span style={{ fontSize: 18, fontWeight: 900, color: '#7C3AED', fontFamily: 'monospace' }}>najah@instapay</span></>
                        : <>Transfer <strong>EGP {listingFee}</strong> to:<br /><span style={{ fontSize: 18, fontWeight: 900, color: '#7C3AED', fontFamily: 'monospace' }}>najah@instapay</span></>}
                    </div>
                  )}
                  {gateway === 'wallet' && (
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
                        {isAr ? 'أدخل رقم المحفظة لتلقي طلب الدفع:' : 'Enter your wallet number to receive payment request:'}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ padding: '10px 14px', background: 'var(--surface3)', borderRadius: 8, fontWeight: 800, color: 'var(--text2)', fontSize: 13 }}>+20</span>
                        <input
                          type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="10xxxxxxxx"
                          style={{
                            flex: 1, padding: '10px 14px', borderRadius: 8,
                            background: 'var(--surface2)', border: '1px solid var(--border)',
                            color: 'var(--text)', fontSize: 14, outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {gateway === 'card' && (
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                      {isAr
                        ? 'سيتم فتح صفحة دفع آمنة لإتمام العملية بالبطاقة البنكية.'
                        : 'A secure payment page will open to complete your card transaction.'}
                    </div>
                  )}
                  {gateway === 'fawry' && (
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                      {isAr
                        ? 'سيتم إنشاء رقم مرجعي فوري. ادفع في أي نقطة فوري خلال 24 ساعة.'
                        : 'A Fawry reference code will be generated. Pay at any Fawry point within 24 hours.'}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Order summary strip */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--surface2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20,
              }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                  🏷️ {isAr ? `رسوم نشر: "${group.name}"` : `Listing fee: "${group.name}"`}
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary)' }}>
                  EGP {listingFee}
                </span>
              </div>

              <motion.button
                onClick={handleActivate} disabled={loading || (gateway === 'wallet' && phone.length < 10)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: loading ? 'var(--surface4)' : `linear-gradient(135deg, ${selectedGw.color}, ${selectedGw.color}CC)`,
                  color: '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : `0 6px 20px ${selectedGw.color}44`,
                  opacity: (gateway === 'wallet' && phone.length < 10) ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}>
                {loading
                  ? (isAr ? '⏳ جاري التفعيل...' : '⏳ Activating...')
                  : `${selectedGw.icon} ${isAr ? `تأكيد الدفع وتفعيل المجموعة` : `Confirm Payment & Activate Group`}`}
              </motion.button>

              <p style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 11, marginTop: 14 }}>
                🔒 {isAr ? 'مدفوعاتك محمية ومؤمنة' : 'Your payment is secured and encrypted'}
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
