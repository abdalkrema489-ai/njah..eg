// src/context/store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Auth ────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      refresh:         null,
      isAuthenticated: false,

      setAuth: ({ user, token, refresh }) => {
        if (token)   localStorage.setItem('token',   token);
        if (refresh) localStorage.setItem('refresh', refresh);
        set({ user, token, refresh, isAuthenticated: true });
        // Sync institution mode from user profile (authoritative source)
        const institutionType = user?.institution_type || user?.institutionType || (user?.role === 'university' ? 'university' : null);
        if (institutionType) {
          useUIStore.getState().setInstitutionMode(
            institutionType === 'university' ? 'university' : 'school'
          );
        }
      },
      setUser:  u  => set({ user: u }),
      updateXP: (xp, level) => set(s => ({ user: { ...s.user, xp_points: xp, level } })),
      logout:   () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        set({ user: null, token: null, refresh: null, isAuthenticated: false });
      },
    }),
    {
      name: 'najah-auth',
      partialize: s => ({ token: s.token, refresh: s.refresh, isAuthenticated: s.isAuthenticated, user: s.user }),
    }
  )
);

// ── Role helper — single source of truth ─────────────────────
const UNI_GRADES = ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Postgrad'];
export const getUserRole = (user) => {
  if (!user) return 'school_student';
  if (['admin', 'platform_owner'].includes(user.role) || user.admin_level) return 'admin';
  if (['school_admin', 'university_admin'].includes(user.role)) return 'admin';
  if (user.role === 'center_owner') return 'center_owner';
  if (user.role === 'teacher') return 'teacher';
  if (
    user.role === 'university' ||
    UNI_GRADES.includes(user.grade) ||
    user.institution_type === 'university' ||
    user.institutionType  === 'university'
  ) return 'university_student';
  return 'school_student';
};

// ── UI ──────────────────────────────────────────────────
export const useUIStore = create(
  persist(
    (set) => ({
      language:    'en',
      darkMode:    false,
      sidebarOpen: false,
      institutionMode: 'school', // 'school' | 'university'

      setLanguage: lang => {
        document.documentElement.setAttribute('dir',  lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
        set({ language: lang });
      },
      toggleDark:      ()      => set(s => ({ darkMode: !s.darkMode })),
      // FIX 6: setTheme(true|false) — used by system dark mode sync
      setTheme:        (isDark) => set({ darkMode: isDark }),
      setSidebarOpen:  v       => set({ sidebarOpen: v }),
      setInstitutionMode: m    => set({ institutionMode: m }),
    }),
    { name: 'najah-ui', partialize: s => ({ language: s.language, darkMode: s.darkMode, institutionMode: s.institutionMode }) }
  )
);

export const playPing = () => {
  try {
    // Use Web Audio API to generate a short ping tone — no external dependency
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
};

// ── Notifications ────────────────────────────────────────
export const useNotifStore = create(set => ({
  notifications: [],
  unreadCount:   0,
  setAll: (notifications, unreadCount) => set({ notifications, unreadCount }),
  add:    notif  => {
    playPing();
    set(s => ({ notifications: [notif, ...s.notifications], unreadCount: s.unreadCount + 1 }));
  },
  markOne: id    => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
    unreadCount:   Math.max(0, s.unreadCount - 1),
  })),
  clearCount: () => set({ unreadCount: 0 }),
}));

