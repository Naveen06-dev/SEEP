import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Exam = {
  id: string;
  title: string;
  subject: string;
  department?: string;
  durationMinutes: number;
  mcqCount: number;
  codingCount: number;
  status: string;
  createdAt: string;
  mcqQuestions?: any[];
  codingQuestions?: any[];
};

export function QuestionPapersList() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit' | null>(null);

  // Publish Modal state
  const [publishTarget, setPublishTarget] = useState<Exam | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const data = await api<Exam[]>('/api/teacher/exams');
      setExams(data);
    } catch (err) {
      console.error('Failed to load teacher exams', err);
    } finally {
      setLoading(false);
    }
  };

  const openView = async (examId: string) => {
    try {
      const exam = await api<Exam>(`/api/teacher/exams/${examId}`);
      setSelectedExam(exam);
      setViewMode('view');
    } catch (err) {
      alert('Failed to load exam details');
    }
  };

  const openEdit = async (examId: string) => {
    try {
      const exam = await api<Exam>(`/api/teacher/exams/${examId}`);
      setSelectedExam(exam);
      setViewMode('edit');
    } catch (err) {
      alert('Failed to load exam details');
    }
  };

  const handleDeleteQuestion = async (qId: string, type: 'mcq' | 'coding') => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api(`/api/teacher/questions/${qId}?type=${type}`, { method: 'DELETE' });
      alert('Question deleted');
      if (selectedExam) {
        openEdit(selectedExam.id);
      }
      loadExams();
    } catch (err: any) {
      alert(err.message || 'Failed to delete question');
    }
  };

  const handleConfirmPublish = async () => {
    if (!publishTarget) return;
    try {
      setIsPublishing(true);
      await api(`/api/teacher/exams/${publishTarget.id}/publish`, { method: 'POST' });
      alert(`Exam "${publishTarget.title}" published successfully!`);
      setPublishTarget(null);
      loadExams();
    } catch (err: any) {
      alert(err.message || 'Publishing failed. Please complete all questions and test cases.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Question Papers</h2>
          <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem' }}>
            Manage, edit, review, and publish created examination question papers
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
          Loading question papers...
        </div>
      ) : exams.length === 0 ? (
        <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>No question papers created yet.</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(17, 24, 39, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem' }}>Exam Title</th>
                <th style={{ padding: '1rem' }}>Subject & Dept</th>
                <th style={{ padding: '1rem' }}>Duration</th>
                <th style={{ padding: '1rem' }}>Counts (MCQ / Coding)</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Created Date</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#f3f4f6' }}>{exam.title}</td>
                  <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                    {exam.subject} <span style={{ color: '#64748b' }}>({exam.department})</span>
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1' }}>{exam.durationMinutes} mins</td>
                  <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                    {exam.mcqCount} MCQ / {exam.codingCount} Coding
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: exam.status === 'PUBLISHED' || exam.status === 'ACTIVE' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                        color: exam.status === 'PUBLISHED' || exam.status === 'ACTIVE' ? '#34d399' : '#fbbf24',
                        border: exam.status === 'PUBLISHED' || exam.status === 'ACTIVE' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)'
                      }}
                    >
                      {exam.status === 'ACTIVE' ? 'PUBLISHED' : exam.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                    {new Date(exam.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openView(exam.id)}
                        style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEdit(exam.id)}
                        style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                      {exam.status === 'DRAFT' && (
                        <button
                          onClick={() => setPublishTarget(exam)}
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          Publish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CONFIRM PUBLISH DIALOG MODAL */}
      {publishTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 100 }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '2rem', maxWidth: '480px', width: '90%' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#f3f4f6' }}>Confirm Exam Publication</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to publish <strong style={{ color: '#fff' }}>"{publishTarget.title}"</strong>?
              <br />
              Once published, this exam will become immediately visible and active for students.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPublishTarget(null)}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {isPublishing ? 'Publishing...' : 'Yes, Publish Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW / EDIT MODAL */}
      {selectedExam && viewMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', zIndex: 90, padding: '2rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', maxWidth: '850px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                {viewMode === 'view' ? 'View Question Paper' : 'Edit Question Paper'}: {selectedExam.title}
              </h3>
              <button onClick={() => setViewMode(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* MCQ QUESTIONS SECTION */}
              <div>
                <h4 style={{ color: '#818cf8', margin: '0 0 1rem 0' }}>MCQ Questions ({selectedExam.mcqQuestions?.length || 0})</h4>
                {selectedExam.mcqQuestions?.map((q, idx) => (
                  <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>Q{idx + 1}. {q.text}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#34d399' }}>{q.marks} Marks</span>
                        {viewMode === 'edit' && (
                          <button onClick={() => handleDeleteQuestion(q.id, 'mcq')} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      {q.options?.map((opt: string, optIdx: number) => (
                        <div key={optIdx} style={{ padding: '0.4rem', borderRadius: '4px', background: optIdx === q.correctIndex ? 'rgba(52, 211, 153, 0.15)' : 'transparent', border: optIdx === q.correctIndex ? '1px solid rgba(52, 211, 153, 0.3)' : 'none' }}>
                          Option {['A','B','C','D'][optIdx]}: {opt} {optIdx === q.correctIndex && '✓ (Correct)'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* CODING QUESTIONS SECTION */}
              <div>
                <h4 style={{ color: '#c084fc', margin: '0 0 1rem 0' }}>Coding Questions ({selectedExam.codingQuestions?.length || 0})</h4>
                {selectedExam.codingQuestions?.map((q, idx) => (
                  <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>Coding Task #{idx + 1}: {q.title}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#c084fc' }}>{q.marks} Marks</span>
                        {viewMode === 'edit' && (
                          <button onClick={() => handleDeleteQuestion(q.id, 'coding')} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '0 0 0.5rem 0' }}>{q.description}</p>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Time Limit: {q.timeLimitMs}ms | Memory Limit: {q.memoryLimitMB}MB | Test Cases: {q.testCases?.length || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>
              <button onClick={() => setViewMode(null)} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
