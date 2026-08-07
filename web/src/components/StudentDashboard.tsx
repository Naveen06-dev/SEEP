import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type Exam = {
  id: string;
  title: string;
  subject: string;
  department?: string;
  durationMinutes: number;
  mcqCount: number;
  codingCount: number;
  totalMarks: number;
  status: string;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE:    { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
    PUBLISHED: { bg: '#dbeafe', color: '#1d4ed8', label: 'Published' },
    DRAFT:     { bg: '#fef9c3', color: '#92400e', label: 'Draft' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#64748b', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
  );
}

export function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [myAttempts, setMyAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'results'>('available');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('seep_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api<Exam[]>('/api/exams');
      setExams(data.filter((e) => ['ACTIVE', 'PUBLISHED', 'DRAFT'].includes(e.status)));
      const studentUser = localStorage.getItem('seep_user');
      const sid = studentUser ? JSON.parse(studentUser).id : '';
      const attempts = await api<any[]>(`/api/attempts?studentId=${sid}`).catch(() => []);
      setMyAttempts(Array.isArray(attempts) ? attempts : []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || user?.email?.split('@')[0] || 'Student';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#1e293b' }}>

      {/* Top Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 50, height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1.1rem', boxShadow: '0 4px 10px rgba(99,102,241,0.3)' }}>S</div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>SEEP</span>
            <span style={{ fontSize: '0.75rem', color: '#6366f1', marginLeft: '0.4rem', fontWeight: 500 }}>Student Portal</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', borderRadius: '25px', padding: '0.4rem 1rem', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{userName}</span>
          </div>
          <button
            onClick={() => { localStorage.clear(); navigate('/login'); }}
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.45rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Welcome Banner */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', borderRadius: '20px', padding: '2.5rem', marginBottom: '2.5rem', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(99,102,241,0.3)' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: '-60px', right: '60px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ margin: '0 0 0.35rem', fontSize: '0.9rem', opacity: 0.85, fontWeight: 500 }}>{greeting} 👋</p>
            <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.9rem', fontWeight: 800 }}>Welcome back, {userName.split(' ')[0]}!</h1>
            <p style={{ margin: '0 0 1.75rem', opacity: 0.8, fontSize: '0.95rem' }}>Your upcoming exams and results are all here.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Available Exams', value: loading ? '…' : exams.length, icon: '📋' },
                { label: 'Attempts Made', value: loading ? '…' : myAttempts.length, icon: '✍️' },
                { label: 'Results Ready', value: loading ? '…' : myAttempts.filter(a => a.resultVisible).length, icon: '📊' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '1rem 1.5rem', minWidth: '130px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: '0.15rem' }}>{stat.icon}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '0.2rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', background: '#f1f5f9', borderRadius: '10px', padding: '0.3rem', width: 'fit-content', border: '1px solid #e2e8f0' }}>
          {(['available', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.55rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                background: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? '#6366f1' : '#64748b',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'available' ? '🎯 Available Exams' : '📊 My Results'}
            </button>
          ))}
        </div>

        {/* Available Exams */}
        {activeTab === 'available' && (
          <div>
            {loading ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {[1, 2, 3].map(i => <div key={i} style={{ height: '90px', background: '#f1f5f9', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ) : exams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📚</div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>No Exams Available</h3>
                <p style={{ margin: 0, color: '#94a3b8' }}>Your teacher hasn't published any exams yet. Check back later.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.2s ease', cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(99,102,241,0.12)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#c7d2fe'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
                      {/* Icon */}
                      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        📝
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</h3>
                          <StatusBadge status={exam.status} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                          {[
                            { icon: '📚', label: exam.subject },
                            { icon: '⏱', label: `${exam.durationMinutes} min` },
                            { icon: '📝', label: `${exam.mcqCount} MCQ` },
                            { icon: '💻', label: `${exam.codingCount} Coding` },
                          ].map(tag => (
                            <span key={tag.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', padding: '0.2rem 0.6rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                              {tag.icon} {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/student/exam/${exam.id}`)}
                      style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', border: 'none', padding: '0.7rem 1.75rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', flexShrink: 0, whiteSpace: 'nowrap', transition: 'transform 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      Start Exam →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div>
            {myAttempts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>No Results Yet</h3>
                <p style={{ margin: 0, color: '#94a3b8' }}>Complete an exam to see your results here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {myAttempts.map((att) => (
                  <div key={att.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: att.status === 'SUBMITTED' ? '#dcfce7' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                        {att.status === 'SUBMITTED' ? '✅' : att.status === 'MALPRACTICE' ? '🚫' : '⏳'}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.975rem', fontWeight: 700, color: '#1e293b' }}>{att.exam?.title || 'Examination'}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                          {att.submittedAt ? `Submitted ${new Date(att.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'In Progress'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <StatusBadge status={att.status} />
                      {att.resultVisible ? (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.5rem 1rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{att.totalScore ?? '—'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 600, marginTop: '0.1rem' }}>Score</div>
                        </div>
                      ) : (
                        <span style={{ color: '#92400e', fontSize: '0.82rem', background: '#fef9c3', padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid #fde68a', maxWidth: '180px', textAlign: 'center', fontWeight: 500 }}>
                          🔒 Results pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
