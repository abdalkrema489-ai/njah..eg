import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/index';

export default function AdminLoginPage() {
  const nav = useNavigate();
  const [email, setEmail]       = useState('ahmed1abdalkrem1@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleQuickFill = () => {
    setEmail('ahmed1abdalkrem1@gmail.com');
    setPassword('Admin@Najah2026!');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await client.post('/admin/login', { email, password });
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminOwner', JSON.stringify(data.owner));
      toast.success('Welcome back, ' + data.owner.name + '!');
      nav('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      fontFamily: "'Inter', sans-serif", padding: 20,
    }}>
      {/* animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[{ top: '10%', left: '15%', size: 350, color: 'rgba(99,102,241,0.15)' },
          { top: '60%', right: '10%', size: 280, color: 'rgba(139,92,246,0.12)' },
          { bottom: '10%', left: '30%', size: 200, color: 'rgba(236,72,153,0.08)' }
        ].map((orb, i) => (
          <div key={i} style={{
            position: 'absolute', ...orb,
            width: orb.size, height: orb.size, borderRadius: '50%',
            background: orb.color, filter: 'blur(80px)',
          }} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: '48px 40px',
          width: '100%', maxWidth: 420, boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          position: 'relative',
        }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 32, boxShadow: '0 8px 30px rgba(99,102,241,0.4)',
          }}>🎓</div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            Najah Admin Portal
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6 }}>
            Platform Owner Access Only
          </p>
        </div>

        {/* Badge */}
        <div style={{
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 28,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔐</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 1.5 }}>
              Restricted access. Use the button below to auto-fill development owner credentials.
            </span>
          </div>
          <button type="button" onClick={handleQuickFill} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#A78BFA', fontSize: 11, fontWeight: 700, padding: '6px 12px',
            borderRadius: 8, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
            alignSelf: 'flex-start', width: '100%',
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; }}
          >
            ⚡ Auto-Fill Admin Credentials
          </button>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
              OWNER EMAIL
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="owner@najah.com"
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••••••"
                style={{
                  width: '100%', padding: '13px 48px 13px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                fontSize: 16,
              }}>{showPass ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <motion.button
            type="submit" disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{
              padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontWeight: 800, fontSize: 15, marginTop: 8,
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? '⏳ Authenticating...' : '🔓 Access Dashboard'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 24 }}>
          Unauthorized access is prohibited and monitored.
        </p>
      </motion.div>
    </div>
  );
}
