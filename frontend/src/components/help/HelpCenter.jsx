// src/components/help/HelpCenter.jsx — Najah Help & Support Center
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../i18n/index';

const FAQ_DATA = [
  { q: 'How do I use the AI assistant?', qAr: 'كيف أستخدم المساعد الذكي؟', a: 'Navigate to the AI section from the sidebar. You can ask any study-related question, generate quizzes, or get explanations for any subject in the Egyptian curriculum.', aAr: 'اذهب إلى قسم المساعد الذكي من القائمة الجانبية. يمكنك طرح أي سؤال دراسي، أو إنشاء اختبارات، أو الحصول على شرح لأي مادة في المنهج المصري.' },
  { q: 'How do I join a study group?', qAr: 'كيف أنضم لمجموعة دراسية؟', a: 'Go to Groups, then use the join code provided by your teacher. You can also browse public groups and request to join.', aAr: 'اذهب إلى المجموعات، ثم استخدم كود الانضمام الذي يعطيه لك المعلم. يمكنك أيضاً تصفح المجموعات العامة وطلب الانضمام.' },
  { q: 'How do I upgrade my plan?', qAr: 'كيف أرقّي حسابي؟', a: 'Visit the Payment page from the sidebar. Choose your plan, select a payment method (Fawry, InstaPay, Vodafone Cash, etc.), and complete the payment.', aAr: 'زُر صفحة الدفع من القائمة الجانبية. اختر الباقة المناسبة، ثم اختر طريقة الدفع (فوري، إنستا باي، فودافون كاش، إلخ)، وأتم عملية الدفع.' },
  { q: 'Can I use the platform offline?', qAr: 'هل يمكنني استخدام المنصة بدون إنترنت؟', a: 'Currently, Najah requires an internet connection. However, you can download your notes and files for offline access.', aAr: 'حالياً، منصة نجاح تحتاج اتصال بالإنترنت. لكن يمكنك تحميل ملاحظاتك وملفاتك للوصول إليها بدون إنترنت.' },
  { q: 'How does the GPA calculator work?', qAr: 'كيف يعمل حاسب المعدل التراكمي؟', a: 'The GPA calculator is available in Study Tools. Enter your courses, credit hours, and grades, and it will calculate your GPA automatically.', aAr: 'حاسب المعدل التراكمي متاح في الأدوات الدراسية. أدخل موادك وساعاتها ودرجاتك وسيحسب المعدل تلقائياً.' },
  { q: 'How do I change the language?', qAr: 'كيف أغير اللغة؟', a: 'Click the language button (🇬🇧/🇪🇬) in the top header bar to switch between Arabic and English.', aAr: 'اضغط على زر اللغة (🇬🇧/🇪🇬) في الشريط العلوي للتبديل بين العربية والإنجليزية.' },
];

const CATEGORIES = [
  { id: 'getting-started', icon: '🚀', name: 'Getting Started', nameAr: 'البداية', desc: 'Learn the basics', descAr: 'تعلم الأساسيات' },
  { id: 'ai-tools', icon: '🤖', name: 'AI Tools', nameAr: 'أدوات الذكاء الاصطناعي', desc: 'AI assistant & quiz', descAr: 'المساعد الذكي والاختبارات' },
  { id: 'groups', icon: '👥', name: 'Groups & Classes', nameAr: 'المجموعات والفصول', desc: 'Managing study groups', descAr: 'إدارة المجموعات الدراسية' },
  { id: 'billing', icon: '💳', name: 'Billing & Payment', nameAr: 'الدفع والاشتراكات', desc: 'Plans & payment methods', descAr: 'الباقات وطرق الدفع' },
  { id: 'account', icon: '👤', name: 'Account & Privacy', nameAr: 'الحساب والخصوصية', desc: 'Settings & security', descAr: 'الإعدادات والأمان' },
  { id: 'technical', icon: '🔧', name: 'Technical Issues', nameAr: 'مشاكل تقنية', desc: 'Troubleshooting', descAr: 'حل المشكلات' },
];

function FAQItem({ item, isAr, index }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden', marginBottom: 8,
      }}
    >
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', cursor: 'pointer', background: 'none',
        border: 'none', color: 'var(--text)', fontSize: 14, fontWeight: 600,
        fontFamily: 'var(--font-body)', textAlign: 'inherit',
      }}>
        <span>{isAr ? item.qAr : item.q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          style={{ color: 'var(--text3)', fontSize: 12 }}>▼</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--text3)', lineHeight: 1.7 }}>
              {isAr ? item.aAr : item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HelpCenter() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [ticket, setTicket] = useState({ subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const filtered = FAQ_DATA.filter(f => {
    const q = (isAr ? f.qAr : f.q).toLowerCase();
    return q.includes(search.toLowerCase());
  });

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center', marginBottom: 40, padding: '48px 32px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.06) 100%)',
        borderRadius: 24, border: '1px solid var(--border)',
      }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, fontFamily: 'var(--font-head)', letterSpacing: '-0.03em', marginBottom: 10 }}>
          {isAr ? 'مركز المساعدة' : 'Help Center'}
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 15, marginBottom: 24 }}>
          {isAr ? 'كيف يمكننا مساعدتك اليوم؟' : 'How can we help you today?'}
        </p>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isAr ? 'ابحث عن سؤال...' : 'Search for a question...'}
          style={{
            width: '100%', maxWidth: 500, padding: '14px 24px', borderRadius: 14,
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            fontSize: 15, color: 'var(--text)', outline: 'none',
          }}
        />
      </div>

      {/* Categories Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: 12, marginBottom: 40 }}>
        {CATEGORIES.map((cat, i) => (
          <motion.div key={cat.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '20px', cursor: 'pointer',
              transition: 'box-shadow 0.3s, border-color 0.3s',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{cat.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{isAr ? cat.nameAr : cat.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{isAr ? cat.descAr : cat.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
          {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        </h2>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            {isAr ? 'لم يتم العثور على نتائج' : 'No results found'}
          </div>
        ) : filtered.map((f, i) => (
          <FAQItem key={i} item={f} isAr={isAr} index={i} />
        ))}
      </div>

      {/* Contact / Support Ticket */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 28,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
          {isAr ? 'تواصل معنا' : 'Contact Support'}
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>
          {isAr ? 'لم تجد إجابتك؟ أرسل لنا رسالة وسنرد عليك في أقرب وقت.' : "Didn't find your answer? Send us a message and we'll get back to you soon."}
        </p>

        {sent ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {isAr ? 'تم إرسال رسالتك!' : 'Message Sent!'}
            </div>
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>
              {isAr ? 'سنرد عليك في خلال ٢٤ ساعة' : "We'll respond within 24 hours"}
            </div>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              value={ticket.subject} onChange={e => setTicket(t => ({ ...t, subject: e.target.value }))}
              placeholder={isAr ? 'الموضوع' : 'Subject'}
              style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14 }}
            />
            <textarea
              value={ticket.message} onChange={e => setTicket(t => ({ ...t, message: e.target.value }))}
              placeholder={isAr ? 'اكتب رسالتك هنا...' : 'Describe your issue...'}
              rows={4}
              style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, resize: 'vertical', height: 'auto' }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { 
                if (ticket.subject && ticket.message) {
                  window.location.href = `mailto:ahmed1abdalkrem1@gmail.com?subject=${encodeURIComponent(ticket.subject)}&body=${encodeURIComponent(ticket.message)}`;
                  setSent(true); 
                }
              }}
              style={{
                padding: '13px 32px', borderRadius: 12, alignSelf: 'flex-start',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {isAr ? 'إرسال' : 'Send Message'}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
