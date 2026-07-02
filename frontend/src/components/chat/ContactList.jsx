import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useTranslation } from '../../i18n/index';
import { useUIStore } from '../../context/store';
import { Avatar } from '../shared/UI';

const SUBJECT_COLORS = {
  mathematics: '#6366F1',
  science: '#10B981',
  physics: '#06B6D4',
  chemistry: '#EC4899',
  biology: '#10B981',
  arabic: '#F59E0B',
  english: '#3B82F6',
  social_studies: '#EF4444',
  islamic_studies: '#059669',
};

const fmtTime = (d, isAr) => {
  try {
    if (isAr) {
      return new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));
    }
    return format(new Date(d), 'HH:mm');
  } catch {
    return '';
  }
};

export default function ContactList({
  sidebarOpen,
  setSidebarOpen,
  search,
  setSearch,
  privateChats,
  groupChats,
  activePrivateChat,
  selectChat,
  setShowCreateGroup,
  user
}) {
  const { t } = useTranslation();
  const language = useUIStore(s => s.language);
  const isAr = language === 'ar';

  return (
    <>
      <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        borderRight: isAr ? 'none' : '1px solid var(--border)',
        borderLeft: isAr ? '1px solid var(--border)' : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle noise SVG overlay */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.04 0" />
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>
        </svg>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#noise)', pointerEvents: 'none', opacity: 0.3 }} />

        {/* Sidebar Header */}
        <div style={{
          padding: '20px 16px 14px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              {t('chat.directMessages') ? t('chat.directMessages').split(' ')[0] : 'Messages'}
            </h2>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
              onClick={() => setShowCreateGroup(true)}
              title="Create New Group"
              style={{
                width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                fontSize: 18,
              }}
            >+</motion.button>
          </div>

          {/* Search */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>🔍</span>
            <input
              placeholder={t('chat.searchPlaceholder') || 'Search people...'}
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                width: '100%', fontSize: 13, color: '#fff', fontWeight: 500,
              }}
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="scroll-y" style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {/* Section: Direct Messages */}
          <div style={{ padding: '10px 16px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              💬 {t('chat.directMessages') || 'Direct Messages'}
            </span>
          </div>
          {privateChats.length === 0 && (
            <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text4)' }}>
              {search ? (isAr ? 'لم يتم العثور على مستخدمين' : 'No users found') : (t('chat.noChats') || 'No recent chats yet')}
            </div>
          )}
          {privateChats.map(r => (
            <ContactRow
              key={r.id} r={r}
              active={activePrivateChat === r.id}
              onClick={() => selectChat(r)}
              user={user}
              isAr={isAr}
            />
          ))}

          {/* Section: Groups */}
          {!search.trim() && (
            <>
              <div style={{ padding: '14px 16px 4px', marginTop: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  👥 {t('chat.groups') || 'Groups'}
                </span>
              </div>
              {groupChats.length === 0 && (
                <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text4)' }}>
                  {isAr ? 'لا توجد مجموعات بعد — ' : 'No groups yet — '}
                  <button onClick={() => setShowCreateGroup(true)} style={{ color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                    {isAr ? 'أنشئ واحدة' : 'create one'}
                  </button>
                </div>
              )}
              {groupChats.map(r => (
                <ContactRow
                  key={r.id} r={r}
                  active={activePrivateChat === r.id}
                  onClick={() => selectChat(r)}
                  user={user}
                  isAr={isAr}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ContactRow({ r, active, onClick, user, isAr }) {
  const ringColor = r.chatType === 'group' ? (SUBJECT_COLORS[r.subject] || '#38BDF8') : '#E2E8F0';
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: isAr ? -4 : 4 }}
      animate={{ backgroundColor: active ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0)' }}
      style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        cursor: 'pointer', borderRadius: 14, margin: '2px 8px',
        transition: 'background 0.15s',
        borderLeft: !isAr && active ? '3px solid var(--primary)' : '3px solid transparent',
        borderRight: isAr && active ? '3px solid var(--primary)' : '3px solid transparent',
        background: active ? 'rgba(255,255,255,0.06)' : undefined,
        backdropFilter: active ? 'blur(8px)' : undefined,
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          borderRadius: '50%',
          border: `2px solid ${ringColor}`,
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? `0 0 10px ${ringColor}40` : 'none'
        }}>
          <Avatar src={r.avatar || r.avatar_url} name={r.name} size={36} />
        </div>
        {r.online && (
          <div style={{
            position: 'absolute', bottom: 0, right: isAr ? 'auto' : 0, left: isAr ? 0 : 'auto',
            width: 10, height: 10, borderRadius: '50%',
            background: '#10b981', border: '2px solid #16213e',
            boxShadow: '0 0 8px #10b981',
          }} className="animate-pulse" />
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', marginLeft: isAr ? 0 : 12, marginRight: isAr ? 12 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 13.5, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
            {r.chatType === 'group' ? `👥 ${r.name}` : r.name}
          </span>
          {r.lastMsgTime && (
            <span style={{ fontSize: 10, color: 'var(--text4)', flexShrink: 0, marginLeft: isAr ? 0 : 4, marginRight: isAr ? 4 : 0 }}>
              {fmtTime(r.lastMsgTime, isAr)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.lastMsgIsMine ? '✓ ' : ''}{r.lastMsgText || (isAr ? 'ابدأ المحادثة...' : 'Start the conversation…')}
        </div>
      </div>
      {r.unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          style={{
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', fontSize: 10, fontWeight: 900,
            borderRadius: 10, minWidth: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: isAr ? 0 : 8, marginRight: isAr ? 8 : 0, flexShrink: 0,
            boxShadow: '0 4px 10px rgba(99,102,241,0.3)'
          }}
        >{r.unreadCount > 9 ? '9+' : r.unreadCount}</motion.div>
      )}
    </motion.div>
  );
}
