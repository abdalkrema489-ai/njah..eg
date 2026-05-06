// src/api/client.js
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Standard client — 30s timeout for regular endpoints
const client = axios.create({ baseURL: API, timeout: 30000 });

// Dedicated AI client — 90s timeout (PDF summary / quiz generation can take 60s+)
export const aiClient = axios.create({ baseURL: API, timeout: 90000 });

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Apply same auth interceptor to aiClient
aiClient.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshing = false;
let queue = [];
const flush = (err, token) => { queue.forEach(p => err ? p.reject(err) : p.resolve(token)); queue = []; };

client.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    if (refreshing) return new Promise((res, rej) => queue.push({ resolve: res, reject: rej }))
      .then(t => { orig.headers.Authorization = `Bearer ${t}`; return client(orig); });
    orig._retry = true; refreshing = true;
    const ref = localStorage.getItem('refresh');
    if (!ref) {
      import('../context/store').then(m => m.useAuthStore.getState().logout());
      return Promise.reject(err);
    }
    try {
      const { data } = await axios.post(`${API}/auth/refresh`, { refresh: ref });
      localStorage.setItem('token', data.token);
      client.defaults.headers.Authorization = `Bearer ${data.token}`;
      flush(null, data.token);
      orig.headers.Authorization = `Bearer ${data.token}`;
      return client(orig);
    } catch (e) {
      flush(e);
      import('../context/store').then(m => m.useAuthStore.getState().logout());
      return Promise.reject(e);
    } finally {
      refreshing = false;
    }
  }
  const msg = err.response?.data?.error;
  if (err.response?.status === 429) {
    toast.error('Too many requests. Please wait a moment.');
    if (orig.url.includes('/auth/refresh')) {
      import('../context/store').then(m => m.useAuthStore.getState().logout());
    }
  } else if (err.response?.status !== 401 && msg) {
    toast.error(msg);
  }
  return Promise.reject(err);
});

export default client;

// ── API Modules ──────────────────────────────────────────

export const authAPI = {
  register:       d  => client.post('/auth/register', d),
  login:          d  => client.post('/auth/login', d),
  refresh:        d  => client.post('/auth/refresh', d),
  logout:         () => client.post('/auth/logout'),
  me:             () => client.get('/auth/me'),
  verifyEmail:    t  => client.get(`/auth/verify/${t}`),
  forgotPassword: e  => client.post('/auth/forgot-password', { email: e }),
  resetPassword:  d  => client.post('/auth/reset-password', d),
  googleLogin:    () => { window.location.href = `${API}/auth/google`; },
  guestRegister:  () => client.post('/auth/guest'),
  // OAuth code exchange: call this on /auth/callback?code=XXX
  exchangeCode:   code => client.post('/auth/exchange-code', { code }),
};

export const usersAPI = {
  getProfile:     ()       => client.get('/users/profile'),
  updateProfile:  d        => client.patch('/users/profile', d),
  uploadAvatar:   file     => { const fd = new FormData(); fd.append('avatar', file); return client.post('/users/avatar', fd); },
  changePassword: d        => client.post('/users/change-password', d),
  recordPomodoro: d        => client.post('/users/pomodoro', d),
  getProgress:    ()       => client.get('/users/progress'),
  getStats:       ()       => client.get('/users/stats'),
  getPublicStats: ()       => client.get('/users/public/stats'),
  getUser:        id       => client.get(`/users/${id}`),
  searchUsers:    q        => client.get('/users/search', { params: { q } }),
  getMyStudents:  ()       => client.get('/users/my-students'),
};

export const plannerAPI = {
  getSessions:   p       => client.get('/planner', { params: p }),
  createSession: d       => client.post('/planner', d),
  updateSession: (id, d) => client.patch(`/planner/${id}`, d),
  deleteSession: id      => client.delete(`/planner/${id}`),
};

export const filesAPI = {
  list:        p            => client.get('/files', { params: p }),
  upload:      (file, meta, onProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(meta).forEach(([k,v]) => v != null && fd.append(k, v));
    return client.post('/files', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round(e.loaded * 100 / e.total)),
    });
  },
  get:         id           => client.get(`/files/${id}`),
  update:      (id,d)       => client.patch(`/files/${id}`, d),
  remove:      id           => client.delete(`/files/${id}`),
  extractText: id           => client.get(`/files/${id}/extract`),
};

export const notesAPI = {
  list:   p        => client.get('/notes', { params: p }),
  create: d        => client.post('/notes', d),
  get:    id       => client.get(`/notes/${id}`),
  update: (id,d)   => client.put(`/notes/${id}`, d),
  remove: id       => client.delete(`/notes/${id}`),
};

export const boardAPI = {
  list:   p    => client.get('/board', { params: p }),
  create: d    => client.post('/board', d),
  like:   id   => client.post(`/board/${id}/like`),
  save:   id   => client.post(`/board/${id}/save`),
  remove: id   => client.delete(`/board/${id}`),
};

export const chatAPI = {
  getRooms:    ()         => client.get('/chat/rooms'),
  getMessages: (subj, p)  => client.get(`/chat/${subj}/messages`, { params: p }),
  getRecent:   ()         => client.get('/chat/recent'),
};

