// src/components/teacher/TeacherWallet.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { walletAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';

const METHODS = [
  { key: 'instapay',      label: 'InstaPay',       icon: '⚡', color: '#8B5CF6' },
  { key: 'vodafone_cash', label: 'Vodafone Cash',   icon: '📱', color: '#EF4444' },
  { key: 'bank_transfer', label: 'Bank Transfer',   icon: '🏦', color: '#3B82F6' },
];

const STATUS_COLORS = {
  available: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'متاح' },
  withdrawn: { bg: 'rgba(99,102,241,0.12)', color: '#6366F1', label: 'تم السحب' },
  held:      { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'محجوز' },
  pending:   { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'قيد المراجعة' },
  approved:  { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'تمت الموافقة' },
  rejected:  { bg: 'rgba(239,68,68,0.12)',  color: '#EF4444', label: 'مرفوض' },
  paid:      { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'تم التحويل' },
};

export default function TeacherWallet() {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const qc = useQueryClient();

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'instapay', accountNumber: '', accountName: '' });
  const [earningsPage, setEarningsPage] = useState(1);

  // ── Queries ──
  const { data: balanceData } = useQuery({ queryKey: ['wallet-balance'], queryFn: () => walletAPI.getBalance() });
  const { data: earningsData } = useQuery({ queryKey: ['wallet-earnings', earningsPage], queryFn: () => walletAPI.getEarnings({ page: earningsPage, limit: 15 }) });
  const { data: withdrawalData } = useQuery({ queryKey: ['wallet-withdrawals'], queryFn: () => walletAPI.getWithdrawals() });

  const balance = balanceData?.data || { balance: 0, totalEarned: 0, pendingWithdrawn: 0, available: 0 };
  const earnings = earningsData?.data || { earnings: [], total: 0, totalNet: 0, monthly: [] };
  const withdrawals = withdrawalData?.data?.withdrawals || [];

  // ── Mutations ──
  const withdrawMutation = useMutation({
    mutationFn: d => walletAPI.withdraw(d),
    onSuccess: (res) => {
      toast.success(res.data.message || 'تم إرسال طلب السحب');
      setShowWithdrawModal(false);
      setWithdrawForm({ amount: '', method: 'instapay', accountNumber: '', accountName: '' });
      qc.invalidateQueries(['wallet-balance']);
      qc.invalidateQueries(['wallet-withdrawals']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'خطأ في طلب السحب');
    },
  });

  const handleWithdraw = (e) => {
    e.preventDefault();
    withdrawMutation.mutate({
      amount: parseFloat(withdrawForm.amount),
      method: withdrawForm.method,
      accountNumber: withdrawForm.accountNumber,
      accountName: withdrawForm.accountName,
    });
  };

  // ── Simple bar chart for monthly earnings ──
  const maxMonthly = Math.max(...earnings.monthly.map(m => parseFloat(m.total || 0)), 1);

  return (
    <div style={{ padding: 24, direction: isAr ? 'rtl' : 'ltr', display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{
        position: 'relative', height: 200, borderRadius: 24, overflow: 'hidden',
        background: 'linear-gradient(135deg, #10B981, #059669, #047857)',
        boxShadow: '0 8px 32px rgba(16,185,129,0.25)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.1), transparent 60%)' }} />
        <div style={{ position: 'absolute', bottom: 28, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              {isAr ? '💰 محفظة المدرس' : '💰 Teacher Wallet'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {isAr ? 'إيراداتك وطلبات السحب في مكان واحد' : 'Your earnings and withdrawals in one place'}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowWithdrawModal(true)}
            style={{
              padding: '14px 28px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#fff', color: '#047857', fontWeight: 800, fontSize: 15,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', fontFamily: 'inherit',
            }}
          >
            {isAr ? '💸 طلب سحب' : '💸 Withdraw'}
          </motion.button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: isAr ? 'الرصيد المتاح' : 'Available Balance',    value: `${balance.available.toFixed(2)} EGP`, icon: '💰', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: isAr ? 'إجمالي المكتسب' : 'Total Earned',         value: `${balance.totalEarned.toFixed(2)} EGP`, icon: '📈', color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
          { label: isAr ? 'قيد السحب' : 'Pending Withdrawal',       value: `${balance.pendingWithdrawn.toFixed(2)} EGP`, icon: '⏳', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: isAr ? 'عدد الإيرادات' : 'Total Transactions',   value: earnings.total, icon: '🧾', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20,
              padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16,
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Monthly Earnings Chart ── */}
      {earnings.monthly.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 20, letterSpacing: '-0.02em' }}>
            {isAr ? '📊 إيرادات الأشهر' : '📊 Monthly Earnings'}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={earnings.monthly.map(m => ({ name: m.month?.slice(5) || m.month, value: parseFloat(m.total || 0) }))}>
              <defs>
                <linearGradient id="walletGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} width={50} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                formatter={v => [`${v.toFixed(2)} EGP`, isAr ? 'الإيراد' : 'Earnings']}
              />
              <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} fill="url(#walletGrad)" dot={{ r: 3, fill: '#10B981' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ── Earnings Table ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: '-0.02em' }}>
            {isAr ? '🧾 سجل الإيرادات' : '🧾 Earnings Log'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {earnings.earnings.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                {isAr ? 'لا توجد إيرادات بعد' : 'No earnings yet'}
              </div>
            )}
            {earnings.earnings.map(e => {
              const st = STATUS_COLORS[e.status] || STATUS_COLORS.available;
              return (
                <div key={e.id} style={{
                  padding: '14px 16px', borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{e.group_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>👤 {e.student_name || 'Student'} · {new Date(e.earned_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>+{parseFloat(e.net_amount).toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {parseFloat(e.gross_amount).toFixed(0)} - {parseFloat(e.fee_amount).toFixed(0)} ({parseFloat(e.fee_percent)}%)
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 7px', borderRadius: 5 }}>
                      {isAr ? st.label : e.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          {earnings.total > 15 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button
                disabled={earningsPage <= 1}
                onClick={() => setEarningsPage(p => p - 1)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: earningsPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: 700, color: 'var(--text2)', opacity: earningsPage <= 1 ? 0.5 : 1 }}
              >←</button>
              <span style={{ padding: '6px 12px', fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>{earningsPage}</span>
              <button
                disabled={earningsPage * 15 >= earnings.total}
                onClick={() => setEarningsPage(p => p + 1)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: earningsPage * 15 >= earnings.total ? 'not-allowed' : 'pointer', fontWeight: 700, color: 'var(--text2)', opacity: earningsPage * 15 >= earnings.total ? 0.5 : 1 }}
              >→</button>
            </div>
          )}
        </div>

        {/* ── Withdrawals Table ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: '-0.02em' }}>
            {isAr ? '💸 طلبات السحب' : '💸 Withdrawal Requests'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {withdrawals.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                {isAr ? 'لا توجد طلبات سحب' : 'No withdrawal requests yet'}
              </div>
            )}
            {withdrawals.map(w => {
              const st = STATUS_COLORS[w.status] || STATUS_COLORS.pending;
              const method = METHODS.find(m => m.key === w.method);
              return (
                <div key={w.id} style={{
                  padding: '14px 16px', borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{method?.icon || '💳'}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{method?.label || w.method}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{w.account_number} · {new Date(w.requested_at).toLocaleDateString()}</div>
                    {w.admin_note && <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4 }}>💬 {w.admin_note}</div>}
                  </div>
                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{parseFloat(w.amount).toFixed(2)} EGP</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>
                      {isAr ? st.label : w.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Withdraw Modal ── */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowWithdrawModal(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 24, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                {isAr ? '💸 طلب سحب أرباح' : '💸 Withdraw Earnings'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
                {isAr ? 'سيتم المراجعة والتحويل خلال 24 ساعة في أيام العمل.' : 'Reviewed and transferred within 24 hours on business days.'}
              </p>

              <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Amount */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>
                    {isAr ? 'المبلغ (جنيه)' : 'Amount (EGP)'}
                  </label>
                  <input
                    type="number" min={50} max={balance.available}
                    value={withdrawForm.amount}
                    onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder={isAr ? `الحد الأدنى 50 - المتاح ${balance.available.toFixed(2)}` : `Min 50 — Available ${balance.available.toFixed(2)}`}
                    required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 16, fontWeight: 700, color: 'var(--text)', outline: 'none' }}
                  />
                </div>

                {/* Method */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, display: 'block' }}>
                    {isAr ? 'طريقة السحب' : 'Withdrawal Method'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {METHODS.map(m => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setWithdrawForm(f => ({ ...f, method: m.key }))}
                        style={{
                          padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${withdrawForm.method === m.key ? m.color : 'var(--border)'}`,
                          background: withdrawForm.method === m.key ? m.color + '10' : 'var(--surface2)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{m.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: withdrawForm.method === m.key ? m.color : 'var(--text3)' }}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>
                    {isAr ? 'رقم الحساب / المحفظة' : 'Account / Wallet Number'}
                  </label>
                  <input
                    type="text"
                    value={withdrawForm.accountNumber}
                    onChange={e => setWithdrawForm(f => ({ ...f, accountNumber: e.target.value }))}
                    placeholder={withdrawForm.method === 'instapay' ? 'user@instapay' : '01xxxxxxxxx'}
                    required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 14, color: 'var(--text)', outline: 'none' }}
                  />
                </div>

                {/* Account Name */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>
                    {isAr ? 'اسم صاحب الحساب' : 'Account Holder Name'}
                  </label>
                  <input
                    type="text"
                    value={withdrawForm.accountName}
                    onChange={e => setWithdrawForm(f => ({ ...f, accountName: e.target.value }))}
                    placeholder={isAr ? 'الاسم كما هو في الحساب' : 'Name as on account'}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 14, color: 'var(--text)', outline: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={withdrawMutation.isPending}
                  style={{
                    width: '100%', padding: 16, borderRadius: 14, border: 'none', cursor: withdrawMutation.isPending ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
                    fontWeight: 800, fontSize: 16, fontFamily: 'inherit',
                    opacity: withdrawMutation.isPending ? 0.7 : 1,
                    boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                  }}
                >
                  {withdrawMutation.isPending ? '⏳...' : (isAr ? `تأكيد السحب` : `Confirm Withdrawal`)}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
