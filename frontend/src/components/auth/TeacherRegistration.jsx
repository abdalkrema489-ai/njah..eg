import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n/index';

export default function TeacherRegistration() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', 
    subject: '', grades: [], experience: '',
    certificate: null, bio: '', availability: 'full_time'
  });

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
  const handleSubmit = (e) => {
    e.preventDefault();
    if (step < 4) {
      nextStep();
    } else {
      toast.success(t('toast.teacherSubmitted'));
      navigate('/login');
    }
  };

  const steps = [
    { title: 'Basic Info', desc: 'Account details' },
    { title: 'Qualifications', desc: 'Your expertise' },
    { title: 'Verification', desc: 'Upload IDs' },
    { title: 'Profile', desc: 'Bio & Settings' }
  ];

  return (
    <div className="flex justify-center items-center h-full w-full" style={{ padding: '40px 20px', minHeight: '100vh', background: 'var(--ink)' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ width: '100%', maxWidth: '640px', padding: 'var(--card-padding)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', color: 'var(--primary-600)', marginBottom: '8px' }}>Join as an Educator</h1>
          <p style={{ color: 'var(--text3)' }}>Empower students with your knowledge.</p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: 'var(--surface4)', zIndex: 0 }} />
          <motion.div 
            style={{ position: 'absolute', top: '15px', left: '10%', height: '2px', background: 'var(--primary-500)', zIndex: 1 }}
            initial={{ width: '0%' }}
            animate={{ width: `${((step - 1) / 3) * 80}%` }}
          />

          {steps.map((s, i) => {
            const active = step >= i + 1;
            const current = step === i + 1;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: '8px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  background: active ? 'var(--primary-500)' : 'var(--surface)', 
                  border: `2px solid ${active ? 'var(--primary-500)' : 'var(--border)'}`,
                  color: active ? '#fff' : 'var(--text3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '14px', transition: 'all 0.3s'
                }}>
                  {active && !current ? '✓' : i + 1}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: current ? 'var(--text)' : 'var(--text3)' }}>{s.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <div className="flex-col gap-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Full Name</label>
                    <input required type="text" placeholder="Dr. Ahmed Ali" style={{ height: 'var(--input-height-md)' }} 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Email</label>
                    <input required type="email" placeholder="ahmed@university.edu.eg" style={{ height: 'var(--input-height-md)' }}
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Password</label>
                    <input required type="password" placeholder="••••••••" style={{ height: 'var(--input-height-md)' }}
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex-col gap-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Subject Specialty</label>
                    <select required style={{ height: 'var(--input-height-md)' }} 
                       value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                      <option value="">Select a subject...</option>
                      <option value="math">Mathematics</option>
                      <option value="science">Physics / Chemistry</option>
                      <option value="languages">Arabic / English</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Years of Experience</label>
                    <input required type="number" placeholder="5" style={{ height: 'var(--input-height-md)' }}
                      value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex-col gap-4">
                  <div style={{ 
                    border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '40px', 
                    textAlign: 'center', background: 'var(--surface2)', cursor: 'pointer' 
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Upload Teaching ID or Certificate</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>PDF, JPG, PNG up to 5MB</div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="flex-col gap-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Professional Bio</label>
                    <textarea required placeholder="Introduce yourself to the students..." rows={4} style={{ resize: 'none' }}
                      value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Availability</label>
                    <select style={{ height: 'var(--input-height-md)' }}
                      value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})}>
                      <option value="full_time">Full-Time Educator</option>
                      <option value="part_time">Part-Time Tutor</option>
                    </select>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: ' ২৪px', borderTop: '1px solid var(--border)' }}>
            {step > 1 ? (
              <button type="button" onClick={prevStep} style={{
                height: 'var(--button-height-md)', padding: '0 24px', borderRadius: '12px',
                background: 'var(--surface2)', border: '1px solid var(--border)', fontWeight: 600
              }}>
                Back
              </button>
            ) : <div />}
            <button type="submit" style={{
                height: 'var(--button-height-md)', padding: '0 32px', borderRadius: '12px',
                background: 'var(--primary-500)', color: '#fff', border: 'none', fontWeight: 700,
                boxShadow: 'var(--glow)'
            }}>
              {step === 4 ? 'Submit Application' : 'Continue'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Sign In</Link>
        </div>
      </motion.div>
    </div>
  );
}
