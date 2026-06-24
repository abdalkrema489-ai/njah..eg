// src/App.jsx — Najah v6 — Landing + Onboarding + full routes
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, useUIStore } from './context/store';
import { AppShell } from './components/shared/Layout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { Spinner } from './components/shared/UI';
import { CommandPalette } from './components/shared/CommandPalette';
import { I18nProvider, useTranslation } from './i18n/index';
import OfflineBanner  from './components/pwa/OfflineBanner';
import InstallPrompt  from './components/pwa/InstallPrompt';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useAppRating } from './hooks/useAppRating.jsx';
import './styles/global.css';

// ── Lazy load all pages ──────────────────────────────────────
const LandingPage       = lazy(() => import('./components/landing/LandingPage'));
const LoginPage         = lazy(() => import('./components/auth/AuthPages').then(m => ({ default: m.LoginPage })));
const RegisterPage      = lazy(() => import('./components/auth/AuthPages').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage= lazy(() => import('./components/auth/AuthPages').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./components/auth/AuthPages').then(m => ({ default: m.ResetPasswordPage })));
const AuthCallback      = lazy(() => import('./components/auth/AuthPages').then(m => ({ default: m.AuthCallback })));
const Dashboard         = lazy(() => import('./components/dashboard/Dashboard'));
const PlannerPage       = lazy(() => import('./components/planner/PlannerPage'));
const FilesPage         = lazy(() => import('./components/files/FilesPage'));
const NotesPage         = lazy(() => import('./components/notes/NotesPage'));
const BoardPage         = lazy(() => import('./components/board/BoardPage'));
const ChatPage          = lazy(() => import('./components/chat/ChatPage'));
const AIAssistant       = lazy(() => import('./components/ai/AIAssistant'));
const NajahAI           = lazy(() => import('./components/ai/NajahAI'));
const AdminLoginPage    = lazy(() => import('./components/admin/AdminLoginPage'));
const AdminDashboard    = lazy(() => import('./components/admin/AdminDashboard'));
const AchievementsPage  = lazy(() => import('./components/achievements/AchievementsPage'));

const NotificationsPage = lazy(() => import('./components/notifications/NotificationsPage'));
const AnalyticsPage     = lazy(() => import('./components/analytics/AnalyticsPage'));
const ProfilePage       = lazy(() => import('./components/profile/ProfilePage'));
const SettingsPage      = lazy(() => import('./components/settings/SettingsPage'));
const QuizHistoryPage   = lazy(() => import('./components/quiz/QuizHistoryPage'));

const GroupsPage        = lazy(() => import('./components/groups/GroupsPage'));
const GroupDetailPage   = lazy(() => import('./components/groups/GroupDetailPage'));
const AssignmentCreation= lazy(() => import('./components/groups/AssignmentCreation'));
const GradingInterface  = lazy(() => import('./components/groups/GradingInterface'));
const StudentProfile    = lazy(() => import('./components/groups/StudentProfile'));
const TeacherRegistration = lazy(() => import('./components/auth/TeacherRegistration'));

const CurriculumBrowser    = lazy(() => import('./components/teacher/CurriculumBrowser'));
const StudentsOverview     = lazy(() => import('./components/teacher/StudentsOverview'));
const CalendarPage         = lazy(() => import('./components/calendar/CalendarPage'));
const TeacherRegWizard     = lazy(() => import('./components/auth/teacher/TeacherRegisterWizard'));
const TeacherPendingPage   = lazy(() => import('./components/auth/teacher/PendingApproval'));
const PaymentPage          = lazy(() => import('./components/payment/PaymentPage'));
const HelpCenter           = lazy(() => import('./components/help/HelpCenter'));
const AffiliateDashboard   = lazy(() => import('./components/teacher/AffiliateDashboard'));
const LessonPlanner        = lazy(() => import('./components/teacher/LessonPlanner'));
const ExamBuilder          = lazy(() => import('./components/teacher/ExamBuilder'));
const EssayGrader          = lazy(() => import('./components/teacher/EssayGrader'));
const TeacherWallet        = lazy(() => import('./components/teacher/TeacherWallet'));
const SupportPage          = lazy(() => import('./components/help/SupportPage'));
const WalletPage           = lazy(() => import('./components/wallet/WalletPage'));

// ── QueryClient ─────────────────────────────────────────────
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime:    10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Full-page loader ─────────────────────────────────────────
function PageLoader() {
  const { t } = useTranslation();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)', gap: 20,
    }}>
      <svg width="52" height="52" viewBox="0 0 44 44" fill="none">
        <defs><linearGradient id="pl-g" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#6366F1"/><stop offset="100%" stopColor="#A78BFA"/></linearGradient></defs>
        <rect width="44" height="44" rx="14" fill="url(#pl-g)"/>
        <path d="M13 32 L22 12 L31 32" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 26 L28 26" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="22" cy="12" r="2.5" fill="#fff"/>
      </svg>
      <Spinner size="lg" />
      <p style={{ fontSize: 13, color: 'var(--text3)' }}>{t('common.loading')}</p>
    </div>
  );
}

