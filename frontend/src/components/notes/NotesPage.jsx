// src/components/notes/NotesPage.jsx — Professional v3
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { notesAPI } from '../../api/index';
import { Card, Button, Input, Select, Tag, EmptyState, SectionHeader, Btn, Spinner } from '../shared/UI';
import { useTranslation } from '../../i18n/index';
import { haptic } from '../../utils/haptics';

const SUBJECTS = ['mathematics','science','arabic','english','social_studies','physics','chemistry','biology'];
const SUBJECT_COLORS = {
  mathematics:'blue', science:'green', arabic:'amber', english:'purple', social_studies:'red',
  physics:'cyan', chemistry:'pink', biology:'green'
};

/* ── SVG Icons ───────────────────────────────────────────── */
const NotebookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);
const FileEditIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);
const LinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

// ── Simple rich-text toolbar actions ──
const TOOLBAR = [
  { cmd: 'bold',           icon: <span style={{fontWeight:900, fontFamily:'serif'}}>B</span> },
  { cmd: 'italic',         icon: <span style={{fontStyle:'italic', fontFamily:'serif'}}>I</span> },
  { cmd: 'underline',      icon: <span style={{textDecoration:'underline'}}>U</span> },
  { cmd: 'strikeThrough',  icon: <span style={{textDecoration:'line-through'}}>S</span> },
  { cmd: 'h2',             icon: <span style={{fontWeight:800, fontSize:14}}>H2</span>, exec: () => document.execCommand('formatBlock', false, 'h3') },
  { cmd: 'ul',             icon: <span>•—</span>, exec: () => document.execCommand('insertUnorderedList') },
  { cmd: 'ol',             icon: <span>1—</span>, exec: () => document.execCommand('insertOrderedList') },
];

/* ── Animation Maps ──────────────────────────────────────── */
const transitionBase = { type: 'spring', stiffness: 350, damping: 28 };

