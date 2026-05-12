import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supportAPI } from '../../api/index';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'history'
  const [loading, setLoading]     = useState(false);
  const [tickets, setTickets]     = useState([]);
  
  // Form State
  const [category, setCategory] = useState('general');
  const [subject, setSubject]   = useState('');
  const [message, setMessage]   = useState('');

  const CATEGORIES = [
    { id: 'general',   label: 'General / عام', icon: '📝' },
    { id: 'technical', label: 'Technical Issue / مشكلة تقنية', icon: '💻' },
    { id: 'payment',   label: 'Payment / دفع ورصيد', icon: '💳' },
    { id: 'account',   label: 'Account / حساب', icon: '👤' },
    { id: 'teacher',   label: 'Teacher Complaint / شكوى مدرس', icon: '👨‍🏫' },
    { id: 'other',     label: 'Other / أخرى', icon: '❓' },
  ];

  useEffect(() => {
    if (activeTab === 'history') {
      fetchTickets();
    }
  }, [activeTab]);

  const fetchTickets = async () => {
    try {
      const { data } = await supportAPI.getMyTickets();
      setTickets(data.tickets);
    } catch {
      toast.error('Failed to load tickets');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return toast.error('يرجى تعبئة جميع الحقول');
    
    setLoading(true);
    try {
      const { data } = await supportAPI.submitTicket({ category, subject, message });
      toast.success(data.message || 'تم إرسال شكواك بنجاح');
      setSubject('');
      setMessage('');
      setCategory('general');
      setActiveTab('history');
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[var(--bg-primary)] p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl">🎧</div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">الدعم الفني والشكاوي</h1>
            <p className="text-[var(--text-secondary)] text-sm">نحن هنا لمساعدتك. تواصل معنا في أي وقت.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--border-color)] pb-4">
          <button onClick={() => setActiveTab('new')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'new' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
            ➕ شكوى جديدة
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'history' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
            📋 شكاوي سابقة
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'new' ? (
            <motion.form key="new" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8">
              
              <div className="mb-6">
                <label className="block text-[var(--text-secondary)] font-bold text-sm mb-3">نوع الشكوى / الاستفسار</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CATEGORIES.map(cat => (
                    <div key={cat.id} onClick={() => setCategory(cat.id)} className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${category === cat.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-[var(--border-color)] hover:border-indigo-500/50 hover:bg-[var(--bg-tertiary)]'}`}>
                      <div className="text-2xl">{cat.icon}</div>
                      <div className={`text-xs font-bold text-center ${category === cat.id ? 'text-indigo-400' : 'text-[var(--text-secondary)]'}`}>{cat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[var(--text-secondary)] font-bold text-sm mb-2">الموضوع</label>
                <input required value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} placeholder="اكتب عنواناً مختصراً لشكواك..." className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-indigo-500 transition-colors" />
              </div>

              <div className="mb-8">
                <label className="block text-[var(--text-secondary)] font-bold text-sm mb-2">التفاصيل</label>
                <textarea required value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} placeholder="اشرح مشكلتك بالتفصيل..." className="w-full h-32 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium outline-none focus:border-indigo-500 transition-colors resize-none" />
                <div className="text-right text-xs mt-2 text-[var(--text-secondary)]">{message.length}/2000</div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {loading ? 'جاري الإرسال...' : '📤 إرسال الشكوى'}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              {tickets.length === 0 ? (
                <div className="text-center py-20 text-[var(--text-secondary)]">لا توجد شكاوي سابقة.</div>
              ) : (
                tickets.map(t => (
                  <div key={t.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-xs font-bold text-indigo-400 mb-1">{t.category.toUpperCase()}</div>
                        <h3 className="text-lg font-black text-[var(--text-primary)]">{t.subject}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.status === 'open' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {t.status === 'open' ? '⏳ قيد المراجعة' : '✅ تم الرد'}
                      </span>
                    </div>
                    
                    {t.admin_reply && (
                      <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                        <div className="text-xs font-bold text-indigo-400 mb-2">رد الإدارة 🎓</div>
                        <div className="text-[var(--text-primary)] text-sm whitespace-pre-wrap">{t.admin_reply}</div>
                      </div>
                    )}
                    <div className="text-right text-xs text-[var(--text-secondary)] mt-4">
                      {new Date(t.created_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
