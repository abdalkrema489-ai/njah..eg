import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { groupsAPI } from '../../api/index';

export default function LeaderboardWidget({ groupId, currentUserId, isAr }) {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', groupId],
    queryFn:  () => groupsAPI.getLeaderboard(groupId).then(r => r.data.leaderboard),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const MEDALS = ['🥇','🥈','🥉'];

  if (isLoading) return <div style={{ padding:20, textAlign:'center', color:'var(--text3)', fontSize:13 }}>...</div>;
  if (!data?.length) return (
    <div style={{ padding:20, textAlign:'center', color:'var(--text4)', fontSize:13 }}>
      {isAr ? 'لا توجد بيانات بعد — شارك في اختبار لتظهر هنا!' : 'No data yet — take a quiz to appear here!'}
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <h4 style={{ fontSize:13, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>
        🏆 {isAr ? 'المتصدرون هذا الأسبوع' : "This Week's Leaders"}
      </h4>

      {data.map((s, i) => {
        const isMe = s.user_id === String(currentUserId);
        return (
          <motion.div key={s.user_id}
            initial={{ opacity:0, x: isAr ? 20 : -20 }}
            animate={{ opacity:1, x:0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
              borderRadius:12, background: isMe ? 'rgba(99,102,241,0.1)' : 'var(--surface2)',
              border: `1px solid ${isMe ? 'var(--primary)' : 'var(--border)'}`,
            }}>
            <span style={{ fontSize:20, width:28, textAlign:'center' }}>
              {i < 3 ? MEDALS[i] : `${i+1}`}
            </span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
                {s.name} {isMe && <span style={{ fontSize:11, color:'var(--primary)' }}>({isAr?'أنت':'You'})</span>}
              </div>
              <div style={{ fontSize:11, color:'var(--text4)' }}>
                {isAr ? `${s.quizzes_this_week} اختبار · متوسط ${s.avg_score}%` : `${s.quizzes_this_week} quizzes · avg ${s.avg_score}%`}
              </div>
            </div>
            <div style={{ fontSize:14, fontWeight:800, color: i===0?'#F59E0B':i===1?'#6B7280':'var(--text3)' }}>
              {s.weekly_xp} XP
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
