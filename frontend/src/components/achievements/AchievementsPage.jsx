// src/components/achievements/AchievementsPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { achievementsAPI } from '../../api/index';
import { useAuthStore } from '../../context/store';
import { Card, Tabs, SectionHeader, Avatar, ProgressBar, EmptyState, Spinner } from '../shared/UI';
import { haptic } from '../../utils/haptics';

export default function AchievementsPage() {
  const { user }  = useAuthStore();
  const [tab, setTab] = useState('achievements');

  const { data: achData, isLoading }  = useQuery({ queryKey:['achievements'],  queryFn:achievementsAPI.list });
  const { data: lbData,  isLoading:lbLoad } = useQuery({ queryKey:['leaderboard'], queryFn:achievementsAPI.leaderboard });

  const all        = achData?.data?.achievements || [];
  const earned     = all.filter(a=>a.earned);
  const locked     = all.filter(a=>!a.earned);
  const leaderboard= lbData?.data?.leaderboard || [];
  const xpPct      = ((user?.xp_points % (user?.level * 200)) / (user?.level * 200) * 100) || 0;

  const CAT_COLORS = { general:'var(--primary)',study:'var(--accent2)',files:'var(--info)',
    streak:'var(--danger)',quiz:'var(--accent)',community:'#A78BFA',focus:'#34D399',ai:'var(--primary-light)',
    notes:'#F9A8D4', level:'#F7B731' };

  const TABS = [
    { key:'achievements', label:'Achievements', icon:'🏆' },
    { key:'leaderboard',  label:'Leaderboard',  icon:'👑' },
  ];

  return (
    <div>
      <SectionHeader icon="🏆" title="Achievements" subtitle="Track your milestones and compete on the leaderboard" />

      <div className="grid-4" style={{ marginBottom:28 }}>
        {[
          { icon:'⭐', val:`Level ${user?.level||1}`, label:'Cognitive Level', c:'var(--primary)' },
          { icon:'💎', val:(user?.xp_points||0).toLocaleString(), label:'Total Intellect XP', c:'var(--brand-400)' },
          { icon:'🏆', val:earned.length, label:'Milestones Cleared', c:'var(--success)' },
          { icon:'🔥', val:`${user?.streak_days||0}D`, label:'Discipline Streak', c:'var(--danger)' },
        ].map(s=>(
          <div key={s.label} className="floating-panel" style={{ textAlign:'center', padding:24, borderRadius: 20 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:950, color:s.c, fontFamily:'var(--font-head)', letterSpacing: '-0.02em' }}>{s.val}</div>
            <div style={{ fontSize:10, color:'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="floating-panel" style={{ marginBottom:32, padding: 24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text4)', marginBottom:12, fontWeight: 800 }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank: Level {user?.level}</span>
          <span>{user?.level*200 - (user?.xp_points%((user?.level||1)*200))} XP TO ASCEND</span>
        </div>
        <ProgressBar value={xpPct} max={100} color="var(--primary)" height={12} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'achievements' && (
        <>
          {isLoading ? <div style={{textAlign:'center',padding:48}}><Spinner size="lg"/></div> : (
            <>
              <div style={{ fontSize:13, fontWeight:900, marginBottom:16, color:'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                🌟 UNLOCKED MILESTONES ({earned.length})
              </div>
              <div className="grid-2" style={{ marginBottom:40 }}>
                <AnimatePresence>
                  {earned.map((a,i) => (
                    <motion.div key={a.id} 
                      initial={{opacity:0, scale:0.92, y: 10}} 
                      animate={{opacity:1, scale:1, y: 0}} 
                      whileHover={{ scale: 1.02, x: 4 }}
                      transition={{delay:i*0.03}}
                      className="floating-card"
                      style={{ 
                        display:'flex', alignItems:'center', gap:18, padding:'20px 24px',
                        borderRadius:20,
                        borderLeft:`4px solid var(--primary)`,
                        transition: 'all 0.22s var(--ease)'
                      }}>
                      <div style={{ width:60, height:60, borderRadius:18, 
                        background:'rgba(124,58,237,0.12)',
                        boxShadow: '0 0 20px rgba(124,58,237,0.15)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, flexShrink:0 }}>{a.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:900, fontSize:15, marginBottom:4, fontFamily: 'var(--font-head)', letterSpacing: '-0.01em', color: 'var(--text)' }}>{a.title}</div>
                        <div style={{ fontSize:12, color:'var(--text4)', marginBottom:8, lineHeight: 1.5, fontWeight: 500 }}>{a.description}</div>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                          <span style={{ fontSize:11, fontWeight:900, color:'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>+{a.xp_reward} INTELLECT XP</span>
                          {a.earned_at && <span style={{ fontSize:11, color:'var(--text4)', fontWeight: 800 }}>· {format(new Date(a.earned_at),'MMM d, yyyy')}</span>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div style={{ fontSize:13, fontWeight:900, marginBottom:16, color:'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                🔒 POTENTIAL INSIGHTS ({locked.length})
              </div>
              <div className="grid-2">
                {locked.map(a=>(
                  <div key={a.id} className="floating-card" style={{ display:'flex', alignItems:'center', gap:18, padding:'16px 20px',
                    borderRadius:20, opacity:0.5, filter:'grayscale(1)' }}>
                    <div style={{ width:52, height:52, borderRadius:16, background:'rgba(255,255,255,0.05)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{a.icon}</div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color: 'var(--text4)' }}>{a.title}</div>
                      <div style={{ fontSize:11, color:'var(--text4)', opacity: 0.8 }}>{a.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'leaderboard' && (
        <div className="floating-panel" style={{ padding: 28 }}>
          {lbLoad ? <div style={{textAlign:'center',padding:48}}><Spinner size="lg"/></div> :
          leaderboard.length===0 ? <EmptyState icon="👑" title="No rankings yet" /> :
          leaderboard.map((u,i)=>(
            <motion.div key={u.id} 
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.03 }}
              style={{ display:'flex', alignItems:'center', gap:16,
              padding:'16px 0', borderBottom: i<leaderboard.length-1 ? '1px solid var(--border)' : '' }}>
              <div style={{ width:40, height:40, borderRadius:14, display:'flex', alignItems:'center',
                justifyContent:'center', fontWeight:950, fontSize:15, flexShrink:0, fontFamily: 'var(--font-head)',
                background: i===0?'rgba(247,183,49,0.2)':i===1?'rgba(192,192,192,0.2)':i===2?'rgba(205,127,50,0.2)':'rgba(255,255,255,0.03)',
                color: i===0?'#F7B731':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--text4)',
                boxShadow: i < 3 ? '0 0 15px currentColor' : 'none' }}>
                {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
              </div>
              <Avatar name={u.name} src={u.avatar_url} size={44} style={{ border: i < 3 ? `2px solid ${i===0?'#F7B731':i===1?'#C0C0C0':'#CD7F32'}` : 'none' }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:900, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{u.name}</div>
                <div style={{ fontSize:11, color:'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level {u.level} · {u.grade||'Scholar'}</div>
              </div>
              <div style={{ fontWeight:950, fontSize:18, color:'var(--primary)', fontFamily:'var(--font-head)', textShadow: '0 0 10px rgba(124,58,237,0.2)' }}>
                {Number(u.xp_points).toLocaleString()} <span style={{ fontSize: 10, opacity: 0.8 }}>XP</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
