import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useUIStore } from '../../context/store';

// ── Export Users CSV (UTF-8 BOM for Excel Arabic support) ────
function exportUsersCSV(users, isAr) {
  if (!users?.length) return toast.error(isAr ? 'لا يوجد مستخدمون' : 'No users to export');
  const headers = isAr
    ? 'الاسم,البريد,الدور,الحالة,طريقة التسجيل,تاريخ الانضمام'
    : 'Name,Email,Role,Status,Join Type,Joined Date';
  const rows = users.map(u =>
    `"${u.name}","${u.email}","${u.role}",` +
    `"${u.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}",` +
    `"${u.is_google_user ? 'Google' : 'Email'}",` +
    `"${new Date(u.created_at).toLocaleDateString()}"`
  );
  const csv  = [headers, ...rows].join('\n');
  // \uFEFF = UTF-8 BOM — makes Excel open Arabic correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

function downloadCSV(data, filename) {
  if (!data || !data.length) return toast.error('No data to export');
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(h => {
    const val = obj[h];
    return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
  }).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const computeForecast = (data) => {
  if (!data || data.length < 2) return data.map(d => ({ name: d.label?.slice(5), Gross: d.revenue, Platform: d.platformEarnings }));
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  data.forEach((d, i) => { sumX += i; sumY += d.revenue; sumXY += i * d.revenue; sumX2 += i * i; });
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const nextVal = slope * n + intercept;
  
  const feePercent = data[0].revenue ? data[0].platformEarnings / data[0].revenue : 0.1; 
  const nextPlatform = nextVal * feePercent;

  const lastLabel = data[n-1].label;
  let [year, month] = lastLabel.split('-').map(Number);
  month++;
  if(month > 12) { month = 1; year++; }
  const nextLabel = `${year}-${String(month).padStart(2,'0')}`;

  return [...data.map(d => ({ name: d.label.slice(5), Gross: d.revenue, Platform: d.platformEarnings })), 
          { name: nextLabel.slice(5) + ' (Est)', GrossForecast: Math.max(0, nextVal), PlatformForecast: Math.max(0, nextPlatform) }];
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function adminClient() {
  const token = localStorage.getItem('adminToken');
  return axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } });
}

const COLORS = {
  purple: '#8B5CF6', indigo: '#6366F1', green: '#10B981',
  amber: '#F59E0B', red: '#EF4444', blue: '#3B82F6',
};

function StatCard({ icon, label, value, sub, color = COLORS.indigo }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} style={{
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: color + '22', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22,
        }}>{icon}</div>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ color: '#fff', fontSize: 30, fontWeight: 900 }}>{value}</div>
      {sub && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </motion.div>
  );
}

