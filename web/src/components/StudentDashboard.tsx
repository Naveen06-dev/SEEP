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

export function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [myAttempts, setMyAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'results' ? 'results' : 'available';

  const setActiveTab = (tab: 'available' | 'results') => {
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
      // STRICT FILTER: Only show exams published/active by Admin
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

  // Pre-start 3-Second Countdown State
  const [countdownExamId, setCountdownExamId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  // Retest Request Modal State
  const [retestExam, setRetestExam] = useState<any | null>(null);
  const [retestReason, setRetestReason] = useState('');
  const [isSubmittingRetest, setIsSubmittingRetest] = useState(false);

  const startCountdown = (examId: string) => {
    setCountdownExamId(examId);
    setCountdown(3);
  };

  useEffect(() => {
    if (!countdownExamId) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown reached 0: launch exam
      const targetId = countdownExamId;
      setCountdownExamId(null);
      navigate(`/student/exam/${targetId}`);
    }
  }, [countdownExamId, countdown, navigate]);

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

  return (
    <div style={{ maxWidth: '1180px', color: '#f3f4f6' }}>

      {/* Hero Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.15))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        padding: '2rem 2.25rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.9rem', color: '#a5b4fc', fontWeight: 500 }}>{greeting} 👋</p>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.9rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #c7d2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Welcome back, {userName.split(' ')[0]}!
          </h1>
          <p style={{ margin: '0 0 1.75rem', color: '#9ca3af', fontSize: '0.92rem' }}>
            Your active exams, proctored test schedules, and performance reports are ready.
          </p>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Published Exams', value: loading ? '…' : exams.length, icon: '📋', accent: '#818cf8' },
              { label: 'Attempts Made', value: loading ? '…' : myAttempts.length, icon: '✍️', accent: '#34d399' },
              { label: 'Results Ready', value: loading ? '…' : myAttempts.filter(a => a.resultVisible).length, icon: '📊', accent: '#c084fc' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'rgba(17, 24, 39, 0.7)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '1rem 1.5rem', minWidth: '150px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: '0.15rem' }}>{stat.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.accent, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.25rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(17, 24, 39, 0.8)', padding: '0.4rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', width: 'fit-content' }}>
        {(['available', 'results'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              border: activeTab === tab ? '1px solid #6366f1' : '1px solid transparent',
              background: activeTab === tab ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))' : 'transparent',
              color: activeTab === tab ? '#ffffff' : '#9ca3af',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab === 'available' ? '🎯 1. Available Exams' : '📊 2. My Results'}
          </button>
        ))}
      </div>

      {/* Available Exams */}
      {activeTab === 'available' && (
        <div>
          {loading ? (
            <div style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '3rem', borderRadius: '14px', textAlign: 'center', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
              Loading available exams...
            </div>
          ) : exams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(17, 24, 39, 0.7)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📚</div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#f3f4f6' }}>No Published Exams Available</h3>
              <p style={{ margin: 0, color: '#9ca3af' }}>Exams created by teachers are currently pending Admin publication approval.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  style={{
                    background: 'rgba(17, 24, 39, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '1.5rem 1.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                      📝
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f3f4f6' }}>{exam.title}</h3>
                        <StatusBadge status={exam.status} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {[
                          { icon: '📚', label: exam.subject },
                          { icon: '⏱', label: `${exam.durationMinutes} min` },
                          { icon: '📝', label: `${exam.mcqCount} MCQ` },
                          { icon: '💻', label: `${exam.codingCount} Coding` },
                        ].map(tag => (
                          <span key={tag.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.04)', padding: '0.2rem 0.65rem', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            {tag.icon} {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => startCountdown(exam.id)}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.75rem 1.85rem',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}
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
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(17, 24, 39, 0.7)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#f3f4f6' }}>No Results Yet</h3>
              <p style={{ margin: 0, color: '#9ca3af' }}>Complete an exam to see your test scores and performance breakdown here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {myAttempts.map((att) => (
                <div key={att.id} style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: att.status === 'SUBMITTED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: att.status === 'SUBMITTED' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                      {att.status === 'SUBMITTED' ? '✅' : att.status === 'MALPRACTICE' ? '🚫' : '⏳'}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.3rem', fontSize: '1rem', fontWeight: 700, color: '#f3f4f6' }}>{att.exam?.title || 'Examination'}</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>
                        {att.submittedAt ? `Submitted ${new Date(att.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'In Progress'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <StatusBadge status={att.status} />
                    {att.status === 'MALPRACTICE' && (
                      <button
                        onClick={() => setRetestExam(att)}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        📩 Request Retest
                      </button>
                    )}
                    {att.resultVisible ? (
                      <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '0.5rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', lineHeight: 1 }}>{att.totalScore ?? '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6ee7b7', fontWeight: 600, marginTop: '0.15rem' }}>Score</div>
                      </div>
                    ) : (
                      att.status !== 'MALPRACTICE' && (
                        <span style={{ color: '#fbbf24', fontSize: '0.82rem', background: 'rgba(251, 191, 36, 0.12)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)', fontWeight: 600 }}>
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

      {/* 3-SECOND PRE-START COUNTDOWN MODAL BUFFER */}
      {countdownExamId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11, 15, 25, 0.9)', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center', zIndex: 100 }}>
          <div style={{ background: '#111827', borderRadius: '24px', padding: '3rem', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem auto', color: '#fff', fontSize: '2.5rem', fontWeight: 800, boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)' }}>
              {countdown}
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem', fontWeight: 800, color: '#f3f4f6' }}>Preparing Environment</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              Initializing secure proctoring engine and balancing server load. Starting in {countdown} seconds...
            </p>
          </div>
        </div>
      )}

      {/* RETEST REQUEST FORM MODAL */}
      {retestExam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
          <form onSubmit={handleSendRetestRequest} style={{ background: '#111827', borderRadius: '20px', padding: '2rem', maxWidth: '500px', width: '90%', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📩</span>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f3f4f6' }}>Request Retest Approval</h3>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Your test was terminated due to a proctoring violation. Submit a justification message to the <strong>Administrator</strong> for retest approval.
            </p>
            <textarea
              required
              rows={4}
              value={retestReason}
              onChange={(e) => setRetestReason(e.target.value)}
              placeholder="Explain why your test was interrupted (e.g., accidental Esc press, power cut, tab switch)..."
              style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '1.25rem', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRetestExam(null)}
                style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRetest}
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                {isSubmittingRetest ? 'Sending...' : 'Submit to Admin'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
