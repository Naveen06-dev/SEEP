import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    ACTIVE:    { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', label: 'Active' },
    PUBLISHED: { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', label: 'Published' },
    DRAFT:     { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: 'Draft' },
    SUBMITTED: { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', label: 'Submitted' },
    MALPRACTICE:{ bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', label: 'Terminated' },
  };
  const s = map[status] || { bg: 'rgba(255, 255, 255, 0.08)', color: '#9ca3af', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', border: `1px solid ${s.color}40` }}>{s.label}</span>
  );
}

const DEFAULT_MANUAL_EXAM: Exam = {
  id: 'exam-demo-1',
  title: 'Manual Proctoring Test (1 MCQ + 1 Coding)',
  subject: 'Computer Science 101',
  department: 'Computer Science',
  durationMinutes: 60,
  mcqCount: 1,
  codingCount: 1,
  totalMarks: 20,
  status: 'ACTIVE'
};

export function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [myAttempts, setMyAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'subject'>('date');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'available';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('seep_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api<Exam[]>('/api/exams');
      setExams(data.filter((e) => ['ACTIVE', 'PUBLISHED'].includes(e.status)));
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

  // Retest Request Modal State
  const [retestExam, setRetestExam] = useState<any | null>(null);
  const [retestReason, setRetestReason] = useState('');
  const [isSubmittingRetest, setIsSubmittingRetest] = useState(false);

  // Warning Modal State before redirecting to extension step
  const [warningExamId, setWarningExamId] = useState<string | null>(null);

  // Start Exam Handler (If extension is already verified, launch exam countdown directly; otherwise open extension setup)
  const handleStartExam = (examId: string) => {
    const isVerified = localStorage.getItem(`seep_ext_verified_${examId}`) === 'true' || localStorage.getItem('seep_ext_verified_any') === 'true';
    if (isVerified) {
      window.open(`/student/exam/${examId}?step=step5_countdown`, '_blank');
    } else {
      setWarningExamId(examId);
    }
  };

  const handleSendRetestRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retestExam || !retestReason.trim()) return;
    try {
      setIsSubmittingRetest(true);
      await api('/api/attempts/retest-request', {
        method: 'POST',
        body: JSON.stringify({
          examId: retestExam.examId || retestExam.exam?.id,
          studentId: user?.id || 'student-1',
          studentName: userName,
          regNo: user?.regNo || 'CS2026001',
          reason: retestReason
        })
      });
      alert('Retest request submitted to Administrator for approval!');
      setRetestExam(null);
      setRetestReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit retest request');
    } finally {
      setIsSubmittingRetest(false);
    }
  };

  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || user?.email?.split('@')[0] || 'Student';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const fetchedExams = exams.filter((e) => ['ACTIVE', 'PUBLISHED'].includes(e.status));
  const hasDefaultExam = fetchedExams.some((e) => e.id === DEFAULT_MANUAL_EXAM.id);
  const availableExams = hasDefaultExam ? fetchedExams : [DEFAULT_MANUAL_EXAM, ...fetchedExams];

  const sortedExams = [...availableExams].sort((a, b) => {
    if (sortBy === 'duration') {
      return (a.durationMinutes || 0) - (b.durationMinutes || 0);
    }
    if (sortBy === 'subject') {
      return (a.subject || '').localeCompare(b.subject || '');
    }
    return 0;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0c0e17', color: '#f3f4f6', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", borderTop: '2px solid #5d5fef', margin: 0, padding: '0 0 4rem 0' }}>
      
      {/* ── 1. TOP NAVBAR HEADER ── */}
      <header style={{
        background: '#0c0e17',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.9rem 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Left: Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#5d5fef', display: 'grid', placeItems: 'center', fontSize: '1.2rem', boxShadow: '0 4px 14px rgba(93, 95, 239, 0.4)' }}>
            🛡️
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            SEEP 
          </span>
        </div>

        {/* Center: Nav Links */}
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {[
            { id: 'available', label: 'Dashboard' },
            { id: 'my-exams', label: 'My Exams' },
            { id: 'results', label: 'Results' },
            
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? '#ffffff' : '#9ca3af',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  paddingBottom: '0.35rem',
                  borderBottom: isActive ? '2px solid #5d5fef' : '2px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions (Notification & Avatar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#191c2e', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '1rem' }}>
            🔔
          </button>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#ffffff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 2px 10px rgba(99,102,241,0.4)' }}>
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── 2. MAIN LAYOUT (SIDEBAR + WORKSPACE) ── */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 2.5rem', display: 'flex', gap: '2.5rem' }}>
        
        {/* LEFT SIDEBAR */}
        <aside style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.25rem' }}>
              ACCOUNT
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('seep_user');
              navigate('/login');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              marginTop: 'auto'
            }}
          >
            <span>🚪</span> Log Out
          </button>
        </aside>

        {/* RIGHT MAIN WORKSPACE */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* ── HERO BANNER CONTAINER ── */}
          <div style={{
            background: '#191c2e',
            borderRadius: '24px',
            padding: '2.25rem 2.5rem',
            marginBottom: '2.25rem',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '2rem',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4)',
            flexWrap: 'wrap'
          }}>
            {/* Left Hero Content */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.35rem 0.95rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: '#ffffff',
                fontWeight: 700,
                letterSpacing: '0.04em',
                marginBottom: '1rem'
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34d399' }} />
                SYSTEM STATUS: SECURED
              </div>

              <h1 style={{ margin: '0 0 0.5rem', fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }}>
                {greeting},<br />
                {userName.split(' ')[0]} 👋
              </h1>

              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '420px' }}>
                Your authentication verified. {availableExams.length} assessment{availableExams.length === 1 ? '' : 's'} require your attention today.
              </p>
            </div>

            {/* Right Stat Cards Cluster */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(110px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#21253b', borderRadius: '18px', padding: '1.25rem 1.4rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{loading ? '…' : availableExams.length}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>AVAILABLE EXAMS</div>
              </div>
              <div style={{ background: '#21253b', borderRadius: '18px', padding: '1.25rem 1.4rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{loading ? '…' : myAttempts.length}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>ATTEMPTS</div>
              </div>
              <div style={{ background: '#21253b', borderRadius: '18px', padding: '1.25rem 1.4rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{loading ? '…' : myAttempts.filter(a => a.resultVisible).length}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>RESULTS</div>
              </div>
            </div>
          </div>

          {/* ── TAB & SORT CONTROL BAR ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Pill Switch */}
            <div style={{ background: '#141724', padding: '4px', borderRadius: '20px', display: 'flex', gap: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setActiveTab('available')}
                style={{
                  padding: '0.55rem 1.4rem',
                  borderRadius: '16px',
                  border: 'none',
                  background: activeTab === 'available' ? '#5d5fef' : 'transparent',
                  color: activeTab === 'available' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: activeTab === 'available' ? '0 4px 14px rgba(93,95,239,0.4)' : 'none'
                }}
              >
                <span>🎯</span> Available Exams
              </button>
              <button
                onClick={() => setActiveTab('results')}
                style={{
                  padding: '0.55rem 1.4rem',
                  borderRadius: '16px',
                  border: 'none',
                  background: activeTab === 'results' ? '#5d5fef' : 'transparent',
                  color: activeTab === 'results' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: activeTab === 'results' ? '0 4px 14px rgba(93,95,239,0.4)' : 'none'
                }}
              >
                <span>⏱</span> Past Attempts
              </button>
            </div>

            {/* Sort Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
              <span>SORT BY:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{ background: '#191c2e', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.45rem 1rem', borderRadius: '10px', fontSize: '0.82rem', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="date">Date Added</option>
                <option value="duration">Duration</option>
                <option value="subject">Subject</option>
              </select>
            </div>
          </div>

          {/* ── 3-COLUMN CARDS GRID (AVAILABLE EXAMS & MY EXAMS) ── */}
          {(activeTab === 'available' || activeTab === 'my-exams') && (
            <div>
              {loading ? (
                <div style={{ background: '#191c2e', padding: '3.5rem', borderRadius: '20px', textAlign: 'center', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Loading active exams & proctored schedules...
                </div>
              ) : availableExams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#191c2e', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📚</div>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#ffffff' }}>No Available Exams</h3>
                  <p style={{ margin: 0, color: '#94a3b8' }}>You have completed all published exams or no new tests are active at this time.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {sortedExams.map((exam, idx) => {
                    const isVerified = localStorage.getItem(`seep_ext_verified_${exam.id}`) === 'true' || localStorage.getItem('seep_ext_verified_any') === 'true';
                    const iconSymbol = idx % 3 === 0 ? '</>' : idx % 3 === 1 ? 'B' : '🛡️';

                    return (
                      <div
                        key={exam.id}
                        style={{
                          background: '#191c2e',
                          borderRadius: '20px',
                          padding: '1.5rem 2rem',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '2rem',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s ease',
                          flexWrap: 'wrap'
                        }}
                      >
                        {/* Left: Icon + Main Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, minWidth: '280px' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#252a42', color: '#818cf8', display: 'grid', placeItems: 'center', fontSize: '1.35rem', fontWeight: 800, flexShrink: 0 }}>
                            {iconSymbol}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                                {exam.title}
                              </h3>
                              <span style={{
                                background: isVerified ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 191, 36, 0.12)',
                                border: isVerified ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
                                color: isVerified ? '#34d399' : '#fbbf24',
                                padding: '0.2rem 0.65rem',
                                borderRadius: '20px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isVerified ? '#34d399' : '#fbbf24' }} />
                                {isVerified ? 'VERIFIED' : 'EXT REQUIRED'}
                              </span>
                            </div>

                            <p style={{ margin: '0 0 0.65rem', color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.4 }}>
                              Official proctored examination covering {exam.subject.toLowerCase()} core topics and coding challenges.
                            </p>

                            {/* Tags Row */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ background: '#21253b', color: '#cbd5e1', padding: '0.25rem 0.65rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                                ⏱ {exam.durationMinutes} Mins
                              </span>
                              {exam.mcqCount > 0 && (
                                <span style={{ background: '#21253b', color: '#cbd5e1', padding: '0.25rem 0.65rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                                  📝 {exam.mcqCount} MCQ
                                </span>
                              )}
                              {exam.codingCount > 0 && (
                                <span style={{ background: '#21253b', color: '#cbd5e1', padding: '0.25rem 0.65rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                                  💻 {exam.codingCount} Coding
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Start Action */}
                        <button
                          onClick={() => handleStartExam(exam.id)}
                          style={{
                            background: 'linear-gradient(135deg, #5d5fef 0%, #4f46e5 100%)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.85rem 2rem',
                            borderRadius: '14px',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            boxShadow: '0 6px 20px rgba(93, 95, 239, 0.4)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          Start Exam →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── RESULTS TAB ── */}
          {activeTab === 'results' && (
            <div>
              {myAttempts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#191c2e', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📊</div>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#ffffff' }}>No Results Yet</h3>
                  <p style={{ margin: 0, color: '#94a3b8' }}>Complete an exam to see your test scores and performance breakdown here.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {myAttempts.map((att) => (
                    <div key={att.id} style={{ background: '#191c2e', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '20px', padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: att.status === 'SUBMITTED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: att.status === 'SUBMITTED' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', display: 'grid', placeItems: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                          {att.status === 'SUBMITTED' ? '✅' : att.status === 'MALPRACTICE' ? '🚫' : '⏳'}
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 0.3rem', fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>{att.exam?.title || 'Examination'}</h4>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                            {att.submittedAt ? `Submitted ${new Date(att.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'In Progress'}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <StatusBadge status={att.status} />
                        <button
                          onClick={() => handleStartExam(att.examId || att.exam?.id || 'exam-demo-1')}
                          style={{ background: 'linear-gradient(135deg, #5d5fef, #4f46e5)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                        >
                          🚀 Retake Exam
                        </button>
                        {att.status === 'MALPRACTICE' && (
                          <button
                            onClick={() => setRetestExam(att)}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.6rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                          >
                            📩 Request Retest
                          </button>
                        )}
                        {att.resultVisible ? (
                          <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '12px', padding: '0.5rem 1.25rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', lineHeight: 1 }}>{att.totalScore ?? '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#6ee7b7', fontWeight: 600, marginTop: '0.15rem' }}>Score</div>
                          </div>
                        ) : (
                          att.status !== 'MALPRACTICE' && (
                            <span style={{ color: '#fbbf24', fontSize: '0.82rem', background: 'rgba(251, 191, 36, 0.12)', padding: '0.55rem 1.1rem', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.3)', fontWeight: 600 }}>
                              🔒 Results Pending Approval
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SECURITY CENTER TAB ── */}
          {activeTab === 'security' && (
            <div style={{ background: '#191c2e', borderRadius: '24px', padding: '2.5rem', border: '1px solid rgba(255, 255, 255, 0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(93, 95, 239, 0.15)', border: '1px solid rgba(93, 95, 239, 0.3)', color: '#818cf8', display: 'grid', placeItems: 'center', fontSize: '1.75rem' }}>
                  🛡️
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.35rem', fontWeight: 800 }}>Security & Anti-Cheat Center</h3>
                  <p style={{ margin: '0.2rem 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>NeoExamShield active verification & proctoring integrity status</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#21253b', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>EXTENSION MONITOR</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} /> Active & Monitoring
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>NeoExamShield Chrome extension controls disabled switch verification.</p>
                </div>

                <div style={{ background: '#21253b', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>INCOGNITO DETECTION</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} /> Blocked
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>Incognito mode is strictly prohibited during test sessions.</p>
                </div>

                <div style={{ background: '#21253b', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>AI MALPRACTICE LOGS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚡ Real-time Telemetry
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>Tab switching, multiple screens, and hotkeys are logged automatically.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── RETEST REQUEST FORM MODAL ── */}
      {retestExam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
          <form onSubmit={handleSendRetestRequest} style={{ background: '#191c2e', borderRadius: '24px', padding: '2.25rem', maxWidth: '500px', width: '90%', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📩</span>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff', fontWeight: 800 }}>Request Retest Approval</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Your test was terminated due to a proctoring violation. Submit a justification message to the <strong>Administrator</strong> for retest approval.
            </p>
            <textarea
              required
              rows={4}
              value={retestReason}
              onChange={(e) => setRetestReason(e.target.value)}
              placeholder="Explain why your test was interrupted (e.g., accidental Esc press, power cut, tab switch)..."
              style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: '#21253b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '1.25rem', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRetestExam(null)}
                style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', border: 'none', padding: '0.65rem 1.35rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRetest}
                style={{ background: 'linear-gradient(135deg, #5d5fef, #4f46e5)', color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                {isSubmittingRetest ? 'Sending...' : 'Submit to Admin'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── EXTENSION WARNING MODAL ── */}
      {warningExamId && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'grid', placeItems: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '2.25rem 2.5rem',
            maxWidth: '540px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            position: 'relative',
            color: '#1e293b'
          }}>
            <button
              onClick={() => setWarningExamId(null)}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                border: 'none', background: 'transparent',
                fontSize: '1.25rem', cursor: 'pointer', color: '#64748b'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              Warning!
            </h2>

            <p style={{ margin: '0 0 2rem', fontSize: '0.96rem', color: '#334155', lineHeight: 1.65 }}>
              Please refrain from using Incognito Window. Kindly install / enable 'NeoExamShield' to take the test. Click 'OK' to install the extension from the Chrome Web Store.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  const targetId = warningExamId;
                  setWarningExamId(null);
                  window.open(`/student/exam/${targetId}?step=step3_chrome_store`, '_blank');
                }}
                style={{
                  background: '#5d5fef',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.7rem 2rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(93, 95, 239, 0.4)',
                  transition: 'all 0.15s ease'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