export default function NotesPage() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  const [selectedNote, setSelectedNote] = useState(null);
  const [editTitle, setEditTitle]       = useState('');
  const [editSubject, setEditSubject]   = useState('mathematics');
  const [isDirty, setIsDirty]           = useState(false);
  const [searchQ, setSearchQ]           = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notes', filterSubject, searchQ],
    queryFn: () => notesAPI.list({
      subject: filterSubject || undefined,
      search: searchQ || undefined,
    }),
  });
  const notes = data?.data?.notes || [];

  const { mutate: createNote } = useMutation({
    mutationFn: () => notesAPI.create({ title: isAr ? 'مستند بدون عنوان' : 'Untitled Document', subject: 'mathematics', content: '' }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries(['notes']);
      openNote(data.note);
      toast.success(isAr ? 'تم إنشاء المستند' : 'Document initialized');
    },
  });

  const { mutate: saveNote, isPending: isSaving } = useMutation({
    mutationFn: ({ id, data }) => notesAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['notes']); setIsDirty(false); toast.success('Changes synced'); haptic.light(); },
  });

  const { mutate: deleteNote } = useMutation({
    mutationFn: notesAPI.remove,
    onSuccess: () => { qc.invalidateQueries(['notes']); setSelectedNote(null); toast.success('Document obliterated'); haptic.medium(); },
  });

  const openNote = (note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditSubject(note.subject || 'mathematics');
    setIsDirty(false);
    setTimeout(() => {
      const ed = document.getElementById('note-editor');
      if (ed) ed.innerHTML = note.content || '';
    }, 50);
  };

  const handleSave = () => {
    if (!selectedNote) return;
    const content = document.getElementById('note-editor')?.innerHTML || '';
    saveNote({ id: selectedNote.id, data: { title: editTitle, subject: editSubject, content } });
  };

  const execFormat = (item) => {
    if (item.exec) { item.exec(); return; }
    document.execCommand(item.cmd, false, null);
    document.getElementById('note-editor')?.focus();
  };

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <SectionHeader 
          icon={<NotebookIcon />} 
          title={isAr ? 'ملاحظاتي' : 'My Notes'} 
          subtitle={isAr ? 'نظّم أفكارك وملاحظاتك الدراسية' : 'Organize your study notes and ideas'} 
          noMargin
          gradient
        />
        <Btn variant="primary" onClick={() => createNote()} icon={<span style={{fontSize: 20}}>+</span>}>
          {isAr ? 'ملاحظة جديدة' : 'New Note'}
        </Btn>
      </div>

      <div className="notes-container-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(min(280px, 100%), 320px) 1fr', gap: 24, flex: 1, minHeight: 0 }}>
        
        {/* Left: Notes Sidebar */}
        <div className={`notes-sidebar ${selectedNote ? 'hide-mobile' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input 
              placeholder={isAr ? 'ابحث في مستنداتك...' : 'Search documents...'} 
              value={searchQ} 
              onChange={e => setSearchQ(e.target.value)}
              icon={<SearchIcon />}
            />
            <Select 
              value={filterSubject} 
              onChange={e => setFilterSubject(e.target.value)}
            >
              <option value="">{isAr ? 'كل المواد' : 'All Subjects'}</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s.replace('_',' ').toUpperCase()}</option>)}
            </Select>
          </div>

          {/* List */}
          <div className="scroll-y" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4, paddingBottom: 24 }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
            ) : notes.length === 0 ? (
              <EmptyState 
                icon={<FileEditIcon />} 
                title={isAr ? 'لا توجد ملاحظات بعد' : 'No notes yet'} 
                subtitle={isAr ? 'حاول تغيير الفلاتر أو أنشئ ملاحظة جديدة.' : 'Try adjusting your filters or create a new note.'} 
              />
            ) : (
              notes.map(note => {
                const isSelected = selectedNote?.id === note.id;
                return (
                  <motion.div key={note.id}
                    onClick={() => openNote(note)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="floating-card"
                    style={{
                      padding: '18px 20px', cursor: 'pointer', transition: 'all 0.22s var(--ease)',
                      background: isSelected ? 'var(--surface3)' : undefined,
                      borderColor: isSelected ? 'var(--primary)' : undefined,
                      boxShadow: isSelected ? '0 8px 24px rgba(124,58,237,0.15)' : 'none',
                      borderRadius: 18
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, flex: 1, color: isSelected ? 'var(--primary-light)' : 'var(--text)', fontFamily: 'var(--font-head)' }} className="truncate">
                        {note.title || (isAr ? 'مستند بدون عنوان' : 'Untitled Document')}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 14, minHeight: 38 }}>
                      {note.content ? note.content.replace(/<[^>]*>/g,'').substring(0,70)+'...' : <span style={{fontStyle:'italic', opacity:0.6}}>Empty document...</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tag color={SUBJECT_COLORS[note.subject] || 'primary'}>{note.subject?.replace('_',' ')}</Tag>
                      <span style={{ fontSize: 10.5, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {format(new Date(note.updated_at), 'MMM d')}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Rich Editor */}
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <motion.div 
              key="editor"
              className="notes-editor"
              initial={{ opacity: 0, scale: 0.98, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98, x: 20 }} transition={transitionBase}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <div className="floating-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                
                {/* Header (Title & Meta) */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <button 
                    className="show-mobile-flex"
                    onClick={() => setSelectedNote(null)}
                    style={{
                      background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)',
                      cursor: 'pointer', padding: '8px 16px', borderRadius: 12, marginRight: 8,
                      alignItems: 'center', gap: 6, fontWeight: 700
                    }}
                  >
                    {isAr ? '← رجوع' : '← Back'}
                  </button>
                  <div style={{ flex: 1, display: 'flex', gap: 14, alignItems: 'center', minWidth: 200 }}>
                    <input 
                      value={editTitle} 
                      onChange={e => { setEditTitle(e.target.value); setIsDirty(true); }}
                      placeholder="Document Title"
                      style={{ background: 'none', border: 'none', fontSize: 24, fontWeight: 900, color: 'var(--text)', flex: 1, outline: 'none', fontFamily: 'var(--font-head)', letterSpacing: '-0.025em', padding: 0 }}
                    />
                    <Select 
                      value={editSubject} 
                      onChange={e => { setEditSubject(e.target.value); setIsDirty(true); }}
                      style={{ width: 'auto', padding: '8px 14px', fontSize: 13, fontWeight: 700 }}
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s.replace('_',' ').toUpperCase()}</option>)}
                    </Select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 10 }}>
                    <AnimatePresence>
                      {isDirty && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                          <Btn variant="glass" size="md" onClick={() => { if (window.confirm('Discard changes and revert?')) openNote(selectedNote); }}>Revert</Btn>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Btn variant="aurora" size="md" onClick={handleSave} loading={isSaving} icon={<SaveIcon />}>
                      Sync Now
                    </Btn>
                    <Btn variant="danger" size="md" onClick={() => { if (window.confirm('Erase this knowledge core permanently?')) deleteNote(selectedNote.id); }} style={{ padding: '0 14px' }}>
                      <TrashIcon />
                    </Btn>
                  </div>
                </div>

                {/* Formatting Toolbar */}
                <div style={{ padding: '12px 32px', background: 'var(--glass)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(10px)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {TOOLBAR.map(item => (
                    <motion.button key={item.cmd}
                      whileHover={{ scale: 1.1, background: 'var(--surface3)' }}
                      whileTap={{ scale: 0.9 }}
                      onMouseDown={e => { e.preventDefault(); execFormat(item); }}
                      style={{ 
                        padding: '8px 14px', borderRadius: 10, fontSize: 14,
                        background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                        cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {item.icon}
                    </motion.button>
                  ))}
                  <div style={{ width: 1, height: 24, background: 'var(--border2)', alignSelf: 'center', margin: '0 10px' }} />
                  <motion.button
                    whileHover={{ scale: 1.1, background: 'var(--surface3)' }}
                    whileTap={{ scale: 0.9 }}
                    onMouseDown={e => { e.preventDefault(); const url=prompt('Enter destination URL:'); if(url) document.execCommand('createLink',false,url); }}
                    style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, background: 'transparent', border: '1px solid transparent', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <LinkIcon />
                  </motion.button>
                </div>

                {/* Rich Editor Pane */}
                <div
                  id="note-editor"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setIsDirty(true)}
                  className="scroll-y"
                  style={{
                    flex: 1, padding: '48px 60px', outline: 'none', fontSize: 16, lineHeight: 1.9,
                    color: 'var(--text)', background: 'transparent'
                  }}
                />
                
                {/* Footer Insight bar */}
                <div style={{ padding: '14px 32px', background: 'var(--surface2)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: isDirty ? 'var(--warning)' : '#10b981', boxShadow: isDirty ? '0 0 8px var(--warning)' : '0 0 8px #10b981' }} />
                    {isDirty ? (isAr ? 'تعديلات غير محفوظة' : 'Unsaved Modifications') : (isAr ? 'محفوظ تلقائياً ☁️' : 'Cloud Synchronized')}
                  </span>
                  <span>{isAr ? 'آخر تحديث:' : 'Last saved:'} {format(new Date(selectedNote.updated_at), 'hh:mm a')}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              className="notes-editor-empty hide-mobile"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            >
              <EmptyState 
                icon={<div style={{fontSize: 48, color: 'var(--primary)'}}><NotebookIcon /></div>} 
                title={isAr ? 'اختر ملاحظة' : 'Select a note'} 
                subtitle={isAr ? 'اختر ملاحظة من القائمة أو أنشئ ملاحظة جديدة.' : 'Choose an existing note or create a new one.'} 
                action={<Btn variant="aurora" onClick={() => createNote()} size="lg" icon={<span style={{fontSize:20}}>+</span>}>{isAr ? 'ملاحظة جديدة' : 'New Note'}</Btn>} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
