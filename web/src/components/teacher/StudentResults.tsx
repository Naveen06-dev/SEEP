import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type AttemptResult = {
  id: string;
  studentName: string;
  regNo: string;
  examTitle: string;
  mcqScore: number;
  codingScore: number;
  totalScore: number;
  status: string;
  resultVisible: boolean;
  startedAt: string;
  submittedAt?: string;
};

export function StudentResults() {
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [retestRequests, setRetestRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const data = await api<AttemptResult[]>('/api/teacher/results');
      setResults(data);

      const retestData = await api<any>('/api/attempts/retest-requests').catch(() => ({ requests: [] }));
      setRetestRequests(retestData.requests || []);
    } catch (err) {
      console.error('Failed to load teacher results', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTestByTeacher = async (reqId: string) => {
    try {
      await api(`/api/attempts/retest-requests/${reqId}/reset-teacher`, { method: 'POST' });
      alert('Test attempt reset successfully! The student can now re-enter and attempt the exam.');
      loadResults();
    } catch (err: any) {
      alert(err.message || 'Failed to reset test attempt');
    }
  };

  const handleToggleVisibility = async (attemptId: string, currentVisible: boolean) => {
    try {
      const endpoint = currentVisible ? `/api/teacher/results/${attemptId}/hide` : `/api/teacher/results/${attemptId}/publish`;
      await api(endpoint, { method: 'PUT' });
      setResults((prev) =>
        prev.map((item) => (item.id === attemptId ? { ...item, resultVisible: !currentVisible } : item))
      );
      if (selectedAttempt && selectedAttempt.id === attemptId) {
        setSelectedAttempt({ ...selectedAttempt, resultVisible: !currentVisible });
      }
    } catch (err) {
      alert('Failed to update result visibility');
    }
  };

  const openAttemptDetails = async (attemptId: string) => {
    try {
      const details = await api<any>(`/api/teacher/results/${attemptId}`);
      setSelectedAttempt(details);
    } catch (err) {
      alert('Failed to load attempt details');
    }
  };

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Student Results & Evaluations</h2>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem' }}>
          Evaluate student attempt submissions, proctoring violations, and control result publication visibility
        </p>
      </div>

      {/* Admin-Approved Retest Requests Section */}
      {retestRequests.some((r) => r.status === 'APPROVED_BY_ADMIN') && (
        <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🛡️</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#818cf8' }}>Admin-Approved Student Retest Requests</h3>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {retestRequests.filter((r) => r.status === 'APPROVED_BY_ADMIN').map((req) => (
              <div key={req.id} style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f3f4f6' }}>{req.studentName} ({req.regNo})</div>
                  <div style={{ fontSize: '0.85rem', color: '#34d399', marginTop: '0.2rem' }}>Exam: {req.examTitle || 'Test'} — <span style={{ color: '#fbbf24' }}>✓ Approved by Admin</span></div>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.3rem' }}>Reason: "{req.reason}"</div>
                </div>
                <button
                  onClick={() => handleResetTestByTeacher(req.id)}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                >
                  🔄 Restart / Reset Test for Student
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
          Loading student exam results...
        </div>
      ) : results.length === 0 ? (
        <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af' }}>No student exam attempts found.</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(17, 24, 39, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem' }}>Student Name</th>
                <th style={{ padding: '1rem' }}>Register No</th>
                <th style={{ padding: '1rem' }}>Exam Title</th>
                <th style={{ padding: '1rem' }}>MCQ Score</th>
                <th style={{ padding: '1rem' }}>Coding Score</th>
                <th style={{ padding: '1rem' }}>Total Score</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Result Visibility</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#f3f4f6' }}>{row.studentName}</td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{row.regNo}</td>
                  <td style={{ padding: '1rem', color: '#cbd5e1' }}>{row.examTitle}</td>
                  <td style={{ padding: '1rem', color: '#818cf8', fontWeight: 600 }}>{row.mcqScore} pts</td>
                  <td style={{ padding: '1rem', color: '#c084fc', fontWeight: 600 }}>{row.codingScore} pts</td>
                  <td style={{ padding: '1rem', color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>{row.totalScore} pts</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: row.status === 'SUBMITTED' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: row.status === 'SUBMITTED' ? '#34d399' : '#fbbf24' }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: row.resultVisible ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: row.resultVisible ? '#34d399' : '#f87171', border: row.resultVisible ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                      {row.resultVisible ? 'Published to Student' : 'Hidden from Student'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openAttemptDetails(row.id)}
                        style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        View Answers
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(row.id, row.resultVisible)}
                        style={{
                          background: row.resultVisible ? 'rgba(239, 68, 68, 0.15)' : 'linear-gradient(135deg, #10b981, #059669)',
                          color: row.resultVisible ? '#f87171' : '#fff',
                          border: row.resultVisible ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        {row.resultVisible ? 'Hide Result' : 'Publish Result'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ATTEMPT DETAILS DRAWER / MODAL */}
      {selectedAttempt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', zIndex: 90, padding: '2rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', maxWidth: '900px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>
                  Student Submission: {selectedAttempt.student?.firstName} {selectedAttempt.student?.lastName}
                </h3>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>
                  Exam: {selectedAttempt.exam?.title} | Score: {selectedAttempt.totalScore} pts | Visibility: {selectedAttempt.resultVisible ? 'Published' : 'Hidden'}
                </p>
              </div>
              <button onClick={() => setSelectedAttempt(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* CODING SUBMISSIONS */}
              <div>
                <h4 style={{ color: '#c084fc', margin: '0 0 1rem 0' }}>Coding Question Submissions ({selectedAttempt.codingSubmissions?.length || 0})</h4>
                {selectedAttempt.codingSubmissions?.map((sub: any) => (
                  <div key={sub.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#f3f4f6' }}>Language: {sub.language?.toUpperCase()}</span>
                      <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>
                        Score: {sub.score} pts ({sub.passedCases} / {sub.totalCases} Passed)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                      Execution Time: {sub.executionTimeMs || 0} ms
                    </div>
                    <pre style={{ background: '#0b0f19', padding: '0.75rem', borderRadius: '6px', color: '#a5b4fc', fontSize: '0.85rem', overflowX: 'auto' }}>
                      {sub.sourceCode}
                    </pre>
                  </div>
                ))}
              </div>

              {/* PROCTORING TELEMETRY VIOLATIONS */}
              <div>
                <h4 style={{ color: '#f87171', margin: '0 0 1rem 0' }}>Proctoring Telemetry Logs ({selectedAttempt.proctorEvents?.length || 0})</h4>
                {selectedAttempt.proctorEvents?.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No proctoring violations recorded for this session.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedAttempt.proctorEvents?.map((evt: any) => (
                      <div key={evt.id} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.6rem 0.8rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#f87171', fontWeight: 600 }}>Violation: {evt.type}</span>
                        <span style={{ color: '#9ca3af' }}>{new Date(evt.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => handleToggleVisibility(selectedAttempt.id, selectedAttempt.resultVisible)}
                style={{
                  background: selectedAttempt.resultVisible ? 'rgba(239, 68, 68, 0.2)' : '#10b981',
                  color: selectedAttempt.resultVisible ? '#f87171' : '#fff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {selectedAttempt.resultVisible ? 'Hide Result From Student' : 'Publish Result To Student'}
              </button>
              <button onClick={() => setSelectedAttempt(null)} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