function EarningsCard({ revenue }) {
  if (!revenue) return null;
  const { total, platformEarnings, teacherEarnings, feePercent, transactionCount, monthly = [] } = revenue;
  const maxRev = Math.max(...monthly.map(m => m.revenue), 1);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 24, padding: 28, gridColumn: '1 / -1',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>💰 Earnings Calculator</h2>
        <span style={{
          background: 'rgba(99,102,241,0.2)', color: '#A78BFA',
          padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
        }}>Platform Fee: {feePercent}%</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Gross Revenue', val: `EGP ${total?.toLocaleString() || '0'}`, color: COLORS.blue, icon: '💳' },
          { label: 'Your Earnings (Platform)', val: `EGP ${platformEarnings?.toFixed(0) || '0'}`, color: COLORS.green, icon: '🏦' },
          { label: 'Teachers\' Payouts', val: `EGP ${teacherEarnings?.toFixed(0) || '0'}`, color: COLORS.purple, icon: '👨‍🏫' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} style={{
            background: color + '15', border: `1px solid ${color}33`,
            borderRadius: 16, padding: '20px 18px',
          }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 6 }}>{label}</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Monthly Area Chart via Recharts */}
      {monthly.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 16 }}>
          <div style={{ color: '#A78BFA', fontSize: 14, marginBottom: 20, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
            <span>📈 MONTHLY REVENUE COMPARISON</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Platform vs Gross</span>
          </div>
          <div style={{ width: '100%', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={computeForecast(monthly)}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPlatform" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" tickLine={false} axisLine={false} tickFormatter={(val) => `EGP ${val}`} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} 
                  itemStyle={{ color: '#fff', fontWeight: 600 }}
                  formatter={(value, name) => [`EGP ${value.toFixed(0)}`, name.replace('Forecast', ' (AI Forecast)')]}
                />
                <Area type="monotone" dataKey="Gross" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorGross)" />
                <Area type="monotone" dataKey="Platform" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorPlatform)" />
                {monthly.length > 1 && (
                  <>
                    <Area type="monotone" dataKey="GrossForecast" stroke="#6366F1" strokeWidth={3} strokeDasharray="6 6" fill="none" />
                    <Area type="monotone" dataKey="PlatformForecast" stroke="#10B981" strokeWidth={3} strokeDasharray="6 6" fill="none" />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', fontWeight: 500 }}>
        Total <strong>{transactionCount}</strong> successful transactions processed
      </div>
    </div>
  );
}

function UsersTable({ users = [], onToggle, isAr, onExport }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 24, overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800 }}>👥 {isAr ? 'المستخدمون' : 'Users'}</h3>
        <button onClick={onExport} style={{
          background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
          color: '#34D399', padding: '6px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700
        }}>📥 {isAr ? 'تصدير CSV' : 'Export CSV'}</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              {[
                isAr ? 'الاسم'           : 'Name',
                isAr ? 'البريد'          : 'Email',
                isAr ? 'الدور'           : 'Role',
                isAr ? 'تاريخ الانضمام' : 'Joined',
                isAr ? 'طريقة التسجيل'  : 'Join Type',
                isAr ? 'الحالة'          : 'Status',
                isAr ? 'إجراءات'         : 'Actions',
              ].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left',
                  color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 10).map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px 16px', color: '#fff', fontSize: 13, fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: u.role === 'teacher' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)',
                    color: u.role === 'teacher' ? '#A78BFA' : '#60A5FA',
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  }}>{u.role}</span>
                </td>
                <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12 }}>
                  {u.is_google_user ? '🔵 Google' : '📧 Email'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: u.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    color: u.is_active ? '#34D399' : '#F87171',
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  }}>{u.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'محظور' : 'Banned')}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => onToggle(u)} style={{
                    background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
                    color: '#fff', padding: '5px 12px', borderRadius: 8, fontSize: 11,
                  }}>{u.is_active ? (isAr ? 'حظر' : 'Ban') : (isAr ? 'رفع الحظر' : 'Unban')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: '📊 Overview' },
  { id: 'earnings',  label: '💰 Earnings & Reports' },
  { id: 'wallets',   label: '💳 Wallets & Codes' },
  { id: 'coupons',   label: '🎟️ Coupons' },
  { id: 'support',   label: '🎧 Support' },
  { id: 'advisor',   label: '🤖 AI Advisor' },
  { id: 'users',     label: '👥 Users' },
  { id: 'groups',    label: '🎓 Groups & Analytics' },
  { id: 'settings',  label: '⚙️ Settings' },
];