export const aiAPI = {
  chat:              d  => aiClient.post('/ai/chat', d),
  chatStream:        d  => aiClient.post('/ai/chat/stream', d),
  search:            d  => aiClient.post('/ai/search', d),
  getConversations:  () => client.get('/ai/conversations'),
  getConversation:   id => client.get(`/ai/conversations/${id}`),
  deleteConversation:id => client.delete(`/ai/conversations/${id}`),
  summarize:         d  => aiClient.post('/ai/summarize', d),
  generateQuiz:      d  => aiClient.post('/ai/quiz', d),
  submitQuiz:        d  => client.post('/ai/quiz/submit', d),
  studyPlan:         d  => aiClient.post('/ai/study-plan', d),
  askFile:           d  => aiClient.post('/ai/ask-file', d),
  youtubeSummarize:  d  => aiClient.post('/ai/youtube-summarize', d),
  analyzeImage:      d  => aiClient.post('/ai/image-analyze', d),
  getProvider:       () => client.get('/ai/provider'),
  getCapabilities:   () => client.get('/ai/internal/capabilities'),
  // Teacher AI tools
  generateLessonPlan:    d => aiClient.post('/ai/lesson-plan',    d),
  generateExamQuestions: d => aiClient.post('/ai/exam-questions', d),
  gradeEssay:            d => aiClient.post('/ai/grade-essay',    d),
};

export const notificationsAPI = {
  list:       p  => client.get('/notifications', { params: p }),
  markRead:   id => client.patch(`/notifications/${id}/read`),
  markAll:    () => client.patch('/notifications/read-all'),
  remove:     id => client.delete(`/notifications/${id}`),
};

export const achievementsAPI = {
  list:        () => client.get('/achievements'),
  leaderboard: () => client.get('/achievements/leaderboard'),
};

export const analyticsAPI = {
  dashboard:     () => client.get('/analytics/dashboard'),
  streakHistory: () => client.get('/analytics/streak-history'),
};

export const quizAPI = {
  history: p => client.get('/quiz/history', { params: p }),
  stats:   () => client.get('/quiz/stats'),
};

export const groupsAPI = {
  // Groups
  list:          ()        => client.get('/groups'),
  create:        d         => client.post('/groups', d),
  get:           id        => client.get(`/groups/${id}`),
  update:        (id, d)   => client.patch(`/groups/${id}`, d),
  remove:        id        => client.delete(`/groups/${id}`),
  join:          code      => client.post('/groups/join', { code }),
  removeMember:  (id, uid) => client.delete(`/groups/${id}/members/${uid}`),
  activateGroup: (id, d)   => client.post(`/groups/${id}/activate`, d),

  // Announcements
  getAnnouncements:    id              => client.get(`/groups/${id}/announcements`),
  createAnnouncement:  (id, d)         => client.post(`/groups/${id}/announcements`, d),
  pinAnnouncement:     (gId, aId)      => client.patch(`/groups/${gId}/announcements/${aId}/pin`),
  deleteAnnouncement:  (gId, aId)      => client.delete(`/groups/${gId}/announcements/${aId}`),

  // Assignments
  getAssignments:      id               => client.get(`/groups/${id}/assignments`),
  createAssignment:    (id, d)          => client.post(`/groups/${id}/assignments`, d),
  submitAssignment:    (gId, aId, d)    => client.post(`/groups/${gId}/assignments/${aId}/submit`, d),
  gradeSubmission:     (gId, aId, sId, d) => client.patch(`/groups/${gId}/assignments/${aId}/submissions/${sId}`, d),
  getSubmissionStatus: (gId, aId)       => client.get(`/groups/${gId}/assignments/${aId}/status`),

  // Insights
  getInsights: id => client.get(`/groups/${id}/insights`),
};

export const toolsAPI = {
  dictionary: (word, lang = 'en') => client.get('/tools/dictionary', { params: { word, lang } }),
  trivia:     (subject, count, difficulty) => client.get('/tools/trivia', { params: { subject, count, difficulty } }),
  wikipedia:  (query, lang = 'en') => client.get('/tools/wikipedia', { params: { query, lang } }),
  quote:      () => client.get('/tools/quote'),
};

export const paymentAPI = {
  initiate:        d => client.post('/payment/initiate', d),
  history:         () => client.get('/payment/history'),
  simulateSuccess: d => client.post('/payment/simulate-success', d),
  redeemCode:      d => client.post('/payment/redeem-code', d),
  validateCoupon:  d => client.post('/payment/validate-coupon', d),
};

export const walletAPI = {
  getBalance:      () => client.get('/wallet/balance'),
  getEarnings:     p  => client.get('/wallet/earnings', { params: p }),
  getWithdrawals:  () => client.get('/wallet/withdrawals'),
  withdraw:        d  => client.post('/wallet/withdraw', d),
};

export const adminAPI = {
  login:       d  => client.post('/admin/login', d),
  me:          () => client.get('/admin/me'),
  stats:       () => client.get('/admin/stats'),
  earnings:    p  => client.get('/admin/earnings', { params: p }),
  users:       p  => client.get('/admin/users', { params: p }),
  updateUser:  (id, d) => client.patch(`/admin/users/${id}`, d),
  groups:      () => client.get('/admin/groups'),
  updateFee:   d  => client.patch('/admin/settings/fee', d),
  // Withdrawals
  getWithdrawals:  p  => client.get('/admin/withdrawals', { params: p }),
  processWithdrawal: (id, d) => client.patch(`/admin/withdrawals/${id}`, d),
};

export const aiSearchAPI = {
  chat:     d => client.post('/ai-search/chat', d),
  search:   d => client.post('/ai-search/search', d),
  explain:  d => client.post('/ai-search/explain', d),
  homework: d => client.post('/ai-search/homework', d),
  news:     d => client.post('/ai-search/news', d),
};

export const affiliateAPI = {
  getLinks:   () => client.get('/affiliates'),
  createLink: d  => client.post('/affiliates', d),
  getStats:   () => client.get('/affiliates/stats'),
};

