import { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuthStore, useUIStore, useNotifStore, useChatStore } from '../context/store';
import { authAPI } from '../api/index';
import { I18nContext } from '../i18n/index';
import toast from 'react-hot-toast';

// src/hooks/index.js

// ── Socket singleton ─────────────────────────────────────
let socketInstance = null;

export function useSocket() {
  const { token } = useAuthStore();
  const { add: addNotif } = useNotifStore();
  const { addMessage } = useChatStore(); // Only group messages here — private handled in ChatPage
  const { user } = useAuthStore();

  useEffect(() => {
    if (!token) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    if (!socketInstance) {
      // Socket.io must connect directly to Railway — Vercel can't proxy WebSockets reliably.
      // Priority: VITE_SOCKET_URL > derive from VITE_API_URL > Railway default > localhost in dev.
      let socketURL = import.meta.env.VITE_SOCKET_URL;
      let apiURL = import.meta.env.VITE_API_URL;

      // Ignore localhost in production
      if (import.meta.env.PROD) {
        if (socketURL && socketURL.includes('localhost')) socketURL = null;
        if (apiURL && apiURL.includes('localhost')) apiURL = null;
      }

      if (socketURL) {
        // use socketURL directly
      } else if (apiURL) {
        socketURL = apiURL.replace(/\/?api\/?$/, '');
      } else if (import.meta.env.PROD) {
        socketURL = 'https://njaheg-backend-production.up.railway.app';
      } else {
        socketURL = 'http://localhost:5000';
      }

      socketInstance = io(socketURL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect_error', (err) => {
        console.warn('🔌 Socket error:', err.message);
        // If the error is token expiry, try to silently refresh and reconnect
        if (err.message && err.message.includes('Token expired')) {
          const ref = localStorage.getItem('refresh');
          if (ref) {
            import('../api/index').then(async ({ default: client }) => {
              try {
                const axios = (await import('axios')).default;
                const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const { data } = await axios.post(`${API}/auth/refresh`, { refresh: ref });
                localStorage.setItem('token', data.token);
                if (data.refresh) localStorage.setItem('refresh', data.refresh);
                if (socketInstance) {
                  socketInstance.auth.token = data.token;
                  socketInstance.connect();
                }
              } catch { /* refresh failed — user will be logged out by HTTP interceptor */ }
            }).catch(() => {});
          }
        }
      });
      
      // Keep socket auth token in sync with the latest access token
      socketInstance.io.on('reconnect_attempt', () => {
        const freshToken = localStorage.getItem('token') || localStorage.getItem('accessToken');
        if (freshToken) socketInstance.auth.token = freshToken;
      });

      window.__najahSocket = socketInstance;
    }

    // Group room messages handler (only)
    const handleNewMessage = ({ roomId, ...msg }) => {
      const room = roomId.replace('room:', '');
      addMessage(room, msg);
    };

    // Notifications (achievements, level up, etc.)
    const handleNotification = notif => addNotif(notif);

    // Socket-level errors (e.g. guest restrictions, validation failures)
    const handleSocketError = ({ message, code } = {}) => {
      if (message) toast.error(message, { id: code || 'socket-error', duration: 4000 });
    };

    socketInstance.on('new_message', handleNewMessage);
    socketInstance.on('notification', handleNotification);
    socketInstance.on('level_up', handleNotification);
    socketInstance.on('achievement', handleNotification);
    socketInstance.on('error', handleSocketError);

    return () => {
      if (socketInstance) {
        socketInstance.off('new_message', handleNewMessage);
        socketInstance.off('notification', handleNotification);
        socketInstance.off('level_up', handleNotification);
        socketInstance.off('achievement', handleNotification);
        socketInstance.off('error', handleSocketError);
      }
    };
  }, [token, user?.id, addMessage, addNotif]);

  // BUG-06: Keep socket auth token in sync after token refresh
  useEffect(() => {
    if (!token || !socketInstance) return;
    // Update the auth token on the existing socket without full reconnect
    socketInstance.auth = { token };
    // If already disconnected (e.g. old token expired), reconnect with the new token
    if (!socketInstance.connected) socketInstance.connect();
  }, [token]);

  return socketInstance;
}

export const getSocket = () => socketInstance;

// ── Auth guard ───────────────────────────────────────────
export function useRequireAuth() {
  const { isAuthenticated, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login', { replace: true }); return; }
    authAPI.me()
      .then(({ data }) => setUser(data.user))
      .catch(() => { logout(); navigate('/login', { replace: true }); });
  }, [isAuthenticated]);

  return isAuthenticated;
}