export default function AdminDashboard() {
  const nav = useNavigate();
  const { darkMode, toggleDark, language, setLanguage } = useUIStore();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats]         = useState(null);
  const [earnings, setEarnings]   = useState(null);
  const [users, setUsers]         = useState([]);
  const [groups, setGroups]       = useState([]);
  const [codes, setCodes]         = useState([]);
  const [coupons, setCoupons]     = useState([]);
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [feeInput, setFeeInput]   = useState('');
  const [branding, setBranding]   = useState({ platformName: 'Najah', primaryColor: '#6366F1', logoEmoji: '🎓' });
  
  // AI Advisor State
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorChat, setAdvisorChat]   = useState([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const owner = JSON.parse(localStorage.getItem('adminOwner') || '{}');

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminOwner');
    nav('/admin/login');
  };

  const fetchStats = useCallback(async () => {
    const c = adminClient();
    try {
      const [s, sDetailed, e, u, g, cData, bData, coupData, tickData] = await Promise.allSettled([
        c.get('/admin/stats'),
        c.get('/admin/stats/detailed'),
        c.get('/admin/earnings'),
        c.get('/admin/users'),
        c.get('/admin/groups'),
        c.get('/admin/codes'),
        c.get('/admin/branding'),
        c.get('/admin/coupons'),
        c.get('/admin/support-tickets?status=all')
      ]);
      if (s.status === 'fulfilled' || sDetailed.status === 'fulfilled') {
        setStats({
          ...(s.status === 'fulfilled' ? s.value.data : {}),
          ...(sDetailed.status === 'fulfilled' ? sDetailed.value.data : {})
        });
      }
      if (e.status === 'fulfilled') { setEarnings(e.value.data); setFeeInput(String(e.value.data.summary?.feePercent || 10)); }
      if (u.status === 'fulfilled') setUsers(u.value.data.users || []);
      if (g.status === 'fulfilled') setGroups(g.value.data.groups || []);
      if (cData.status === 'fulfilled') setCodes(cData.value.data.codes || []);
      if (bData.status === 'fulfilled') setBranding(bData.value.data);
      if (coupData.status === 'fulfilled') setCoupons(coupData.value.data.coupons || []);
      if (tickData.status === 'fulfilled') setTickets(tickData.value.data.tickets || []);
    } catch {
      toast.error('Session expired'); logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { nav('/admin/login'); return; }
    fetchStats();

    // Setup Live Feed Socket
    const socket = io(API.replace('/api', ''), { auth: { token } });
    socket.emit('join_admin_room');
    
    socket.on('admin_new_transaction', (tx) => {
      toast.custom((t) => (
        <div style={{
          background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: 16, padding: 16, display: 'flex', gap: 12, alignItems: 'center',
          boxShadow: '0 10px 40px rgba(16,185,129,0.2)', color: '#fff'
        }}>
          <div style={{ fontSize: 24 }}>💸</div>
          <div>
            <div style={{ fontWeight: 800, color: '#34D399' }}>New Payment: EGP {tx.amount}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{tx.title} via {tx.gateway?.toUpperCase()}</div>
          </div>
        </div>
      ), { duration: 5000, position: 'bottom-right' });
      // We can also trigger fetchStats() but it might be heavy on traffic if there are many.
      // So we just show the live toast to let them know!
    });

    return () => socket.disconnect();
  }, [fetchStats, nav]);

  const toggleUser = async (u) => {
    try {
      await adminClient().patch(`/admin/users/${u.id}`, { is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
      toast.success(`User ${u.is_active ? 'banned' : 'activated'}`);
    } catch { toast.error('Failed'); }
  };

  const updateFee = async () => {
    const fee = parseFloat(feeInput);
    if (isNaN(fee) || fee < 0 || fee > 50) return toast.error('Fee must be 0–50%');
    try {
      await adminClient().patch('/admin/settings/fee', { feePercent: fee });
      toast.success(`Platform fee updated to ${fee}%`);
      fetchStats();
    } catch { toast.error('Failed to update fee'); }
  };

  const settleTeacher = async (teacherName) => {
    try {
      const { data } = await adminClient().post('/admin/settle', { teacherName });
      toast.success(`Successfully settled ${data.settledCount} transactions for ${teacherName}`);
      fetchStats(); // Refresh data immediately
    } catch (err) {
      toast.error('Failed to settle payouts');
    }
  };

  const handleAdvisorSubmit = async (e) => {
    e.preventDefault();
    if (!advisorInput.trim()) return;
    const prompt = advisorInput.trim();
    setAdvisorInput('');
    setAdvisorChat(prev => [...prev, { role: 'admin', content: prompt }]);
    setAdvisorLoading(true);
    try {
      const payload = { prompt, stats: { ...stats, revenue: earnings?.summary } };
      const { data } = await adminClient().post('/admin/advisor', payload);
      setAdvisorChat(prev => [...prev, { role: 'ai', content: data.advice }]);
    } catch (err) {
      toast.error('AI Advisor error');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const generateCodes = async (e) => {
    e.preventDefault();
    const amount = e.target.amount.value;
    const count = e.target.count.value;
    try {
      const { data } = await adminClient().post('/admin/codes/generate', { amount: Number(amount), count: Number(count) });
      toast.success(`Generated ${data.count} codes successfully!`);
      fetchStats();
      e.target.reset();
    } catch { toast.error('Failed to generate codes'); }
  };

  const updateBranding = async (e) => {
    e.preventDefault();
    try {
      await adminClient().post('/admin/branding', branding);
      toast.success('Branding updated! Reloading app to apply globally...');
      setTimeout(() => window.location.reload(), 1500);
    } catch { toast.error('Failed to update branding'); }
  };

  const generateCoupon = async (e) => {
    e.preventDefault();
    const payload = {
      code: e.target.code.value,
      type: e.target.type.value,
      value: e.target.valueInput.value,
      maxUses: e.target.maxUses.value
    };
    try {
      await adminClient().post('/admin/coupons', payload);
      toast.success('Coupon created successfully!');
      fetchStats();
      e.target.reset();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create coupon'); }
  };

  const replyToTicket = async (e, id) => {
    e.preventDefault();
    const reply = e.target.reply.value;
    try {
      await adminClient().patch(`/admin/support-tickets/${id}`, { reply, status: 'resolved' });
      toast.success('Reply sent successfully');
      fetchStats();
    } catch (err) { toast.error('Failed to reply'); }
  };

  const bgStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    color: '#fff', fontFamily: "'Inter', sans-serif",
  };

  if (loading) return (
    <div style={{ ...bgStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading admin portal…</p>
      </div>
    </div>
  );

  return (
    <div style={bgStyle}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🎓</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Najah Admin</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{owner.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={toggleDark} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
            width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }} title="Toggle Theme">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
            width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }} title="Language">
            {language === 'en' ? 'AR' : 'EN'}
          </button>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          <button onClick={fetchStats} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff',
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          }}>🔄 Refresh</button>
          <button onClick={logout} style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#F87171', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          }}>🚪 Logout</button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === t.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
              color: activeTab === t.id ? '#A78BFA' : 'rgba(255,255,255,0.5)',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              border: activeTab === t.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
            }}>
              {isAr ? (t.id === 'overview' ? 'نظرة عامة' : t.id === 'earnings' ? 'الأرباح والتقارير' : t.id === 'wallets' ? 'المحافظ والأكواد' : t.id === 'coupons' ? 'الكوبونات' : t.id === 'support' ? 'الدعم الفني' : t.id === 'advisor' ? 'المستشار الذكي' : t.id === 'users' ? 'المستخدمون' : t.id === 'groups' ? 'المجموعات والتحليلات' : 'الإعدادات') : t.label}
              {t.id === 'support' && stats?.open_tickets > 0 && (
                <span style={{ background: '#EF4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: 10 }}>{stats.open_tickets}</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && stats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <StatCard icon="👥" label={isAr ? 'إجمالي المستخدمين' : 'Total Users'}   value={parseInt(stats.total_users || 0).toLocaleString()} sub={`${stats.new_this_week || 0} ${isAr ? 'جديد هذا الأسبوع' : 'new this week'}`} color={COLORS.blue} />
                  <StatCard icon="🎓" label={isAr ? 'الطلاب' : 'Students'}                  value={parseInt(stats.students || 0).toLocaleString()}    color={COLORS.indigo} />
                  <StatCard icon="👨‍🏫" label={isAr ? 'المعلمون' : 'Teachers'}               value={parseInt(stats.teachers || 0).toLocaleString()}    color={COLORS.purple} />
                  <StatCard icon="⚡" label={isAr ? 'نشط (24 ساعة)' : 'Active (24h)'}       value={parseInt(stats.active_today || 0).toLocaleString()} color={COLORS.green} />
                  <StatCard icon="🔵" label={isAr ? 'مستخدمو Google' : 'Google Users'}      value={parseInt(stats.google_users || 0).toLocaleString()} color={COLORS.blue} />
                  <StatCard icon="🎧" label={isAr ? 'تذاكر مفتوحة' : 'Open Tickets'}        value={stats.open_tickets || 0}                           color={COLORS.red} />
                  <StatCard icon="🏫" label={isAr ? 'المجموعات' : 'Groups'}                 value={stats.groups?.total || 0} sub={`${stats.groups?.paid || 0} ${isAr ? 'مدفوعة' : 'paid'}`} color={COLORS.amber} />
                  <StatCard icon="💰" label={isAr ? 'أرباحك' : 'Your Earnings'}             value={`EGP ${(stats.revenue?.platformEarnings || 0).toFixed(0)}`} sub={`${stats.revenue?.feePercent || 10}% ${isAr ? 'عمولة المنصة' : 'platform fee'}`} color={COLORS.green} />
                </div>
                <EarningsCard revenue={stats.revenue} />


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                    <h3 style={{ color: '#fff', marginTop: 0, fontSize: 16, fontWeight: 800 }}>💳 Payment Gateways Used</h3>
                    <div style={{ width: '100%', minWidth: 0, marginTop: 20 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={stats.gatewayBreakdown || []} dataKey="total" nameKey="gateway" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} label={false}>
                            {stats.gatewayBreakdown?.map((entry, index) => {
                              const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} formatter={(val) => `EGP ${val}`} />
                          <Legend verticalAlign="bottom" height={36} formatter={(val) => <span style={{ color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{val}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                    <h3 style={{ color: '#fff', marginTop: 0, fontSize: 16, fontWeight: 800 }}>🏆 Top Earning Groups</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                      {(stats.groups?.topEarners || []).slice(0, 5).map((g, i) => (
                        <div key={g.groupId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 14, background: i === 0 ? '#F59E0B' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)' }}>#{i+1}</div>
                            <div>
                              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{g.name}</div>
                              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{g.teacherName}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#34D399', fontSize: 14, fontWeight: 800 }}>EGP {g.totalRevenue}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── EARNINGS ── */}
            {activeTab === 'earnings' && earnings && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button onClick={() => downloadCSV(earnings.teacherBreakdown.map(t => ({ Teacher: t.name, 'Gross Revenue': t.gross, 'Platform Fee': t.fee, 'Owed Payout': t.payout, 'Transactions': t.count })), 'teacher_payouts.csv')} style={{
                    background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399',
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600
                  }}>📥 Export Payouts (CSV)</button>
                  <button onClick={() => downloadCSV(earnings.transactions.map(t => ({ ID: t.transactionId || t._id, Gateway: t.gateway, Amount: t.amount, Date: new Date(t.createdAt).toLocaleDateString() })), 'transactions.csv')} style={{
                    background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#60A5FA',
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600
                  }}>📥 Export Transactions (CSV)</button>
                </div>

                <EarningsCard revenue={{ ...earnings.summary, monthly: stats?.revenue?.monthly || [] }} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Teacher Payouts Table */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24, overflowX: 'auto' }}>
                    <h3 style={{ color: '#fff', marginTop: 0, fontSize: 16, fontWeight: 800 }}>👨‍🏫 Teacher Payouts</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Teacher</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Total Owed</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Pending Settle</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.teacherBreakdown?.map(t => (
                          <tr key={t.name} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px', color: '#fff', fontSize: 13, fontWeight: 600 }}>{t.name}</td>
                            <td style={{ padding: '12px', color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'right' }}>EGP {t.payout.toFixed(0)}</td>
                            <td style={{ padding: '12px', color: t.pending > 0 ? '#34D399' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 800, textAlign: 'right' }}>EGP {(t.pending || 0).toFixed(0)}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {t.pending > 0 ? (
                                <button onClick={() => settleTeacher(t.name)} style={{
                                  background: 'rgba(99,102,241,0.2)', border: 'none', color: '#A78BFA', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer'
                                }}>Settle Now</button>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700 }}>Settled ✓</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!earnings.teacherBreakdown?.length && (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40, fontSize: 13 }}>No payouts yet</div>
                    )}
                  </div>

                  {/* Transaction Log */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                    <h3 style={{ color: '#fff', marginTop: 0, fontSize: 16, fontWeight: 800 }}>📋 Recent Transactions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                      {(earnings.transactions || []).slice(0, 8).map(tx => (
                        <div key={tx._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                          <div>
                            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{tx.group?.name || tx.metadata?.title || 'Payment'}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{tx.gateway?.toUpperCase()} · {new Date(tx.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#34D399', fontSize: 14, fontWeight: 800 }}>EGP {tx.amount}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!earnings.transactions?.length && (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40, fontSize: 13 }}>No transactions yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── AI ADVISOR ── */}
            {activeTab === 'advisor' && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24, minHeight: 500, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ fontSize: 32 }}>🤖</div>
                  <div>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>Najah AI Financial Advisor</h3>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Chat with your platform data to optimize growth and revenue</div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
                  {advisorChat.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', margin: 'auto', fontSize: 14 }}>
                      Ask me anything! Try: "Which group is generating the most profit?" or "How can I increase revenue next month?"
                    </div>
                  )}
                  {advisorChat.map((msg, i) => (
                    <div key={i} style={{ alignSelf: msg.role === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: msg.role === 'admin' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', border: msg.role === 'admin' ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.1)', padding: 16, borderRadius: 16, color: '#fff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      <div style={{ fontSize: 11, color: msg.role === 'admin' ? '#A78BFA' : '#34D399', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase' }}>{msg.role === 'admin' ? 'You' : 'Najah AI'}</div>
                      {msg.content}
                    </div>
                  ))}
                  {advisorLoading && (
                    <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 16, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                      Analyzing financial data...
                    </div>
                  )}
                </div>

                <form onSubmit={handleAdvisorSubmit} style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <input value={advisorInput} onChange={e => setAdvisorInput(e.target.value)} disabled={advisorLoading} placeholder="Ask about revenue, user trends, or pricing strategies..." style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 20px', borderRadius: 16, color: '#fff', fontSize: 14, outline: 'none' }} />
                  <button type="submit" disabled={advisorLoading || !advisorInput.trim()} style={{ background: '#6366F1', border: 'none', padding: '0 24px', borderRadius: 16, color: '#fff', fontWeight: 700, cursor: advisorLoading ? 'not-allowed' : 'pointer', opacity: advisorLoading ? 0.7 : 1 }}>Send</button>
                </form>
              </div>
            )}

            {/* ── WALLETS & CODES ── */}
            {activeTab === 'wallets' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                  <h3 style={{ color: '#fff', marginTop: 0, fontSize: 18, fontWeight: 800 }}>🎫 Generate Top-Up Codes</h3>
                  <form onSubmit={generateCodes} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginTop: 16 }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>Amount (EGP)</label>
                      <input name="amount" type="number" required min="10" placeholder="e.g. 100" style={{ padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>Quantity to Generate</label>
                      <input name="count" type="number" required min="1" max="500" placeholder="e.g. 50" style={{ padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }} />
                    </div>
                    <button type="submit" style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#10B981', color: '#fff', fontWeight: 700, cursor: 'pointer', height: 43 }}>
                      ✨ Generate Codes
                    </button>
                  </form>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>📋 Code Inventory</h3>
                    <button onClick={() => downloadCSV(codes.map(c => ({ Code: c.code, Amount: c.amount, Status: c.isUsed ? 'Used' : 'Unused', Date: new Date(c.createdAt).toLocaleDateString() })), 'topup_codes.csv')} style={{ background: 'rgba(59,130,246,0.2)', color: '#60A5FA', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      📥 Export All (CSV)
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: 400 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Code</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Amount</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codes.map(c => (
                          <tr key={c._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px', color: '#fff', fontSize: 14, fontFamily: 'monospace', letterSpacing: 1 }}>{c.code}</td>
                            <td style={{ padding: '12px', color: '#34D399', fontSize: 13, fontWeight: 800 }}>EGP {c.amount}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: c.isUsed ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: c.isUsed ? '#F87171' : '#34D399' }}>
                                {c.isUsed ? 'Used' : 'Available'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'right' }}>
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── COUPONS ── */}
            {activeTab === 'coupons' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                  <h3 style={{ color: '#fff', marginTop: 0, fontSize: 18, fontWeight: 800 }}>🎟️ Create New Coupon</h3>
                  <form onSubmit={generateCoupon} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, alignItems: 'flex-end', marginTop: 16 }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>Coupon Code</label>
                      <input name="code" type="text" required placeholder="e.g. VIP50" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>Discount Type</label>
                      <select name="type" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.8)', color: '#fff', outline: 'none' }}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (EGP)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>Value</label>
                      <input name="valueInput" type="number" required min="1" placeholder="e.g. 50" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>Usage Limit (0 = ∞)</label>
                      <input name="maxUses" type="number" defaultValue="0" min="0" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }} />
                    </div>
                    <button type="submit" style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontWeight: 700, cursor: 'pointer', height: 43 }}>
                      ✨ Create
                    </button>
                  </form>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📋 Active Coupons</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Code</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Type/Value</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Uses</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coupons.map(c => (
                          <tr key={c._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px', color: '#fff', fontSize: 14, fontWeight: 800 }}>{c.code}</td>
                            <td style={{ padding: '12px', color: '#FCD34D', fontSize: 13, fontWeight: 700 }}>
                              {c.type === 'percentage' ? `${c.value}% OFF` : `EGP ${c.value} OFF`}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                              {c.usedCount} / {c.maxUses === 0 ? '∞' : c.maxUses}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: c.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: c.isActive ? '#34D399' : '#F87171' }}>
                                {c.isActive ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'right' }}>
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUPPORT TICKETS ── */}
            {activeTab === 'support' && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>🎧 {isAr ? 'تذاكر الدعم الفني' : 'Support Tickets'}</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{isAr ? 'المستخدم' : 'User'}</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{isAr ? 'الموضوع والرسالة' : 'Subject & Message'}</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{isAr ? 'الحالة' : 'Status'}</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{isAr ? 'رد' : 'Reply'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map(t => (
                        <tr key={t.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', color: '#fff', fontSize: 13 }}>
                            <div>{t.user_name}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{t.user_email}</div>
                          </td>
                          <td style={{ padding: '12px', color: '#fff', fontSize: 13, maxWidth: 300 }}>
                            <div style={{ fontWeight: 700 }}>{t.category.toUpperCase()}: {t.subject}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.message}</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: t.status === 'open' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: t.status === 'open' ? '#F87171' : '#34D399' }}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {t.status === 'open' ? (
                              <form onSubmit={(e) => replyToTicket(e, t.id)} style={{ display: 'flex', gap: 8 }}>
                                <input name="reply" placeholder={isAr ? 'اكتب الرد...' : 'Type reply...'} required style={{ flex: 1, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 12 }} />
                                <button type="submit" style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#6366F1', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>{isAr ? 'إرسال الرد' : 'Send Reply'}</button>
                              </form>
                            ) : (
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Replied</div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {tickets.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.4)' }}>No tickets found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {activeTab === 'users' && (
              <UsersTable
                users={users}
                onToggle={toggleUser}
                isAr={isAr}
                onExport={() => exportUsersCSV(users, isAr)}
              />
            )}

            {/* ── GROUPS ── */}
            {activeTab === 'groups' && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 24, overflow: 'hidden',
              }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800 }}>
                    🎓 All Groups ({groups.length})
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        {['Group', 'Teacher', 'Students', 'Type', 'Price', 'Revenue', 'Your Cut'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groups.slice(0, 20).map(g => {
                        const maxRev = Math.max(...(g.monthlyRevenue?.map(m => m.revenue) || [0]), 1);
                        return (
                        <tr key={g._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 16px', color: '#fff', fontSize: 13, fontWeight: 600 }}>{g.emoji} {g.name}</td>
                          <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{g.teacherName}</td>
                          <td style={{ padding: '12px 16px', color: '#fff', fontSize: 13 }}>{g.students?.length || 0}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              background: g.isPaid ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                              color: g.isPaid ? '#FCD34D' : '#34D399',
                              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            }}>{g.isPaid ? '💰 Paid' : '🆓 Free'}</span>
                          </td>
                          <td style={{ padding: '12px 16px', color: g.isPaid ? '#FCD34D' : 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                            {g.isPaid ? `EGP ${g.price}` : '-'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ color: '#34D399', fontSize: 13, fontWeight: 700 }}>EGP {(g.totalRevenue || 0).toFixed(0)}</div>
                            {g.monthlyRevenue?.length > 0 && (
                              <div style={{ display: 'flex', gap: 2, marginTop: 6, height: 20, alignItems: 'flex-end' }}>
                                {g.monthlyRevenue.slice(-6).map((m, i) => (
                                  <div key={i} title={`${m.label}: EGP ${m.revenue}`} style={{
                                    width: 6, background: '#34D399', opacity: 0.8, borderRadius: 2,
                                    height: `${Math.max((m.revenue / maxRev) * 100, 10)}%`
                                  }} />
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#A78BFA', fontSize: 13, fontWeight: 700 }}>
                            EGP {(g.platformCut || 0).toFixed(0)}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 24, padding: 28,
                }}>
                  <h3 style={{ color: '#fff', marginTop: 0, fontSize: 18, fontWeight: 800 }}>
                    ⚙️ {isAr ? 'إعدادات المنصة' : 'Platform Settings'}
                  </h3>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                      {isAr ? 'رسوم المنصة (%)' : 'Platform Fee Percentage (%)'}
                    </label>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 0, marginBottom: 12 }}>
                      {isAr
                        ? 'هذه النسبة تُخصم من كل معاملة مجموعة مدفوعة كعمولة للمنصة.'
                        : 'This percentage is deducted from every paid group transaction as your platform commission.'}
                    </p>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <input
                        type="number" min="0" max="50" step="0.5"
                        value={feeInput} onChange={e => setFeeInput(e.target.value)}
                        style={{
                          padding: '12px 16px', borderRadius: 12, width: 120,
                          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff', fontSize: 18, fontWeight: 800, outline: 'none',
                        }}
                      />
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {isAr ? '% عمولة على كل المعاملات' : '% commission on all transactions'}
                      </span>
                    </div>
                    <button onClick={updateFee} style={{
                      marginTop: 16, padding: '12px 24px', borderRadius: 12, border: 'none',
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
                    }}>💾 {isAr ? 'حفظ إعدادات الرسوم' : 'Save Fee Settings'}</button>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }} />

                  <h3 style={{ color: '#fff', marginTop: 0, fontSize: 18, fontWeight: 800 }}>
                    🎨 {isAr ? 'المظهر والعلامة التجارية' : 'Appearance & Branding (White-Label)'}
                  </h3>
                  <form onSubmit={updateBranding} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                        {isAr ? 'اسم المنصة' : 'Platform Name'}
                      </label>
                      <input value={branding.platformName} onChange={e => setBranding({...branding, platformName: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                        {isAr ? 'اللون الأساسي' : 'Primary Theme Color'}
                      </label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <input type="color" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} style={{ width: 50, height: 50, padding: 0, border: 'none', borderRadius: 12, cursor: 'pointer', background: 'transparent' }} />
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>{branding.primaryColor}</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                        {isAr ? 'إيموجي الشعار' : 'Logo Emoji'}
                      </label>
                      <input value={branding.logoEmoji} onChange={e => setBranding({...branding, logoEmoji: e.target.value})} maxLength={2} style={{ width: 80, padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 20, outline: 'none', textAlign: 'center' }} />
                    </div>
                    <button type="submit" style={{ alignSelf: 'flex-start', padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                      {isAr ? 'تطبيق التغييرات عالمياً' : 'Apply Branding Globally'}
                    </button>
                  </form>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }} />

                  <div style={{
                    background: 'rgba(99,102,241,0.1)', borderRadius: 16, padding: 16,
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}>
                    <h4 style={{ color: '#A78BFA', marginTop: 0 }}>👤 {isAr ? 'حساب المالك' : 'Owner Account'}</h4>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
                      <strong style={{ color: '#fff' }}>{isAr ? 'الاسم:' : 'Name:'}</strong> {owner.name || 'Ahmed AbdEl-Kareem'}<br />
                      <strong style={{ color: '#fff' }}>{isAr ? 'البريد:' : 'Email:'}</strong> {owner.email || 'ahmed1abdalkrem1@gmail.com'}<br />
                      <strong style={{ color: '#fff' }}>{isAr ? 'الدور:' : 'Role:'}</strong> {isAr ? 'مالك المنصة' : 'Platform Owner'}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
