// src/components/teacher/StudentsOverview.jsx — Real data + i18n + CSV export
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from '../../i18n/index';
import { usersAPI } from '../../api/index';
import { Avatar } from '../shared/UI';

const STATUS_COLORS = {
  Active:     { bg: 'rgba(16,185,129,0.1)',  color: '#10B981' },
  Monitor:    { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B' },
  'At Risk':  { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
  Inactive:   { bg: 'rgba(107,114,128,0.1)', color: '#6B7280' },
};

const STATUS_AR = { Active: 'نشط', Monitor: 'مراقبة', 'At Risk': 'في خطر', Inactive: 'غير نشط', All: 'الكل' };

export default function StudentsOverview() {
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-students'],
    queryFn: () => usersAPI.getMyStudents().then(r => r.data.students),
    staleTime: 2 * 60 * 1000,
  });
  const students = data || [];

  const filtered = useMemo(() => students.filter(s => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || s.status === filterStatus;
    return matchSearch && matchStatus;
  }), [students, search, filterStatus]);

  const handleMessage = (student) => {
    navigate('/chat', { state: { openUserId: student.userId, userName: student.name } });
  };

  const handleExportCSV = () => {
    const headers = isAr
      ? 'الاسم,البريد,الصف,المجموعات,متوسط الدرجات,الحالة'
      : 'Name,Email,Grade,Groups,Avg Grade,Status';
    const rows = students.map(s =>
      `"${s.name}","${s.email}","${s.grade || ''}","${(s.groups || []).join('; ')}","${s.avgGrade || 'N/A'}","${s.status}"`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--error)' }}>
      {isAr ? 'فشل تحميل بيانات الطلاب' : 'Failed to load students'}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '10px 0', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            {isAr ? '👨‍🎓 جميع الطلاب' : '👨‍🎓 All Students'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {isAr ? `${students.length} طالب في مجموعاتك` : `${students.length} students across your groups`}
          </p>
        </div>
        <button onClick={handleExportCSV} style={{
          padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border)',
          background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
          fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          📥 {isAr ? 'تصدير CSV' : 'Export CSV'}
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
        <input
          type="text"
          placeholder={isAr ? 'ابحث بالاسم أو البريد...' : 'Search by name or email...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '10px 16px', borderRadius: 12,
            border: '1px solid var(--border)', background: 'var(--surface2)',
            color: 'var(--text)', fontSize: 13, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Active', 'Monitor', 'At Risk', 'Inactive'].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)} style={{
              padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: filterStatus === f ? 'var(--primary)' : 'transparent',
              color: filterStatus === f ? '#fff' : 'var(--text3)',
              border: `1px solid ${filterStatus === f ? 'var(--primary)' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}>
              {isAr ? STATUS_AR[f] || f : f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 12 }}>
        {[
          { label: isAr ? 'إجمالي' : 'Total', value: students.length, icon: '👥', color: '#6366F1' },
          { label: isAr ? 'نشط' : 'Active', value: students.filter(s => s.status === 'Active').length, icon: '✅', color: '#10B981' },
          { label: isAr ? 'مراقبة' : 'Monitor', value: students.filter(s => s.status === 'Monitor').length, icon: '⚠️', color: '#F59E0B' },
          { label: isAr ? 'في خطر' : 'At Risk', value: students.filter(s => s.status === 'At Risk').length, icon: '🔴', color: '#EF4444' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '16px 18px', borderRadius: 14, background: 'var(--surface)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
            {isAr ? 'لا يوجد طلاب' : 'No students found'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface3)', borderBottom: '1px solid var(--border)' }}>
                  {[
                    isAr ? 'الطالب' : 'Student',
                    isAr ? 'المجموعات' : 'Groups',
                    isAr ? 'متوسط الدرجات' : 'Avg Grade',
                    isAr ? 'الحالة' : 'Status',
                    '',
                  ].map((h, i) => (
                    <th key={i} style={{
                      padding: '14px 20px', fontSize: 11, fontWeight: 800, color: 'var(--text4)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      textAlign: isAr ? 'right' : 'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, idx) => {
                  const sc = STATUS_COLORS[student.status] || STATUS_COLORS.Active;
                  return (
                    <motion.tr key={student.userId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={student.name} size={38} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{student.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{student.email}</div>
                            {student.grade && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{student.grade}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(student.groups || []).map((g, i) => (
                            <span key={i} style={{
                              fontSize: 11, padding: '3px 8px', borderRadius: 6,
                              background: 'rgba(99,102,241,0.08)', color: '#6366F1', fontWeight: 600,
                            }}>{g}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {student.avgGrade != null ? (
                          <div>
                            <div style={{
                              fontSize: 18, fontWeight: 800,
                              color: student.avgGrade >= 75 ? '#10B981' : student.avgGrade >= 60 ? '#F59E0B' : '#EF4444'
                            }}>
                              {student.avgGrade}%
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text4)' }}>
                              {isAr ? `${student.quizCount || 0} اختبار` : `${student.quizCount || 0} quizzes`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text4)' }}>{isAr ? 'لا توجد بيانات' : 'No data'}</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                          background: sc.bg, color: sc.color,
                        }}>
                          {isAr ? STATUS_AR[student.status] || student.status : student.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button onClick={() => handleMessage(student)}
                          title={isAr ? 'مراسلة' : 'Message'}
                          style={{
                            width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                            background: 'var(--surface)', cursor: 'pointer', fontSize: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'inherit'; }}
                        >💬</button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
