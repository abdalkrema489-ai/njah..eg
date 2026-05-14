// src/components/wallet/WalletPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUIStore } from '../../context/store';
import { usersAPI } from '../../api/index';
import client from '../../api/index';
import { Spinner } from '../shared/UI';

const QUICK_AMOUNTS = [50, 100, 200, 500];

const TYPE_ICON = {
  wallet_topup: '💰',
  group_join:   '📚',
  listing_fee:  '📋',
};

export default function WalletPage() {
  const navigate  = useNavigate();
  const language  = useUIStore(s => s.language);
  const isAr      = language === 'ar';
  const [filter, setFilter] = useState('all');

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn:  () => usersAPI.getProfile().then(r => r.data.profile),
    staleTime: 2 * 60 * 1000,
  });

  const { data: historyData, isLoading: txLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn:  () => client.get('/payment/history').then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const balance      = parseFloat(profileData?.wallet_balance || 0);
  const transactions = (historyData?.transactions || []).filter(tx => {
    if (filter === 'topup')       return tx.type === 'wallet_topup';
    if (filter === 'subscription') return tx.type !== 'wallet_topup';
    return true;
  });

  const totalSpent = (historyData?.transactions || [])
    .filter(tx => tx.type !== 'wallet_topup' && tx.status === 'success')
    .reduce((s, tx) => s + (tx.amount || 0), 0);

  const paidSubs = (historyData?.transactions || [])
    .filter(tx => tx.type === 'group_join' && tx.status === 'success').length;

  const lastTx = (historyData?.transactions || [])[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, margin: '0 auto', paddingBottom: 40 }}>

      {/* ── Balance Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 60%, #047857 100%)',
          borderRadius: 24, padding: 32, color: '#fff',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(16,185,129,0.35)',
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          💰 {isAr ? 'رصيد المحفظة' : 'Wallet Balance'}
        </p>
        {profileLoading ? (
          <div style={{ height: 64, display: 'flex', alignItems: 'center' }}><Spinner /></div>
        ) : (
          <h1 style={{ fontSize: 52, fontWeight: 900, margin: '0 0 20px', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {balance.toFixed(2)}
            <span style={{ fontSize: 22, opacity: 0.75, marginInlineStart: 8 }}>{isAr ? 'جنيه' : 'EGP'}</span>
          </h1>
        )}
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/payment', { state: { topup: true } })}
          style={{
            background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.35)',
            color: '#fff', padding: '12px 28px', borderRadius: 14, cursor: 'pointer',
            fontSize: 14, fontWeight: 800, backdropFilter: 'blur(10px)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          ＋ {isAr ? 'شحن رصيد' : 'Top Up Wallet'}
        </motion.button>
      </motion.div>

      {/* ── Quick Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { icon: '💸', label: isAr ? 'إجمالي الإنفاق' : 'Total Spent',       value: `${totalSpent.toFixed(2)} ${isAr ? 'ج' : 'EGP'}` },
          { icon: '📚', label: isAr ? 'اشتراكات مدفوعة' : 'Paid Subscriptions', value: paidSubs },
          { icon: '🕐', label: isAr ? 'آخر عملية' : 'Last Transaction',
            value: lastTx ? new Date(lastTx.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '—' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="glass-panel" style={{ padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Quick Top-Up ── */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: 'var(--text)' }}>
          ⚡ {isAr ? 'شحن سريع' : 'Quick Top-Up'}
        </h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {QUICK_AMOUNTS.map(amt => (
            <motion.button
              key={amt} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
              onClick={() => navigate('/payment', { state: { topup: true, amount: amt } })}
              style={{
                padding: '12px 22px', borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--surface2)', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: 'var(--text)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              {amt} {isAr ? 'جنيه' : 'EGP'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            📋 {isAr ? 'سجل المعاملات' : 'Transaction History'}
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all', label: isAr ? 'الكل' : 'All' },
              { key: 'topup', label: isAr ? 'شحن' : 'Top-ups' },
              { key: 'subscription', label: isAr ? 'اشتراكات' : 'Subs' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: filter === f.key ? 'var(--primary)' : 'var(--surface2)',
                  color: filter === f.key ? '#fff' : 'var(--text3)',
                  transition: 'all 0.15s',
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {txLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>
              {isAr ? 'لا توجد معاملات بعد' : 'No transactions yet'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transactions.map((tx, i) => (
              <motion.div key={tx._id || i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, background: 'var(--surface3)',
                }}>
                  {TYPE_ICON[tx.type] || '💳'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.metadata?.title || (isAr ? 'معاملة' : 'Transaction')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {tx.gateway?.toUpperCase()} · {new Date(tx.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </div>
                </div>
                <div style={{ textAlign: 'end', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 16, fontWeight: 800,
                    color: tx.type === 'wallet_topup' ? '#10B981' : '#EF4444',
                  }}>
                    {tx.type === 'wallet_topup' ? '+' : '-'}{Number(tx.amount).toFixed(2)} {isAr ? 'ج' : 'EGP'}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20, marginTop: 4, display: 'inline-block',
                    background: tx.status === 'success' ? 'rgba(16,185,129,0.12)' : tx.status === 'pending' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                    color: tx.status === 'success' ? '#10B981' : tx.status === 'pending' ? '#F59E0B' : '#EF4444',
                    fontWeight: 700,
                  }}>
                    {isAr
                      ? (tx.status === 'success' ? 'ناجح' : tx.status === 'pending' ? 'معلق' : 'فاشل')
                      : tx.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
