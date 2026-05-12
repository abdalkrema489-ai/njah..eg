// src/components/payment/PaymentPage.jsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { paymentAPI, usersAPI, groupsAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';
import { useAuthStore } from '../../context/store';

export default function PaymentPage() {
  const { t, lang } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedGateway, setSelectedGateway] = useState('card');
  const [showCheckout, setShowCheckout] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [topUpCode, setTopUpCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [lastJoinedGroupId, setLastJoinedGroupId] = useState(null);
  const [paySuccess, setPaySuccess] = useState(null); // { type, groupId, amount }

  const { data: profileData } = useQuery({ queryKey: ['profile'], queryFn: usersAPI.getProfile });
  const walletBalance = profileData?.data?.profile?.wallet_balance || user?.wallet_balance || 0;

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: paymentAPI.history
  });

  const dbPayments = historyData?.data?.transactions || [];

  const payments = [
    { id: 1, title: 'Physics Grade 10 - April Bundle', amount: 250, date: '2026-04-25', status: 'upcoming' },
    ...dbPayments.map(t => ({
      id: t._id, title: t.metadata?.title || 'Wallet Top-up', amount: t.amount, date: new Date(t.createdAt).toLocaleDateString(), status: t.status === 'success' ? 'paid' : 'upcoming'
    }))
  ];

  const baseAmount = checkoutTarget ? checkoutTarget.amount : 250;
  const finalAmount = appliedCoupon ? appliedCoupon.newTotal : baseAmount;

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    setJoining(true);
    try {
      const { data } = await groupsAPI.join(joinCode.toUpperCase());
      toast.success(isAr ? `🎉 تم الانضمام لمجموعة "${data.group?.name}" بنجاح!` : `🎉 Joined "${data.group?.name}" successfully!`);
      setJoinCode('');
      qc.invalidateQueries(['profile']);
      qc.invalidateQueries(['groups']);
      // Navigate directly to the group
      if (data.group?._id) {
        setTimeout(() => navigate(`/groups/${data.group._id}`), 800);
      }
    } catch (err) {
      if (err.response?.status === 402) {
        const groupId = err.response.data.groupId;
        setCheckoutTarget({
          type: 'group_join',
          amount: err.response.data.price,
          groupId,
          title: isAr ? `الانضمام للمجموعة: ${joinCode.toUpperCase()}` : `Group Entry: ${joinCode.toUpperCase()}`
        });
        setShowCheckout(true);
        toast.success(isAr ? '💳 هذه مجموعة مدفوعة — أكمل الدفع للانضمام.' : '💳 This is a paid group — complete payment to join.');
      } else {
        toast.error(err.response?.data?.error || (isAr ? 'خطأ في الانضمام' : 'Error joining group'));
      }
    } finally {
      setJoining(false);
    }
  };

  const handleTopUpReq = (e) => {
    e.preventDefault();
    if (!topUpAmount || isNaN(topUpAmount) || Number(topUpAmount) < 10) {
      toast.error(lang === 'ar' ? 'المبلغ الأدنى هو 10 ج.م' : 'Minimum amount is 10 EGP');
      return;
    }
    setCheckoutTarget({ type: 'wallet_topup', amount: Number(topUpAmount), title: 'Wallet Top-up' });
    setShowCheckout(true);
  };

  const handlePay = async () => {
    if (!checkoutTarget) return;
    setProcessing(true);
    try {
      // Step 1: Initiate genuine payment
      const affiliateRef = localStorage.getItem('affiliate_ref');
      const payload = {
        amount: finalAmount, 
        gateway: selectedGateway, 
        title: checkoutTarget.title,
        type: checkoutTarget.type,
        groupId: checkoutTarget.groupId,
        extraData: { 
          phone: '+201000000000', 
          coupon: appliedCoupon?.coupon?.code,
          affiliate_ref: affiliateRef 
        }
      };
      const { data } = await paymentAPI.initiate(payload);

      if (data.iframeUrl) {
        window.open(data.iframeUrl, '_blank');
      } else if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
      } else if (data.referenceCode) {
        toast.success(`Use Reference: ${data.referenceCode} at Fawry`, { duration: 5000 });
      }

      // Step 2: Trigger simulate-success automatically ONLY in DEV or if it's a simulated transaction
      if (data.transactionId && (!data.iframeUrl || data.iframeUrl.includes('SIMULATED'))) {
        try {
          await paymentAPI.simulateSuccess({ transactionId: data.transactionId });
        } catch (simErr) {
          console.warn('Simulation skipped or failed:', simErr);
        }
      }
      
      // Step 3: Invalidate data
      qc.invalidateQueries(['paymentHistory']);
      qc.invalidateQueries(['profile']);
      qc.invalidateQueries(['groups']);

      // Step 4: Show success & redirect if group_join
      if (checkoutTarget.type === 'group_join' && checkoutTarget.groupId) {
        toast.success(isAr ? 'تم بدء عملية الدفع! بعد إتمام الدفع، ستتم إضافتك للمجموعة.' : 'Payment initiated! Complete the payment to join.');
        setShowCheckout(false);
      } else if (checkoutTarget.type === 'wallet_topup') {
        toast.success(isAr ? 'تم بدء عملية الدفع! سيتم شحن المحفظة بعد الإتمام.' : 'Payment initiated! Wallet will be topped up upon completion.');
        setShowCheckout(false);
      } else {
        toast.success(isAr ? 'تم بدء عملية الدفع!' : 'Payment initiated!');
        setShowCheckout(false);
      }
      setCheckoutTarget(null);
      setAppliedCoupon(null);
      setCouponCode('');
    } catch (err) {
      toast.error(isAr ? 'فشل الدفع.' : 'Payment failed.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!topUpCode) return;
    setRedeeming(true);
    try {
      const { data } = await paymentAPI.redeemCode({ code: topUpCode });
      toast.success(data.message);
      setTopUpCode('');
      qc.invalidateQueries(['paymentHistory']);
      qc.invalidateQueries(['profile']);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code');
    } finally {
      setRedeeming(false);
    }
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode) return;
    setValidatingCoupon(true);
    try {
      const { data } = await paymentAPI.validateCoupon({ code: couponCode, amount: baseAmount });
      setAppliedCoupon(data);
      toast.success(`Coupon applied! Discount: ${data.discountAmount} EGP`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid coupon');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  return (
    <div style={{ padding: '24px', direction: lang === 'ar' ? 'rtl' : 'ltr', display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100vh' }}>
      {/* ── Header banner ── */}
      <div style={{
        position: 'relative', height: 220, borderRadius: 24, overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <img src="/images/najah-bg-campus-9.jpeg" alt="campus-9" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.2))' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, right: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', marginBottom: 8 }}>
              {lang === 'ar' ? 'البوابة المالية' : 'Payment Gateway'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
              {lang === 'ar' ? 'أدر مدفوعاتك واشتراكاتك بسهولة وأمان.' : 'Manage your payments and subscriptions securely.'}
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '12px 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{lang === 'ar' ? 'الرصيد المتاح' : 'Wallet Balance'}</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 900 }}>EGP {Number(walletBalance).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* ── Left Column: Invoices & Actions ── */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Quick Actions (Join Group & Top Up) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <form onSubmit={handleJoinGroup} style={{ background: 'var(--surface)', padding: '20px', borderRadius: 20, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔗</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{isAr ? 'الانضمام لمجموعة' : 'Join a Group'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{isAr ? 'أدخل كود المجموعة' : 'Enter the group invite code'}</div>
                </div>
              </div>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder={isAr ? 'مثال: ABC123' : 'e.g. ABC123'}
                maxLength={6}
                style={{ padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 15, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 3, color: 'var(--text)', outline: 'none', textAlign: 'center', textTransform: 'uppercase' }}
              />
              <button type="submit" disabled={joining || !joinCode} style={{ padding: '11px', borderRadius: 12, background: joining || !joinCode ? 'var(--surface3)' : 'var(--primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: joining || !joinCode ? 'not-allowed' : 'pointer', fontSize: 14, opacity: joining || !joinCode ? 0.7 : 1 }}>
                {joining ? '⏳' : (isAr ? 'انضم الآن ←' : 'Join Now →')}
              </button>
            </form>
            <form onSubmit={handleTopUpReq} style={{ background: 'var(--surface)', padding: '20px', borderRadius: 20, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💰</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{isAr ? 'شحن الرصيد' : 'Top Up Wallet'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{isAr ? `رصيدك: ${Number(walletBalance).toFixed(0)} ج.م` : `Balance: EGP ${Number(walletBalance).toFixed(0)}`}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[50, 100, 200].map(amt => (
                  <button key={amt} type="button" onClick={() => setTopUpAmount(String(amt))} style={{ flex: 1, padding: '6px 4px', borderRadius: 8, background: topUpAmount === String(amt) ? 'rgba(16,185,129,0.15)' : 'var(--surface2)', border: `1.5px solid ${topUpAmount === String(amt) ? '#10B981' : 'var(--border)'}`, color: topUpAmount === String(amt) ? '#10B981' : 'var(--text3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {amt}
                  </button>
                ))}
              </div>
              <input type="number" min={10} value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder={isAr ? 'أو أدخل مبلغاً...' : 'Or enter amount...'} style={{ padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
              <button type="submit" disabled={!topUpAmount} style={{ padding: '11px', borderRadius: 12, background: !topUpAmount ? 'var(--surface3)' : '#10B981', color: '#fff', border: 'none', fontWeight: 800, cursor: !topUpAmount ? 'not-allowed' : 'pointer', fontSize: 14, opacity: !topUpAmount ? 0.7 : 1 }}>
                {isAr ? 'شحن الآن ←' : 'Add Balance →'}
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', gap: 10, background: 'var(--surface2)', padding: 6, borderRadius: 14 }}>
            {['upcoming', 'paid'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: activeTab === t ? 'var(--surface)' : 'transparent',
                color: activeTab === t ? 'var(--text)' : 'var(--text3)',
                fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
                boxShadow: activeTab === t ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
              }}>
                {t === 'upcoming' ? (lang === 'ar' ? 'مستحقة الدفع' : 'Upcoming Payments') : (lang === 'ar' ? 'سجل المدفوعات' : 'Payment History')}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {payments.filter(p => p.status === activeTab).map(p => (
              <div key={p.id} style={{
                background: 'var(--surface)', padding: 20, borderRadius: 16,
                border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{p.title}</h3>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>{lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}: {p.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)', marginBottom: 6 }}>{p.amount} EGP</div>
                  {activeTab === 'upcoming' ? (
                    <button onClick={() => { setCheckoutTarget({ type:'invoice', amount:p.amount, title:p.title }); setShowCheckout(true); }} style={{
                      padding: '8px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff',
                      fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 12
                    }}>
                      {lang === 'ar' ? 'ادفع الآن' : 'Pay Now'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                      {lang === 'ar' ? 'تم الدفع' : 'Paid'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {payments.filter(p => p.status === activeTab).length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', background: 'var(--surface2)', borderRadius: 16 }}>
                {lang === 'ar' ? 'لا يوجد فواتير' : 'No invoices here.'}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Checkout Widget ── */}
        <AnimatePresence>
          {showCheckout && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              style={{ flex: '1 1 350px', background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--primary)', padding: 24, boxShadow: '0 8px 30px rgba(99,102,241,0.15)' }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>{lang === 'ar' ? 'إتمام الدفع' : 'Secure Checkout'}</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                <button onClick={() => setSelectedGateway('topup')} style={{
                  padding: 12, borderRadius: 12, border: `2px solid ${selectedGateway === 'topup' ? '#3B82F6' : 'var(--border)'}`,
                  background: selectedGateway === 'topup' ? 'rgba(59,130,246,0.05)' : 'var(--surface2)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>🎫</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>Top-Up Code</div>
                </button>
                <button onClick={() => setSelectedGateway('card')} style={{
                  padding: 12, borderRadius: 12, border: `2px solid ${selectedGateway === 'card' ? 'var(--primary)' : 'var(--border)'}`,
                  background: selectedGateway === 'card' ? 'rgba(99,102,241,0.05)' : 'var(--surface2)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>💳</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Credit/Debit</div>
                </button>
                <button onClick={() => setSelectedGateway('instapay')} style={{
                  padding: 12, borderRadius: 12, border: `2px solid ${selectedGateway === 'instapay' ? '#8B5CF6' : 'var(--border)'}`,
                  background: selectedGateway === 'instapay' ? 'rgba(139,92,246,0.05)' : 'var(--surface2)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>⚡</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>InstaPay</div>
                </button>
                <button onClick={() => setSelectedGateway('wallet')} style={{
                  padding: 12, borderRadius: 12, border: `2px solid ${selectedGateway === 'wallet' ? '#10B981' : 'var(--border)'}`,
                  background: selectedGateway === 'wallet' ? 'rgba(16,185,129,0.05)' : 'var(--surface2)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>📱</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>E-Wallet</div>
                </button>
                <button onClick={() => setSelectedGateway('fawry')} style={{
                  padding: 12, borderRadius: 12, border: `2px solid ${selectedGateway === 'fawry' ? '#F59E0B' : 'var(--border)'}`,
                  background: selectedGateway === 'fawry' ? 'rgba(245,158,11,0.05)' : 'var(--surface2)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>🏪</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Fawry Pay</div>
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={selectedGateway} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  {selectedGateway === 'card' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <input type="text" placeholder={lang === 'ar' ? 'الاسم على البطاقة' : 'Name on Card'} className="form-input" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)' }} />
                      <div style={{ position: 'relative' }}>
                        <input type="text" placeholder={lang === 'ar' ? 'رقم البطاقة' : 'Card Number'} className="form-input" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', letterSpacing: '2px' }} />
                        <span style={{ position: 'absolute', right: 12, top: 12, opacity: 0.5 }}>💳</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <input type="text" placeholder="MM/YY" className="form-input" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', textAlign: 'center' }} />
                        <input type="text" placeholder="CVC" className="form-input" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', textAlign: 'center' }} />
                      </div>
                    </div>
                  )}

                  {selectedGateway === 'instapay' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ padding: 16, background: 'rgba(139,92,246,0.1)', borderRadius: 12, border: '1px solid rgba(139,92,246,0.2)' }}>
                        <p style={{ fontSize: 13, color: '#6D28D9', lineHeight: 1.6, fontWeight: 600, textAlign: 'center' }}>
                          {lang === 'ar' ? 'يرجى تحويل المبلغ إلى عنوان InstaPay الخاص بنا:' : 'Please transfer the exact amount to our InstaPay Address (IPA):'}
                        </p>
                        <div style={{ marginTop: 8, padding: '10px', background: '#fff', borderRadius: 8, textAlign: 'center', fontSize: 18, fontWeight: 900, color: '#6D28D9', letterSpacing: '1px' }}>
                          najah@instapay
                        </div>
                      </div>
                      <input type="text" placeholder={lang === 'ar' ? 'أدخل عنوان InstaPay الخاص بك للتحقق' : 'Your InstaPay Address (e.g. user@instapay)'} className="form-input" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)' }} />
                    </div>
                  )}

                  {selectedGateway === 'wallet' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                        <p style={{ fontSize: 13, color: '#047857', lineHeight: 1.6, fontWeight: 600, textAlign: 'center' }}>
                          {lang === 'ar' ? 'أدخل رقم المحفظة الإلكترونية (فودافون كاش، أورانج، إلخ) وسنرسل لك طلب دفع.' : 'Enter your E-Wallet number (Vodafone Cash, Orange, etc.) to receive a payment prompt.'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <span style={{ padding: '12px 16px', background: 'var(--surface3)', fontWeight: 800, color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>+20</span>
                        <input type="tel" placeholder="10xxxxxxxxx" className="form-input" style={{ width: '100%', padding: 12, border: 'none', background: 'transparent', outline: 'none', fontSize: 16, letterSpacing: '1px' }} />
                      </div>
                    </div>
                  )}

                  {selectedGateway === 'fawry' && (
                    <div style={{ padding: 16, background: 'rgba(245,158,11,0.1)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                      <p style={{ fontSize: 13, color: '#D97706', lineHeight: 1.6, fontWeight: 600, textAlign: 'center' }}>
                        {lang === 'ar' ? 'سيتم إنشاء رقم مرجعي لفوري. يمكنك الدفع من أي ماكينة فوري خلال 24 ساعة.' : 'A Fawry reference code will be generated. Pay at any Fawry point within 24 hours.'}
                      </p>
                    </div>
                  )}

                  {selectedGateway === 'topup' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ padding: 16, background: 'rgba(59,130,246,0.1)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)' }}>
                        <p style={{ fontSize: 13, color: '#2563EB', lineHeight: 1.6, fontWeight: 600, textAlign: 'center' }}>
                          {lang === 'ar' ? 'أدخل كود الشحن لإضافة الرصيد إلى محفظتك على المنصة.' : 'Enter your prepaid top-up code to add balance to your wallet instantly.'}
                        </p>
                      </div>
                      <form onSubmit={handleRedeem} style={{ display: 'flex', gap: 8 }}>
                        <input type="text" value={topUpCode} onChange={e => setTopUpCode(e.target.value)} placeholder="NAJAH-..." className="form-input" style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'monospace', letterSpacing: 1 }} />
                        <button type="submit" disabled={redeeming || !topUpCode} style={{ padding: '0 20px', borderRadius: 10, background: '#3B82F6', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: redeeming || !topUpCode ? 0.7 : 1 }}>
                          {redeeming ? '⏳' : 'Redeem'}
                        </button>
                      </form>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ── Coupon Section ── */}
              {selectedGateway !== 'topup' && (
                <div style={{ marginTop: 20, marginBottom: 16, padding: 16, borderRadius: 12, background: 'var(--surface2)', border: '1px dashed var(--border)' }}>
                  {!appliedCoupon ? (
                    <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 8 }}>
                      <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Discount Code" className="form-input" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13 }} />
                      <button type="submit" disabled={validatingCoupon || !couponCode} style={{ padding: '0 16px', borderRadius: 8, background: 'var(--text2)', color: 'var(--surface)', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 12 }}>
                        {validatingCoupon ? '⏳' : 'Apply'}
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Coupon Applied</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>{appliedCoupon.coupon.code} (-{appliedCoupon.discountAmount} EGP)</div>
                      </div>
                      <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Remove</button>
                    </div>
                  )}
                </div>
              )}

              {selectedGateway !== 'topup' && (
                <button onClick={handlePay} disabled={processing} style={{
                  width: '100%', padding: 16, borderRadius: 12, background: 'var(--primary)', color: '#fff',
                  fontWeight: 800, fontSize: 16, border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.7 : 1
                }}>
                  {processing ? '⏳ Processing...' : (lang === 'ar' ? `تأكيد الدفع ${finalAmount} ج.م` : `Pay ${finalAmount} EGP`)}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
