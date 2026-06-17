// src/components/landing/LandingPage.jsx
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/index';

// ==========================================
// THEME & COLOR PALETTE (From Pinterest Ref)
// ==========================================
const C = {
  navy:    '#050e14', // Darker slate
  navyLgt: '#1E293B',
  magenta: '#10B981', // Now Green
  magentaH:'#059669', // Dark Green
  yellow:  '#38BDF8', // Now Light Blue
  blue:    '#6366F1', // Indigo
  orange:  '#34D399', // Emerald
  white:   '#FFFFFF',
  gray:    '#F0FDF4', // Very light green-tinted gray
  textD:   '#0F172A',
  textM:   '#64748B'
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.15 } }
};
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, 100]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Rotating images for dynamic visual testing
  const [assetIdx, setAssetIdx] = useState(1);
  useEffect(() => {
    const int = setInterval(() => {
      setAssetIdx(prev => (prev % 31) + 1);
    }, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div style={{ fontFamily: '"Inter", "Plus Jakarta Sans", sans-serif', backgroundColor: C.gray, overflow: 'hidden' }}>
      
      {/* ── TOP NAV (Navy) ── */}
      <nav style={{ 
        position: 'fixed', top: 0, width: '100%', height: 80, zIndex: 100,
        backgroundColor: 'rgba(11, 17, 32, 0.85)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid rgba(255,255,255,0.05)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%'
      }} className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.magenta, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18 }}>e</div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Najah<span style={{color: C.magenta}}>.</span></span>
        </div>

        {/* Desktop nav links */}
        <div className="landing-nav-links" style={{ display: 'flex', gap: 32 }}>
           <a href="#courses" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>{isAr ? 'الدورات' : 'Courses'}</a>
           <a href="#mentorship" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>{isAr ? 'التوجيه' : 'Mentorship'}</a>
           <a href="#events" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>{isAr ? 'الفعاليات' : 'Events'}</a>
           <a href="#community" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>{isAr ? 'المجتمع' : 'Community'}</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44, minWidth: 44 }}>{isAr ? 'دخول' : 'Login'}</button>
          <button onClick={() => navigate('/register')} style={{ 
            background: C.white, color: C.navy, border: 'none', padding: '10px 20px', borderRadius: 99, 
            fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', whiteSpace: 'nowrap'
          }}>{isAr ? 'حساب جديد' : 'Sign Up'}</button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{ display: 'none', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
            className="landing-hamburger"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 80, left: 0, right: 0, zIndex: 99,
          background: 'rgba(11, 17, 32, 0.97)', backdropFilter: 'blur(12px)',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {[{href: '#courses', label: isAr ? 'الدورات' : 'Courses'}, {href: '#mentorship', label: isAr ? 'التوجيه' : 'Mentorship'}, {href: '#events', label: isAr ? 'الفعاليات' : 'Events'}, {href: '#community', label: isAr ? 'المجتمع' : 'Community'}].map(item => (
            <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 600, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {item.label}
            </a>
          ))}
        </div>
      )}

      {/* Inject hamburger show rule */}
      <style>{`
        @media (max-width: 768px) {
          .landing-hamburger { display: flex !important; }
        }
      `}</style>

      {/* ── HERO SECTION (Navy) ── */}
      <section style={{ 
        backgroundColor: C.navy, minHeight: '100vh', paddingTop: 140, paddingBottom: 60,
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Abstract background grids/points */}
        <div style={{ position: 'absolute', top: '15%', left: '10%', opacity: 0.05, backgroundSize: '24px 24px', backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', width: 300, height: 300 }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '5%', opacity: 0.05, backgroundSize: '24px 24px', backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', width: 400, height: 400 }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 5%', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <motion.div variants={stagger} initial="hidden" animate="visible" style={{ maxWidth: 800, margin: '0 auto' }}>
            <motion.h1 variants={fadeInUp} style={{ 
              fontSize: 'clamp(28px, 5.5vw, 64px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24
            }}>
              {isAr ? 'طوّر مهاراتك لترتقي بمسارك المهني.' : <span dangerouslySetInnerHTML={{__html: 'Grow Your Skills to<br/>Advance Your Career Path.'}} />}
            </motion.h1>
            
            <motion.p variants={fadeInUp} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, lineHeight: 1.6, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
              {isAr ? 'فصول مباشرة عالية الدقة صُممت للارتقاء بمسارك المهني مع نخبة من المعلمين المصريين.' : 'High-definition video & audio live classes built to immediately elevate your career trajectory with elite Egyptian educators.'}
            </motion.p>
            
            <motion.button variants={fadeInUp} 
              onClick={() => navigate('/register')}
              whileHover={{ scale: 1.05, boxShadow: `0 10px 30px ${C.magenta}60` }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: C.magenta, color: '#fff', border: 'none', padding: '18px 40px', borderRadius: 99,
                fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'box-shadow 0.2s',
                boxShadow: `0 4px 20px ${C.magenta}40`
            }}>
              {isAr ? 'ابدأ الآن' : 'Get Started Now'}
            </motion.button>
          </motion.div>

          {/* ── THE 3 FLOATING HERO CARDS ── */}
          <motion.div className="landing-hero-cards" style={{ y: yHero, display: 'flex', justifyContent: 'center', gap: 24, marginTop: 80, flexWrap: 'wrap' }}>
            {/* Yellow Card (Asset 1) */}
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: 'spring' }}
              style={{ width: 280, height: 380, borderRadius: 24, background: C.yellow, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', transform: 'translateY(40px)', flexShrink: 0 }}>
              <img src="/images/showcase-1.jpeg" alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.9 }} />
              <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, background: '#fff', padding: 16, borderRadius: 16, boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.textD }}>{isAr ? 'أحمد مصطفى' : 'Ahmed Mostafa'}</div>
                <div style={{ fontSize: 12, color: C.textM }}>{isAr ? 'مسار الهندسة' : 'Engineering Track'}</div>
              </div>
            </motion.div>

            {/* Blue Center Card (Asset 2) */}
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: 'spring' }}
              style={{ width: 300, height: 420, borderRadius: 24, background: C.blue, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 2, flexShrink: 0 }}>
              <img src="/images/showcase-2.jpeg" alt="Student 2" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.9 }} />
              <div style={{ position: 'absolute', top: 20, right: 20, background: C.magenta, color: '#fff', padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>{isAr ? 'مباشر' : 'LIVE'}</div>
              <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, background: '#fff', padding: 16, borderRadius: 16, boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.textD }}>{isAr ? 'سارة خالد' : 'Sarah Khaled'}</div>
                <div style={{ fontSize: 12, color: C.textM }}>{isAr ? 'مسار الطب' : 'Medical Track'}</div>
              </div>
            </motion.div>

            {/* Orange Card (Asset 3) */}
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, type: 'spring' }}
              style={{ width: 280, height: 380, borderRadius: 24, background: C.orange, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', transform: 'translateY(40px)', flexShrink: 0 }}>
              <img src="/images/showcase-3.jpeg" alt="Student 3" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.9 }} />
              <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, background: '#fff', padding: 16, borderRadius: 16, boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.textD }}>{isAr ? 'عمر يوسف' : 'Omar Youssef'}</div>
                <div style={{ fontSize: 12, color: C.textM }}>{isAr ? 'مسار اللغات' : 'Languages Track'}</div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ── WHITE FEATURES SECTION ── */}
      <section style={{ backgroundColor: C.gray, padding: '120px 5% 80px', position: 'relative' }} id="courses">
        <div className="landing-features-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 64, alignItems: 'center' }}>
          
          {/* Left Side: Video Call Mockup */}
          <div style={{ flex: '1 1 500px', position: 'relative' }}>
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once:true }}
              style={{ background: '#fff', borderRadius: 24, padding: 16, boxShadow: '0 30px 60px rgba(0,0,0,0.08)', position: 'relative', zIndex: 2 }}>
              <img src="/images/showcase-4.jpeg" alt="Video Call Main" style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '16/10' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 8px' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.gray, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎤</div>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.gray, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📹</div>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.gray, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
                </div>
                <button style={{ background: C.magenta, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 99, fontWeight: 700 }}>{isAr ? 'إنهاء الحصة' : 'End Class'}</button>
              </div>
            </motion.div>

            {/* Overlapping Small Call Card */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once:true }} transition={{ delay: 0.3 }}
              className="landing-features-overlay-card"
              style={{ position: 'absolute', bottom: -30, right: -30, width: 220, background: '#fff', borderRadius: 16, padding: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.12)', zIndex: 10 }}>
              <img src="/images/showcase-5.jpeg" alt="Video Call Small" style={{ width: '100%', borderRadius: 10, objectFit: 'cover', aspectRatio: '4/3' }} />
              <div style={{ position: 'absolute', top: 16, right: 16, background: '#10B981', width: 10, height: 10, borderRadius: '50%', border: '2px solid #fff' }} />
            </motion.div>

            {/* Floating UI Elements matching reference */}
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}
              className="landing-floating-badge"
              style={{ position: 'absolute', top: -30, left: -20, background: '#fff', padding: '12px 20px', borderRadius: 99, boxShadow: '0 10px 20px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12, zIndex: 5 }}>
              <span style={{ fontSize: 20 }}>👏</span> <span style={{ fontWeight: 800, color: C.textD }}>{isAr ? 'إجابة ممتازة!' : 'Excellent Answer!'}</span>
            </motion.div>
          </div>

          {/* Right Side: Text & Features */}
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once:true }} style={{ flex: '1 1 min(400px, 100%)' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 800, color: C.textD, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24 }}>
              {isAr ? 'فصول حية بجودة صوت وصورة عالية.' : 'High Quality Video, Audio & Live Class.'}
            </h2>
            <p style={{ color: C.textM, fontSize: 16, lineHeight: 1.7, marginBottom: 40 }}>
              {isAr ? 'استمتع بفصول عالية الدقة بوضوح صوت استثنائي. صُممت بيئة التعلم الخاصة بنا لتقديم تجربة دراسية خالية من الانقطاع من أي مكان في العالم.' : 'Experience high definition classes with crystal clear audio. Our e-learning environment is designed to deliver uninterrupted learning directly to your device globally.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 31, 90, 0.1)', color: C.magenta, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎧</div>
                <span style={{ fontWeight: 700, color: C.textD, fontSize: 15 }}>{isAr ? 'فصول صوتية' : 'Audio Classes'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(14, 165, 233, 0.1)', color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔴</div>
                <span style={{ fontWeight: 700, color: C.textD, fontSize: 15 }}>{isAr ? 'فصول مباشرة' : 'Live Classes'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(249, 115, 22, 0.1)', color: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎥</div>
                <span style={{ fontWeight: 700, color: C.textD, fontSize: 15 }}>{isAr ? 'فصول مسجلة' : 'Recorded Class'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 184, 0, 0.1)', color: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📝</div>
                <span style={{ fontWeight: 700, color: C.textD, fontSize: 15 }}>{isAr ? '٥٠+ ملزمة' : '50+ Notes'}</span>
              </div>
            </div>

            <button onClick={() => navigate('/register')} style={{ 
              marginTop: 48, background: C.navy, color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 99, 
              fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 20px rgba(11, 17, 32, 0.2)'
            }}>
              {isAr ? 'استكشف الدورات ←' : 'Explore Courses →'}
            </button>
          </motion.div>
        
        </div>
      </section>

      {/* ── COURSE GRID SECTION (Assets 6-10) ── */}
      <section style={{ backgroundColor: '#fff', padding: '100px 5%' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: C.textD, marginBottom: 12 }}>{isAr ? 'استكشف أهم المواد' : 'Explore Top Subjects'}</h2>
          <p style={{ color: C.textM, fontSize: 16, marginBottom: 60 }}>{isAr ? 'أتقن مواضيع جديدة مع أفضل المعلمين المصريين' : 'Master new topics from the best Egyptian instructors'}</p>

          <div className="landing-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 32 }}>
            {[
              { title: isAr ? 'مفاهيم متقدمة في الفيزياء' : 'Advanced Physics Concept', tutor: isAr ? 'أ. حسن' : 'Prof. Hassan', img: 'showcase-6.jpeg', tag: isAr ? 'فيزياء' : 'Physics' },
              { title: isAr ? 'كيمياء عضوية' : 'Organic Chemistry Masterclass', tutor: isAr ? 'د. رانيا' : 'Dr. Rania', img: 'showcase-7.jpeg', tag: isAr ? 'كيمياء' : 'Chemistry' },
              { title: isAr ? 'الأدب والنحو العربي' : 'Arabic Literature & Grammar', tutor: isAr ? 'أ. طارق' : 'Mr. Tarek', img: 'showcase-8.jpeg', tag: isAr ? 'لغة عربية' : 'Arabic' }
            ].map((course, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once:true }} transition={{ delay: i*0.15 }}
                style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.06)', border: `1px solid ${C.gray}`, textAlign: isAr ? 'right' : 'left' }}>
                <div style={{ height: 200, position: 'relative' }}>
                  <img src={`/images/${course.img}`} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 16, ...(isAr ? { right: 16 } : { left: 16 }), background: '#fff', padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800, color: C.textD }}>{course.tag}</div>
                </div>
                <div style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.textD, marginBottom: 8, lineHeight: 1.4 }}>{course.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.gray, overflow: 'hidden' }}>
                      <img src={`/images/showcase-${9+i}.jpeg`} alt={course.tutor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: 14, color: C.textM, fontWeight: 600 }}>{course.tutor}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.gray}`, paddingTop: 20 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.magenta }}>{isAr ? 'سجل الآن' : 'Register Now'}</span>
                    <span style={{ fontSize: 18, color: C.gray, transform: isAr ? 'scaleX(-1)' : 'none' }}>→</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: C.navy, padding: '80px 5% 40px', color: '#fff' }}>
        <div className="landing-footer-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 64, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.magenta, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18 }}>e</div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Najah<span style={{color: C.magenta}}>.</span></span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontSize: 14 }}>
              {isAr ? 'منصة التعليم الإلكتروني المتقدمة الأولى في مصر تجمع بين التحليلات الدراسية العميقة والشبكات السريعة وواجهات المؤسسات المهنية.' : "Egypt's premier advanced E-Learning platform combining deep study analytics, high speed networking, and professional institutional interfaces."}
            </p>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 24 }}>{isAr ? 'المنصة' : 'Platform'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              <span style={{ cursor:'pointer' }}>{isAr ? 'الدورات' : 'Courses'}</span>
              <span style={{ cursor:'pointer' }}>{isAr ? 'فصول حية' : 'Live Classes'}</span>
              <span style={{ cursor:'pointer' }}>{isAr ? 'مواد دراسية' : 'Study Materials'}</span>
              <span style={{ cursor:'pointer' }}>{isAr ? 'اختبارات تجريبية' : 'Mock Exams'}</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
