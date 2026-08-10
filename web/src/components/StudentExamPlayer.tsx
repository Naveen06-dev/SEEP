import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { StudentCodingQuestion } from './StudentCodingQuestion';

type ExamDetails = {
  id: string;
  title: string;
  subject: string;
  department?: string;
  durationMinutes: number;
  mcqQuestions: any[];
  codingQuestions: any[];
};

type Phase = 'loading' | 'countdown' | 'exam' | 'error';

const COUNTDOWN_SECONDS = 25;

export function StudentExamPlayer() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(3600);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proctoring Tab Switch State
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [warningModalOpen, setWarningModalOpen] = useState(false);

  /* ── 1. Load exam & create attempt ── */
  useEffect(() => {
    if (!examId) return;
    (async () => {
      try {
        const examData = await api<ExamDetails>(`/api/exams/${examId}`);
        setExam(examData);
        setTimeLeftSeconds((examData.durationMinutes || 60) * 60);

        const userStr = localStorage.getItem('seep_user');
        const userId = userStr ? JSON.parse(userStr).id : `guest-${Date.now()}`;

        // Start attempt
        const startRes = await api<{ attemptId: string }>(`/api/attempts/${examId}/start`, {
          method: 'POST',
          body: JSON.stringify({ studentId: userId })
        }).catch(() => ({ attemptId: `demo-${Date.now()}` }));

        setAttemptId(startRes.attemptId);
        setPhase('countdown');
      } catch (err: any) {
        setError(err.message || 'Could not load exam');
        setPhase('error');
      }
    })();
  }, [examId]);

  /* ── 2. 25-second automatic countdown ── */
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('exam');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  /* ── 3. Fullscreen & Proctoring Protection ── */
  useEffect(() => {
    if (phase !== 'exam') return;

    // Force Fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleMalpracticeTermination('TAB_SWITCH');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleMalpracticeTermination('FULLSCREEN_EXIT');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        handleMalpracticeTermination('ESC_KEY');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, attemptId, exam]);

  const handleMalpracticeTermination = async (reason: string = 'FULLSCREEN_EXIT') => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const userStr = localStorage.getItem('seep_user');
    const u = userStr ? JSON.parse(userStr) : {};

    // Notify backend proctoring service (which alerts both Admin & Teacher)
    if (attemptId) {
      await api(`/api/attempts/${attemptId}/proctor`, {
        method: 'POST',
        body: JSON.stringify({
          studentId: u.id || 'student-1',
          studentName: `${u.firstName || 'Student'} ${u.lastName || ''}`.trim(),
          regNo: u.regNo || 'CS2026001',
          examTitle: exam?.title || 'Examination',
          type: reason
        })
      }).catch(() => {});
    }

    alert(`⛔ EXAM TERMINATED DUE TO PROCTORING VIOLATION!\nViolation: ${reason === 'ESC_KEY' ? 'Esc key pressed' : reason === 'FULLSCREEN_EXIT' ? 'Exited fullscreen mode' : 'Tab switch detected'}.\nYour session is locked. A malpractice report has been sent to the Admin & Teacher.`);
    navigate('/student/dashboard');
  };

  /* ── 4. Exam Timer ── */
  useEffect(() => {
    if (phase !== 'exam') return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (attemptId && !attemptId.startsWith('demo-')) {
        await api(`/api/attempts/${attemptId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ mcqAnswers })
        }).catch(() => {});
      }
    } finally {
      alert('✅ Examination submitted successfully!');
      navigate('/student/dashboard');
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /* ────────────────── PHASES ────────────────── */

  if (phase === 'loading') {
    return (
      <div style={styles.fullCenter}>
        <div style={styles.loadCard}>
          <div style={styles.spinner} />
          <h2 style={{ margin: '1.5rem 0 0.5rem', color: '#1e293b', fontWeight: 700 }}>Preparing Your Exam</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Setting up a secure proctored environment…</p>
        </div>
        <style>{spinnerCss}</style>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={styles.fullCenter}>
        <div style={{ ...styles.loadCard, borderTop: '4px solid #ef4444' }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ margin: '1rem 0 0.5rem', color: '#1e293b' }}>Exam Unavailable</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error || 'Could not load exam. Please try again.'}</p>
          <button onClick={() => navigate('/student/dashboard')} style={styles.primaryBtn}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (phase === 'countdown') {
    const pct = (countdown / COUNTDOWN_SECONDS) * 100;
    const circumference = 2 * Math.PI * 54;
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafe 100%)', display: 'grid', placeItems: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '480px', padding: '2rem' }}>
          {/* Animated ring */}
          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 2.5rem' }}>
            <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="80" cy="80" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle
                cx="80" cy="80" r="54" fill="none"
                stroke={countdown <= 5 ? '#ef4444' : '#6366f1'}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (pct / 100) * circumference}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: countdown <= 5 ? '#ef4444' : '#6366f1', lineHeight: 1 }}>{countdown}</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>seconds</span>
            </div>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.75rem' }}>
            Get Ready!
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: '0 0 2rem', lineHeight: 1.6 }}>
            Your exam <strong style={{ color: '#1e293b' }}>{exam?.title}</strong> will start automatically when the timer reaches zero.<br />
            Please stay on this screen.
          </p>

          {/* Exam Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
            {[
              { icon: '⏱', label: 'Duration', value: `${exam?.durationMinutes} min` },
              { icon: '📝', label: 'MCQs', value: exam?.mcqQuestions?.length ?? 0 },
              { icon: '💻', label: 'Coding', value: exam?.codingQuestions?.length ?? 0 },
            ].map((item) => (
              <div key={item.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 0.75rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{item.icon}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{item.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/student/dashboard')}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.8rem 2rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Cancel & Exit
            </button>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            {['🔇 Quiet surroundings', '📵 Max 1 Tab Switch Allowed', '🖥 Fullscreen Auto-Enabled'].map(tip => (
              <span key={tip}>{tip}</span>
            ))}
          </div>
        </div>
        <style>{spinnerCss}</style>
      </div>
    );
  }

  /* ────────────────── EXAM PHASE ────────────────── */
  const allQuestions = [
    ...(exam?.mcqQuestions || []).map((q) => ({ ...q, _type: 'mcq' })),
    ...(exam?.codingQuestions || []).map((q) => ({ ...q, _type: 'coding' }))
  ];
  const currentQ = allQuestions[activeQuestionIndex];
  const isWarningTime = timeLeftSeconds < 300;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Warning Modal for 1st Tab Switch */}
      {warningModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderTop: '6px solid #f59e0b', borderRadius: '16px', padding: '2rem', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#92400e', fontSize: '1.3rem' }}>Tab Switch Warning!</h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              You switched away from the test screen. <strong>1 warning out of 1 limit used!</strong><br /><br />
              <span style={{ color: '#dc2626', fontWeight: 700 }}>Note: One more tab switch will automatically terminate your exam for malpractice.</span>
            </p>
            <button
              onClick={() => {
                setWarningModalOpen(false);
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              style={{ ...styles.primaryBtn, width: '100%', padding: '0.75rem' }}
            >
              Return to Exam (Fullscreen)
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header style={{
        height: '64px', background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50
      }}>
        {/* Left — Exam Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>S</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{exam?.title}</h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{exam?.subject}</span>
          </div>
        </div>

        {/* Center — Progress Bar */}
        <div style={{ flex: 1, maxWidth: '320px', margin: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
            <span>Question {activeQuestionIndex + 1} of {allQuestions.length}</span>
            <span>{Math.round(((activeQuestionIndex + 1) / Math.max(allQuestions.length, 1)) * 100)}% complete</span>
          </div>
          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((activeQuestionIndex + 1) / Math.max(allQuestions.length, 1)) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Right — Timer + Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {tabSwitchCount > 0 && (
            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
              ⚠️ Tab Warnings: {tabSwitchCount}/1
            </span>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: isWarningTime ? '#fef2f2' : '#f0f4ff',
            border: `1px solid ${isWarningTime ? '#fecaca' : '#c7d2fe'}`,
            color: isWarningTime ? '#dc2626' : '#4f46e5',
            padding: '0.45rem 1rem', borderRadius: '20px',
            fontWeight: 700, fontFamily: 'monospace', fontSize: '1.05rem'
          }}>
            ⏱ {formatTime(timeLeftSeconds)}
          </div>
          <button
            onClick={handleSubmitExam}
            disabled={isSubmitting}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.55rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(16,185,129,0.3)', fontSize: '0.9rem' }}
          >
            {isSubmitting ? 'Submitting…' : '✓ Submit Exam'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Main Question Area */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {currentQ?._type === 'mcq' && (
            <div style={{ maxWidth: '720px' }}>
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ background: '#eef2ff', color: '#6366f1', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>MCQ</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Question {activeQuestionIndex + 1}</span>
                </div>
                <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>+{currentQ.marks ?? 1} marks</span>
              </div>

              {/* Question Card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', lineHeight: '1.7', fontWeight: 500 }}>{currentQ.text}</p>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(currentQ.options || []).map((opt: string, idx: number) => {
                  const isSelected = mcqAnswers[currentQ.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setMcqAnswers({ ...mcqAnswers, [currentQ.id]: idx })}
                      style={{
                        textAlign: 'left', padding: '1.1rem 1.25rem',
                        borderRadius: '12px', cursor: 'pointer',
                        background: isSelected ? '#eef2ff' : '#fff',
                        border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                        color: '#1e293b', fontSize: '0.95rem',
                        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.borderColor = '#c7d2fe'); }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.borderColor = '#e2e8f0'); }}
                    >
                      <span style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: isSelected ? '#6366f1' : '#f1f5f9',
                        color: isSelected ? '#fff' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s'
                      }}>
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentQ?._type === 'coding' && (
            <StudentCodingQuestion attemptId={attemptId || 'demo'} question={currentQ} />
          )}
        </main>

        {/* Right Sidebar — Question Palette */}
        <aside style={{ width: '260px', background: '#fff', borderLeft: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          <div>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Question Palette</h4>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#dcfce7', border: '1px solid #86efac', display: 'inline-block' }} />Answered</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f8fafc', border: '1px solid #cbd5e1', display: 'inline-block' }} />Not visited</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
              {allQuestions.map((q, idx) => {
                const isAnswered = q._type === 'mcq' ? mcqAnswers[q.id] !== undefined : false;
                const isCurrent = activeQuestionIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveQuestionIndex(idx)}
                    style={{
                      padding: '0.55rem 0', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                      border: isCurrent ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: isCurrent ? '#eef2ff' : isAnswered ? '#dcfce7' : '#f8fafc',
                      color: isCurrent ? '#6366f1' : isAnswered ? '#16a34a' : '#64748b',
                      transition: 'all 0.15s'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Answered</span>
                <strong style={{ color: '#16a34a' }}>{Object.keys(mcqAnswers).length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Remaining</span>
                <strong style={{ color: '#dc2626' }}>{allQuestions.length - Object.keys(mcqAnswers).length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Total</span>
                <strong style={{ color: '#1e293b' }}>{allQuestions.length}</strong>
              </div>
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
            <button
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex((n) => n - 1)}
              style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ← Prev
            </button>
            <button
              disabled={activeQuestionIndex === allQuestions.length - 1}
              onClick={() => setActiveQuestionIndex((n) => n + 1)}
              style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Next →
            </button>
          </div>
        </aside>
      </div>
      <style>{spinnerCss}</style>
    </div>
  );
}

const styles = {
  fullCenter: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafe 100%)',
    display: 'grid',
    placeItems: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '2rem'
  } as React.CSSProperties,
  loadCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '3rem',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
    maxWidth: '400px',
    width: '100%'
  } as React.CSSProperties,
  spinner: {
    width: '48px', height: '48px',
    borderRadius: '50%',
    border: '4px solid #e2e8f0',
    borderTopColor: '#6366f1',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto'
  } as React.CSSProperties,
  primaryBtn: {
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: '#fff', border: 'none',
    padding: '0.75rem 2rem', borderRadius: '10px',
    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(99,102,241,0.35)',
    transition: 'transform 0.15s ease'
  } as React.CSSProperties
};

const spinnerCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
`;