// ── Translation ──────────────────────────────────────────
export function useTranslation() {
  const i18nCtx = useContext(I18nContext);
  const { language } = useUIStore();

  if (i18nCtx) return i18nCtx;

  const STRINGS = {
    en: {
      dashboard:'Dashboard', planner:'Study Planner', files:'Files',
      notes:'Notes', board:'Shared Board', chat:'Chat', ai:'AI Assistant',
      focus:'Focus Mode', achievements:'Achievements', notifications:'Notifications',
      profile:'Profile', settings:'Settings', analytics:'Analytics',
      login:'Sign In', register:'Create Account', logout:'Sign Out',
      email:'Email', password:'Password', name:'Full Name', grade:'Grade',
      save:'Save', cancel:'Cancel', delete:'Delete', upload:'Upload',
      search:'Search', send:'Send', submit:'Submit', back:'Back',
      loading:'Loading...', noData:'No data yet', required:'Required',
      subject:'Subject', topic:'Topic', duration:'Duration',
      planned:'Planned', completed:'Completed', skipped:'Skipped',
      goodMorning:'Good morning', goodAfternoon:'Good afternoon', goodEvening:'Good evening',
      confirm:'Are you sure?',
      'nav.dashboard':'Dashboard','nav.ai':'AI Assistant','nav.analytics':'Analytics',
      'nav.planner':'Study Planner','nav.notes':'Notes','nav.files':'Files',
      'nav.focus':'Focus Mode','nav.exam':'Exam Prep','nav.quizHistory':'Quiz History',
      'nav.tools':'Study Tools','nav.groups':'Groups','nav.messages':'Messages',
      'nav.board':'Shared Board','nav.achievements':'Achievements','nav.notifications':'Notifications',
      'nav.allStudents':'All Students','nav.myClasses':'My Classes','nav.calendar':'Calendar',
      'nav.curriculum':'Curriculum','nav.resources':'Resources',
    },
    ar: {
      dashboard:'لوحة التحكم', planner:'المخطط الدراسي', files:'الملفات',
      notes:'الملاحظات', board:'اللوحة المشتركة', chat:'الدردشة', ai:'المساعد الذكي',
      focus:'وضع التركيز', achievements:'الإنجازات', notifications:'الإشعارات',
      profile:'الملف الشخصي', settings:'الإعدادات', analytics:'التحليلات',
      login:'تسجيل الدخول', register:'إنشاء حساب', logout:'تسجيل الخروج',
      email:'البريد الإلكتروني', password:'كلمة المرور', name:'الاسم الكامل', grade:'الصف',
      save:'حفظ', cancel:'إلغاء', delete:'حذف', upload:'رفع',
      search:'بحث', send:'إرسال', submit:'تأكيد', back:'رجوع',
      loading:'جاري التحميل...', noData:'لا توجد بيانات', required:'مطلوب',
      subject:'المادة', topic:'الموضوع', duration:'المدة',
      planned:'مخطط', completed:'مكتمل', skipped:'تخطى',
      goodMorning:'صباح الخير', goodAfternoon:'مساء الخير', goodEvening:'مساء النور',
      confirm:'هل أنت متأكد؟',
      'nav.dashboard':'لوحة التحكم','nav.ai':'المساعد الذكي','nav.analytics':'التحليلات',
      'nav.planner':'المخطط','nav.notes':'الملاحظات','nav.files':'الملفات',
      'nav.focus':'التركيز','nav.exam':'الامتحان','nav.quizHistory':'سجل الاختبارات',
      'nav.tools':'أدوات','nav.groups':'المجموعات','nav.messages':'الرسائل',
      'nav.board':'اللوحة','nav.achievements':'الإنجازات','nav.notifications':'الإشعارات',
      'nav.allStudents':'جميع الطلاب','nav.myClasses':'فصولي','nav.calendar':'التقويم',
      'nav.curriculum':'المنهج','nav.resources':'الموارد',
    },
  };
  const lang = language || 'ar';
  return {
    t:      (key) => STRINGS[lang]?.[key] ?? STRINGS.en?.[key] ?? key,
    lang,
    isAR:   lang === 'ar',
    isRTL:  lang === 'ar',
    dir:    lang === 'ar' ? 'rtl' : 'ltr',
    toggleLang: () => {},
  };
}

// ── Page title setter ────────────────────────────────────
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Najah 🎓` : 'Najah Platform 🎓';
  }, [title]);
}

// ── Online/Offline status ────────────────────────────────
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
