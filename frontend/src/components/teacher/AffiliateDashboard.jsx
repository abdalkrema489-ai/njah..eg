// src/components/teacher/AffiliateDashboard.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { affiliateAPI } from '../../api/index';
import { Card, SectionHeader, Button, Spinner, StatCard, EmptyState } from '../shared/UI';
import { useTranslation } from '../../i18n/index';

export default function AffiliateDashboard() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState('');
  const [rate, setRate] = useState(10);
  const [showGen, setShowGen] = useState(false);

  const { data, isLoading } = useQuery({ 
    queryKey: ['affiliate-links'], 
    queryFn: affiliateAPI.getLinks 
  });

  const links = Array.isArray(data?.data?.data) ? data.data.data : [];

  const createMutation = useMutation({
    mutationFn: affiliateAPI.createLink,
    onSuccess: () => {
      toast.success(isAr ? 'تم إنشاء الرابط بنجاح!' : 'Link created successfully!');
      queryClient.invalidateQueries(['affiliate-links']);
      setShowGen(false);
      setNewCode('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create link')
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newCode) return;
    createMutation.mutate({ code: newCode, commissionRate: rate });
  };

  const copyToClipboard = (code) => {
    const url = `${window.location.origin}/join?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success(isAr ? 'تم نسخ الرابط!' : 'Link copied!');
  };

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:64 }}><Spinner size="lg" /></div>;

  const totalClicks = links.reduce((acc, l) => acc + l.clicks, 0);
  const totalConversions = links.reduce((acc, l) => acc + l.conversions, 0);
  const totalEarnings = links.reduce((acc, l) => acc + (l.earnedAmount || 0), 0);

  return (
    <div className="animate-fade-up">
      <SectionHeader 
        icon="🚀" 
        title={isAr ? "نظام التسويق والعمولات" : "Affiliate & Marketing"} 
        subtitle={isAr ? "قم بإنشاء روابط ترويجية واربح عمولات عند انضمام طلاب جدد." : "Create promotional links and earn commissions when new students join."} 
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:20, marginBottom:32 }}>
        <StatCard icon="🖱️" label={isAr ? "إجمالي النقرات" : "Total Clicks"} value={totalClicks} color="var(--primary)" />
        <StatCard icon="🎯" label={isAr ? "التحويلات" : "Conversions"} value={totalConversions} color="var(--success)" />
        <StatCard icon="💰" label={isAr ? "الأرباح" : "Earnings"} value={`${totalEarnings} EGP`} color="var(--warning)" />
        <StatCard icon="🔗" label={isAr ? "الروابط النشطة" : "Active Links"} value={links.length} color="var(--accent)" />
      </div>

      <Card style={{ marginBottom: 32, padding: 28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:18, fontWeight:800, fontFamily:'var(--font-head)' }}>{isAr ? "روابطك الترويجية" : "Your Referral Links"}</h3>
          <Button variant="primary" size="sm" onClick={() => setShowGen(!showGen)}>
            {showGen ? (isAr ? 'إغلاق' : 'Close') : (isAr ? '+ إنشاء رابط جديد' : '+ Create New Link')}
          </Button>
        </div>

        <AnimatePresence>
          {showGen && (
            <motion.form 
              initial={{ height:0, opacity:0 }} 
              animate={{ height:'auto', opacity:1 }} 
              exit={{ height:0, opacity:0 }}
              onSubmit={handleCreate}
              style={{ background:'var(--surface2)', padding:20, borderRadius:16, marginBottom:24, display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:16, alignItems:'flex-end', border:'1px solid var(--border)' }}
            >
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text3)', marginBottom:6 }}>{isAr ? 'كود مخصص (مثال: MATH10)' : 'Custom Code (e.g. MATH10)'}</label>
                <input 
                  value={newCode} 
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontWeight:700 }}
                  placeholder="CODE"
                />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text3)', marginBottom:6 }}>{isAr ? 'نسبة العمولة (%)' : 'Commission Rate (%)'}</label>
                <input 
                  type="number"
                  value={rate} 
                  onChange={(e) => setRate(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontWeight:700 }}
                  min="0" max="100"
                />
              </div>
              <Button type="submit" variant="primary" loading={createMutation.isPending}>{isAr ? 'إنشاء' : 'Create'}</Button>
            </motion.form>
          )}
        </AnimatePresence>

        {!links.length ? <EmptyState icon="🔗" title={isAr ? "لا توجد روابط" : "No links yet"} subtitle={isAr ? "أنشئ أول رابط لك وابدأ في مشاركته!" : "Create your first link and start sharing!"} /> :
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {links.map((link) => (
              <motion.div key={link.code} className="floating-card" style={{ display:'flex', alignItems:'center', gap:20, padding:'16px 20px', borderRadius:16 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🎁</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:900, color:'var(--primary-light)', fontFamily:'var(--font-mono)' }}>{link.code}</span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'var(--surface3)', color:'var(--text3)', fontWeight:700 }}>{link.commissionRate}% {isAr ? 'عمولة' : 'Rate'}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)', display:'flex', gap:12 }}>
                    <span>🖱️ {link.clicks} {isAr ? 'نقرة' : 'clicks'}</span>
                    <span>🎯 {link.conversions} {isAr ? 'تحويل' : 'conv'}</span>
                    <span style={{ color:'var(--success)', fontWeight:800 }}>💰 {(link.earnedAmount || 0).toFixed(2)} EGP</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(link.code)}>
                  {isAr ? 'نسخ الرابط 📋' : 'Copy Link 📋'}
                </Button>
              </motion.div>
            ))}
          </div>
        }
      </Card>

      <div className="floating-panel" style={{ padding: 28, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)' }}>
        <h3 style={{ fontSize:16, fontWeight:800, marginBottom:12 }}>{isAr ? 'كيف يعمل النظام؟' : 'How it works?'}</h3>
        <ul style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, paddingLeft:20 }}>
          <li>{isAr ? 'شارك رابط الإحالة الخاص بك مع الطلاب أو المسوقين.' : 'Share your referral link with students or marketers.'}</li>
          <li>{isAr ? 'عندما يفتح الطالب الرابط، يتم حفظ كود الإحالة في المتصفح.' : 'When a student opens the link, the referral code is saved in their browser.'}</li>
          <li>{isAr ? 'إذا قام الطالب بالاشتراك في مجموعة مدفوعة، يتم حساب العمولة لك تلقائياً.' : 'If the student joins a paid group, the commission is automatically credited to you.'}</li>
          <li>{isAr ? 'يمكنك سحب أرباحك إلى محفظتك الإلكترونية في أي وقت.' : 'You can withdraw your earnings to your wallet anytime.'}</li>
        </ul>
      </div>
    </div>
  );
}