// ── Protected route ───────────────────────────────────────────
function Protected({ children }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  // BUG #3 FIX: preserve destination so login can redirect back
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return (
    <AppShell>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

// ── Teacher-only route ──────────────────────────────────────
function TeacherOnly({ children }) {
  const { user } = useAuthStore();
  if (!user || user.role !== 'teacher') return <Navigate to="/" replace />;
  return children;
}

// ── Admin-only route (uses separate adminToken) ─────────────
function AdminProtected({ children }) {
  const adminToken = localStorage.getItem('adminToken');
  const token = adminToken || localStorage.getItem('token');
  const { user } = useAuthStore();
  
  if (!token) return <Navigate to="/admin/login" replace />;
  
  // If they don't have an explicit admin token, they must be a DB admin
  if (!adminToken && user && user.role !== 'admin' && !user.admin_level) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

// ── Public route (redirect if already logged in) ───────────
function Public({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── Theme + language sync ────────────────────────────────────
function GlobalSync() {
  const { darkMode, setTheme, language, setInstitutionMode } = useUIStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // Load White-Label Branding
    let apiBase = import.meta.env.VITE_API_URL;
    if (import.meta.env.PROD && apiBase && apiBase.includes('localhost')) {
      apiBase = '/api';
    }
    const finalAPI = apiBase || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
    fetch(`${finalAPI}/admin/branding`)
      .then(res => res.json())
      .then(data => {
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--primary', data.primaryColor);
          document.documentElement.style.setProperty('--indigo-500', data.primaryColor);
          document.documentElement.style.setProperty('--primary-dark', data.primaryColor + 'cc');
        }
        if (data.platformName) {
          document.title = data.platformName;
          localStorage.setItem('platformName', data.platformName);
          localStorage.setItem('logoEmoji', data.logoEmoji || '🎓');
        }
      }).catch(() => {});

    // Capture Affiliate Referral
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) localStorage.setItem('affiliate_ref', ref);
  }, []);

  // ── FIX 6: System dark mode sync ──────────────────────────
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (isDark) => {
      // Only follow system if user hasn't made an explicit choice
      const savedTheme = localStorage.getItem('najah-theme');
      if (!savedTheme || savedTheme === 'system') {
        if (setTheme) setTheme(isDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    };

    applyTheme(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => applyTheme(e.matches));
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('dir',  language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [darkMode, language]);

  // Sync institutionMode whenever user data changes (e.g. after admin role update)
  useEffect(() => {
    const instType = user?.institution_type || user?.institutionType;
    if (instType) {
      setInstitutionMode(instType === 'university' ? 'university' : 'school');
    }
  }, [user?.institution_type, user?.institutionType]);

  return null;
}

function PushInit() {
  const { user } = useAuthStore();
  usePushNotifications(user?.id);
  return null;
}

// ── Offline Sync & App Rating bridge ────────────────────────
function AppFeatures() {
  useOfflineSync();
  useAppRating();
  return null;
}

// ── 404 page ─────────────────────────────────────────────────
function NotFound() {
  const { t } = useTranslation();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--ink)',
    }}>
      <div style={{
        textAlign: 'center', padding: '48px 64px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'var(--glass-blur)',
      }}>
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 24, opacity: 0.6 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <h2 style={{
          fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-head)',
          marginBottom: 12, letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, var(--text) 30%, #6366F1 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {t('errors.notFound')}
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: 15, marginBottom: 32, lineHeight: 1.65 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a href="/" style={{
          padding: '13px 32px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff',
          borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
          display: 'inline-block', boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
          transition: 'all 0.3s var(--ease)',
        }}>
          ← {t('nav.dashboard')}
        </a>
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
      <QueryClientProvider client={qc}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <GlobalSync />
          <PushInit />
          <AppFeatures />
          <OfflineBanner />
          <InstallPrompt />
          <CommandPalette />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--surface3)',
                color: 'var(--text)',
                border: '1px solid var(--border2)',
                borderRadius: 12,
                fontSize: 14,
                boxShadow: 'var(--shadow), var(--glow)',
                backdropFilter: 'var(--glass-blur)',
              },
              success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />

          <Routes>
            {/* ── Marketing ── */}
            <Route path="/welcome" element={
              <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>
            } />

            {/* ── Public (auth) ── */}
            <Route path="/login"                 element={<Public><LoginPage /></Public>} />
            <Route path="/register"              element={<Public><RegisterPage /></Public>} />
            <Route path="/teacher/register"      element={<Public><TeacherRegistration /></Public>} />
            <Route path="/teacher/apply"         element={<Public><Suspense fallback={<PageLoader />}><TeacherRegWizard /></Suspense></Public>} />
            <Route path="/teacher/pending"       element={<Suspense fallback={<PageLoader />}><TeacherPendingPage /></Suspense>} />
            <Route path="/forgot-password"       element={<Public><ForgotPasswordPage /></Public>} />
            <Route path="/reset-password/:token" element={<Public><ResetPasswordPage /></Public>} />
            <Route path="/auth/callback"         element={<Suspense fallback={<PageLoader />}><AuthCallback /></Suspense>} />

            {/* ── Protected ── */}
            <Route path="/"                element={<Protected><Dashboard /></Protected>} />
            <Route path="/planner"         element={<Protected><PlannerPage /></Protected>} />
            <Route path="/files"           element={<Protected><FilesPage /></Protected>} />
            <Route path="/notes"           element={<Protected><NotesPage /></Protected>} />
            <Route path="/board"           element={<Protected><BoardPage /></Protected>} />
            <Route path="/chat"            element={<Protected><ChatPage /></Protected>} />
            <Route path="/chat/private"    element={<Protected><ChatPage /></Protected>} />
            <Route path="/ai"              element={<Protected><AIAssistant /></Protected>} />
            <Route path="/focus"           element={<Navigate to="/planner" replace />} />

            <Route path="/calendar"        element={<Protected><CalendarPage /></Protected>} />
            <Route path="/students"        element={<Protected><StudentsOverview /></Protected>} />
            <Route path="/achievements"    element={<Protected><AchievementsPage /></Protected>} />
            <Route path="/notifications"   element={<Protected><NotificationsPage /></Protected>} />
            <Route path="/analytics"       element={<Protected><AnalyticsPage /></Protected>} />
            <Route path="/profile"         element={<Protected><ProfilePage /></Protected>} />
            <Route path="/settings"        element={<Protected><SettingsPage /></Protected>} />
            <Route path="/affiliates"      element={
              <Protected>
                <TeacherOnly>
                  <AffiliateDashboard />
                </TeacherOnly>
              </Protected>
            } />
            <Route path="/exam"            element={<Navigate to="/files" replace />} />

            <Route path="/quiz-history"    element={<Protected><QuizHistoryPage /></Protected>} />
            <Route path="/groups"          element={<Protected><GroupsPage /></Protected>} />
            <Route path="/groups/:id"      element={<Protected><GroupDetailPage /></Protected>} />
            <Route path="/groups/:id/assignments/new" element={<Protected><AssignmentCreation /></Protected>} />
            <Route path="/groups/:id/assignments/:assignmentId/grade" element={<Protected><GradingInterface /></Protected>} />
            <Route path="/groups/:id/students/:studentId" element={<Protected><StudentProfile /></Protected>} />
            <Route path="/curriculum"      element={<Protected><CurriculumBrowser /></Protected>} />
            <Route path="/tools"           element={<Navigate to="/files" replace />} />

            <Route path="/payment"        element={<Protected><PaymentPage /></Protected>} />
            <Route path="/help"           element={<Protected><HelpCenter /></Protected>} />
            <Route path="/support"        element={<Protected><SupportPage /></Protected>} />
            <Route path="/ai-search"      element={<Protected><NajahAI /></Protected>} />

            {/* ── Teacher AI Tools ── */}
            <Route path="/lesson-planner" element={<Protected><LessonPlanner /></Protected>} />
            <Route path="/exam-builder"   element={<Protected><ExamBuilder /></Protected>} />
            <Route path="/essay-grader"   element={<Protected><EssayGrader /></Protected>} />
            <Route path="/teacher/wallet" element={<Protected><TeacherWallet /></Protected>} />
            <Route path="/wallet"         element={<Protected><WalletPage /></Protected>} />

            {/* ── Admin (owner only, protected standalone) ── */}
            <Route path="/admin/login"     element={<Suspense fallback={<PageLoader />}><AdminLoginPage /></Suspense>} />
            <Route path="/admin/dashboard" element={<AdminProtected><AdminDashboard /></AdminProtected>} />

            {/* ── 404 ── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
