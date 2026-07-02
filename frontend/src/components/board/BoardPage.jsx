// src/components/board/BoardPage.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { boardAPI, filesAPI } from '../../api/index';
import { useTranslation } from '../../i18n/index';
import { Card, Btn, Modal, Input, Select, Tag, EmptyState, Avatar, SectionHeader, Spinner, Skeleton } from '../shared/UI';
import { useDraftStore } from '../../context/store';

const SUBJECTS = ['mathematics','science','arabic','english','social_studies'];
const S_ICONS  = { mathematics:'📐',science:'🔬',arabic:'📚',english:'🌐',social_studies:'🌍' };

function PostCard({ post, onLike, onSave }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -10, boxShadow: 'var(--shadow-premium)' }}
      className="floating-card animate-float"
      style={{ 
        borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'all 0.4s var(--ease)',
        background: 'var(--glass)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)'
      }}
    >
      <div style={{ height: 180, position: 'relative', overflow: 'hidden', background: 'var(--surface3)' }}>
        {post.mime_type?.startsWith('image') && post.file_url ? (
          <img src={post.file_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} className="hover-zoom" />
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
             <img src={`/images/showcase-${(String(post.id || post._id || '').charCodeAt(0) % 30 || 0) + 1}.jpeg`} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, mixBlendMode: 'overlay' }} />
             <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}>
                {S_ICONS[post.subject] || '📄'}
             </div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <div style={{ padding: '6px 14px', borderRadius: 12, backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 10, fontWeight: 900, border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '0.05em' }}>
            {post.subject?.replace('_',' ').toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ fontSize: 17, fontWeight: 950, marginBottom: 10, color: 'var(--text)', fontFamily: 'var(--font-head)', letterSpacing: '-0.01em' }} className="truncate">{post.title}</h4>
        <p style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.6, marginBottom: 20, height: 42, overflow: 'hidden', fontWeight: 500 }}>
          {post.description || 'No description provided for this neural asset.'}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Avatar src={post.author_avatar} name={post.author_name} size={32} ring />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{post.author_name}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 700 }}>{format(new Date(post.created_at), 'MMM d, yyyy').toUpperCase()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 'auto' }}>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => onLike(post.id)}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, cursor: 'pointer', height: 36, padding: '0 12px', color: post.liked ? 'var(--danger)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 900, transition: 'all 0.2s' }}>
            <span style={{ fontSize: 16 }}>{post.liked ? '❤️' : '🤍'}</span> {post.likes_count}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => onSave(post.id)}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, cursor: 'pointer', height: 36, padding: '0 12px', color: post.saved ? 'var(--primary)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 900, transition: 'all 0.2s' }}>
            <span style={{ fontSize: 16 }}>{post.saved ? '🔖' : '📌'}</span> {post.saves_count}
          </motion.button>
          {post.file_url && (
            <a href={post.file_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto' }}>
              <Btn size="sm" variant="glass" style={{ borderRadius: 12, fontWeight: 900, fontSize: 11 }}>ACCESS</Btn>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function BoardPage() {
  const { boardDraft, setBoardDraft, clearBoardDraft } = useDraftStore();
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [shareOpen, setShare] = useState(false);
  const [form, setForm] = useState(() => boardDraft || { title: '', description: '', subject: 'mathematics', file_id: '' });
  const qc = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    setBoardDraft(form);
  }, [form, setBoardDraft]);

  const { data, isLoading } = useQuery({
    queryKey: ['board', subject, search, sort],
    queryFn: () => boardAPI.list({ subject: subject || undefined, search: search || undefined, sort }),
  });
  const { data: filesData } = useQuery({ queryKey: ['files'], queryFn: () => filesAPI.list({ limit: 50 }) });
  const files = filesData?.data?.files || [];
  const posts = data?.data?.posts || [];

  const { mutate: like } = useMutation({ mutationFn: boardAPI.like, onSuccess: () => qc.invalidateQueries(['board']) });
  const { mutate: save_ } = useMutation({ mutationFn: boardAPI.save, onSuccess: () => qc.invalidateQueries(['board']) });
  const { mutate: create, isPending } = useMutation({
    mutationFn: () => boardAPI.create(form),
    onSuccess: () => { 
      qc.invalidateQueries(['board']); 
      setShare(false); 
      clearBoardDraft();
      setForm({ title: '', description: '', subject: 'mathematics', file_id: '' });
      toast.success(t('toast.postShared')); 
    },
    onError: () => toast.error(t('toast.shareFailed')),
  });

  return (
    <div className="animate-fade-up">
      <SectionHeader 
        icon="📋" 
        title="Community Exchange" 
        subtitle="Access peer-reviewed study resources and share your own expertise with the community."
        action={<Btn variant="primary" onClick={() => setShare(true)}>+ Share Resource</Btn>} 
      />

      <div className="floating-panel" style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center', padding: '12px 14px', borderRadius: 24 }}>
        <Btn size="sm" variant={!subject ? 'primary' : 'ghost'} onClick={() => setSubject('')} style={{ borderRadius: 14, fontWeight: 900 }}>ALL MATRIX</Btn>
        {SUBJECTS.map(s => (
          <Btn key={s} size="sm" variant={subject === s ? 'primary' : 'ghost'} onClick={() => setSubject(s)} style={{ borderRadius: 14, fontWeight: 900 }}>
            {S_ICONS[s]} {s.replace('_',' ').toUpperCase()}
          </Btn>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          <Select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 150, height: 44, borderRadius: 14, fontWeight: 900, fontSize: 12 }}>
            <option value="newest">NEWEST</option>
            <option value="popular">POPULAR</option>
          </Select>
          <div style={{ width: 260 }}>
            <Input placeholder="Search global assets..." value={search} onChange={e => setSearch(e.target.value)} prefix="🔍" style={{ height: 44, borderRadius: 14 }} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 28 }}
          aria-busy="true"
          aria-label="Loading posts…"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ gap: 16, padding: 24, borderRadius: 24 }}>
              <div className="skeleton-row">
                <Skeleton.Avatar size={44} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Skeleton.Text width="52%" style={{ height: 16 }} />
                  <Skeleton.Text width="38%" style={{ height: 12 }} />
                </div>
                <Skeleton.Badge />
              </div>
              <Skeleton.Text width="75%" style={{ height: 18 }} />
              <Skeleton.Paragraph lines={3} />
              <Skeleton.Block height={130} />
              <div className="skeleton-row">
                <Skeleton.Button width={80} style={{ height: 32 }} />
                <Skeleton.Button width={80} style={{ height: 32 }} />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="floating-panel">
          <EmptyState 
            icon="📋" 
            title="Matrix Empty" 
            subtitle="The global exchange for this vector is currently offline. Be the first to initialize shared knowledge." 
            action={<Btn variant="primary" onClick={() => setShare(true)} style={{ height: 48, padding: '0 24px', borderRadius: 14, fontWeight: 900 }}>INITIALIZE RESOURCE</Btn>} 
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 28 }}>
          <AnimatePresence>
            {posts.map(p => <PostCard key={p.id} post={p} onLike={like} onSave={save_} />)}
          </AnimatePresence>
        </div>
      )}

      <Modal open={shareOpen} onClose={() => setShare(false)} title="📤 Share Intellectual Asset" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Input label="Asset Title *" placeholder="e.g. Advanced Calculus Summary"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          
          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What makes this resource valuable?"
              style={{ 
                width: '100%', padding: '12px 16px', fontSize: 14, borderRadius: 12, minHeight: 100,
                background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', 
                resize: 'none', outline: 'none', transition: 'all 0.2s' 
              }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Select label="Subject Category" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
              {SUBJECTS.map(s => <option key={s} value={s}>{S_ICONS[s]} {s.replace('_',' ').toUpperCase()}</option>)}
            </Select>
            <Select label="Source File *" value={form.file_id} onChange={e => setForm(f => ({ ...f, file_id: e.target.value }))}>
              <option value="">Choose from Vault</option>
              {files.map(f => <option key={f.id} value={f.id}>{f.original_name}</option>)}
            </Select>
          </div>

          {files.length === 0 && (
            <div style={{ padding: 12, background: 'rgba(239,68,68,0.05)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>
              ⚠️ You must upload a file to the Vault before you can share it.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
            <Btn variant="ghost" onClick={() => setShare(false)}>Cancel</Btn>
            <Btn variant="primary" loading={isPending} disabled={!form.title || !form.file_id} onClick={() => create()}>Publish Resource →</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