// ── Chat ─────────────────────────────────────────────────
export const useChatStore = create(set => ({
  activeRoom:  'mathematics',
  messages:    {},
  typing:      {},

  setActiveRoom: room => set({ activeRoom: room }),

  setMessages: (room, msgs) => set(s => ({
    messages: { ...s.messages, [room]: msgs },
  })),

  addMessage: (room, msg) => set(s => {
    const old = s.messages[room] || [];
    const msgId = msg.id || msg._id?.toString();
    if (old.some(m => (m.id || m._id?.toString()) === msgId)) return s;
    // Keep only last 100 messages per room to prevent memory leak
    const updated = [...old, { ...msg, id: msgId }].slice(-100);
    return {
      messages: { ...s.messages, [room]: updated }
    };
  }),

  setTyping: (room, userId, name, isTyping) => set(s => {
    const rt = { ...(s.typing[room] || {}) };
    if (isTyping) rt[userId] = name; else delete rt[userId];
    return { typing: { ...s.typing, [room]: rt } };
  }),

  // ── Private Chat ──
  privateMessages: {}, // { targetId: [] }
  activePrivateChat: null,
  recentChats: [], // [{ id, name, avatar, lastMsg }]

  setPrivateMessages: (targetId, msgs) => set(s => ({
    privateMessages: { 
      ...s.privateMessages, 
      [targetId]: msgs.map(m => ({ ...m, id: m.id || m._id?.toString(), status: m.status || 'sent' })) 
    }
  })),

  addPrivateMessage: (targetId, msg) => set(s => {
    const old = s.privateMessages[targetId] || [];
    const msgId = msg.id || msg._id?.toString();
    if (old.some(m => (m.id || m._id?.toString()) === msgId)) return s;
    // Cap at 150 messages per private conversation to prevent memory leak
    const updated = [...old, { ...msg, id: msgId, status: msg.status || 'sent' }].slice(-150);
    return {
      privateMessages: { ...s.privateMessages, [targetId]: updated }
    };
  }),

  markMessagesRead: (targetId, messageIds = null) => set(s => {
    const msgs = s.privateMessages[targetId] || [];
    return {
      privateMessages: {
        ...s.privateMessages,
        [targetId]: msgs.map(m => {
          if (!messageIds || messageIds.includes(m.id)) return { ...m, status: 'read' };
          return m;
        })
      }
    };
  }),

  editPrivateMessage: (targetId, messageId, content) => set(s => ({
    privateMessages: {
      ...s.privateMessages,
      [targetId]: (s.privateMessages[targetId] || []).map(m =>
        m.id === messageId ? { ...m, content, edited: true } : m
      ),
    },
  })),

  deletePrivateMessage: (targetId, messageId) => set(s => ({
    privateMessages: {
      ...s.privateMessages,
      [targetId]: (s.privateMessages[targetId] || []).map(m =>
        m.id === messageId ? { ...m, _deleted: true, content: '' } : m
      ),
    },
  })),

  setActivePrivateChat: targetId => set({ activePrivateChat: targetId }),
  
  setRecentChats: chats => set({ recentChats: chats }),
  updateRecentChat: (targetId, update) => set(s => ({
    recentChats: s.recentChats.map(c => c.id === targetId ? { ...c, ...update } : c)
  })),
}));

// ── Draft / Data-loss Prevention ──────────────────────────────
export const useDraftStore = create(
  persist(
    (set) => ({
      noteDrafts: {},       // { [noteId]: content }
      quizProgress: null,   // { questions, answers, startedAt, fileIds }
      chatDraft: '',        // AI chat input
      plannerDraft: null,   // { subject, topic, days, generatedPlan, savedAt }

      saveNoteDraft:  (id, content) => set(s => ({ noteDrafts: { ...s.noteDrafts, [id]: content } })),
      clearNoteDraft: (id) => set(s => { const d = { ...s.noteDrafts }; delete d[id]; return { noteDrafts: d }; }),

      saveQuizProgress:  (progress) => set({ quizProgress: { ...progress, savedAt: Date.now() } }),
      clearQuizProgress: () => set({ quizProgress: null }),

      setChatDraft:   (text) => set({ chatDraft: text }),
      clearChatDraft: () => set({ chatDraft: '' }),

      setPlannerDraft:   (draft) => set({ plannerDraft: { ...draft, savedAt: Date.now() } }),
      clearPlannerDraft: () => set({ plannerDraft: null }),
    }),
    { name: 'najah-drafts' }
  )
);

// ── Groups ────────────────────────────────────────────────
export const useGroupStore = create(set => ({
  groups:       [],
  activeGroup:  null,
  loading:      false,

  setGroups:      groups      => set({ groups }),
  setActiveGroup: group       => set({ activeGroup: group }),
  setLoading:     v           => set({ loading: v }),

  addGroup: group => set(s => ({ groups: [group, ...s.groups] })),

  removeGroup: id => set(s => ({ groups: s.groups.filter(g => g._id !== id) })),

  updateGroup: (id, data) => set(s => ({
    groups: s.groups.map(g => g._id === id ? { ...g, ...data } : g),
    activeGroup: s.activeGroup?._id === id ? { ...s.activeGroup, ...data } : s.activeGroup,
  })),
}));
