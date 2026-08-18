import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

type TabType = 'DEPARTMENTS' | 'TEACHERS' | 'STUDENTS' | 'APPROVALS' | 'RESULTS' | 'RETEST_REQUESTS' | 'AUDIT_LOGS' | 'EXTENSION_SECURITY';

export function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = (searchParams.get('tab') as TabType) || 'DEPARTMENTS';
  const activeTab: TabType = ['DEPARTMENTS', 'TEACHERS', 'STUDENTS', 'APPROVALS', 'RESULTS', 'RETEST_REQUESTS', 'AUDIT_LOGS', 'EXTENSION_SECURITY'].includes(urlTab) ? urlTab : 'DEPARTMENTS';

  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);

  // Data states
  const [departments, setDepartments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [retestRequests, setRetestRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [extSecurityLogs, setExtSecurityLogs] = useState<any[]>([]);
  const [extSettings, setExtSettings] = useState<any>({
    requireExtension: true,
    lockOnDisconnect: true,
    disconnectToleranceSeconds: 5,
    allowExamResume: true
  });

  // Filter states
  const [selectedDeptTeacher, setSelectedDeptTeacher] = useState<string>('ALL');
  const [selectedDeptStudent, setSelectedDeptStudent] = useState<string>('ALL');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>('ALL');

  // Modal / Action states
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [publishTarget, setPublishTarget] = useState<any | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);

      const [depts, tchs, stds, exms, res, retests, logs, extAudit] = await Promise.all([
        api<any[]>('/api/admin/departments').catch(() => []),
        api<any[]>('/api/admin/teachers').catch(() => []),
        api<any[]>('/api/admin/students').catch(() => []),
        api<any[]>('/api/admin/exams').catch(() => []),
        api<any[]>('/api/admin/results').catch(() => []),
        api<any>('/api/attempts/retest-requests').catch(() => ({ requests: [] })),
        api<any[]>('/api/admin/audit-logs').catch(() => []),
        api<any>('/api/extension/audit-logs').catch(() => ({ logs: [], securitySettings: {} }))
      ]);

      setDepartments(depts);
      setTeachers(tchs);
      setStudents(stds);
      setExams(exms);
      setStudentResults(res);
      setRetestRequests(retests.requests || []);
      setAuditLogs(logs);
      if (extAudit && extAudit.logs) {
        setExtSecurityLogs(extAudit.logs);
        if (extAudit.securitySettings) setExtSettings(extAudit.securitySettings);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // Action Handlers
  const handleApproveAndPublish = async () => {
    if (!publishTarget) return;
    try {
      setIsPublishing(true);
      await api(`/api/admin/exams/${publishTarget.id}/publish`, { method: 'POST' });
      alert(`Exam "${publishTarget.title}" approved and published successfully!`);
      setPublishTarget(null);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishExam = async (exam: any) => {
    try {
      await api(`/api/admin/exams/${exam.id}/unpublish`, { method: 'POST' });
      alert(`🛑 Exam "${exam.title}" stopped sharing! It is now hidden from student available exams.`);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to stop sharing exam');
    }
  };

  const handleApproveRetest = async (reqId: string) => {
    try {
      await api(`/api/attempts/retest-requests/${reqId}/approve-admin`, { method: 'POST' });
      alert('✓ Retest request APPROVED by Admin! Sent to Teacher for attempt reset.');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve retest request');
    }
  };

  const handleRejectRetest = async (reqId: string) => {
    try {
      await api(`/api/admin/retest-requests/${reqId}/reject`, { method: 'POST' });
      alert('✕ Retest request REJECTED by Admin.');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject retest request');
    }
  };

  // Department & Audit Filters
  const filteredTeachers = selectedDeptTeacher === 'ALL'
    ? teachers
    : teachers.filter(t => t.department === selectedDeptTeacher);

  const filteredStudents = selectedDeptStudent === 'ALL'
    ? students
    : students.filter(s => s.department === selectedDeptStudent);

  const filteredAuditLogs = auditSeverityFilter === 'ALL'
    ? auditLogs
    : auditLogs.filter(l => l.severity === auditSeverityFilter);

  const pendingApprovalExams = exams.filter(e => e.status !== 'ACTIVE' && e.status !== 'PUBLISHED');

  return (
    <div style={{ maxWidth: '1180px', color: '#f3f4f6' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.2)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '0.75rem' }}>
            <span>🛡️ SEEP Administrator Command Center</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #ffffff, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Smart Examination And Evaluation Platform
          </h1>
          <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.92rem' }}>
            Manage departments, faculty, students, exam publication approvals, student scores, and retest requests.
          </p>
        </div>
        <button
          onClick={loadAllAdminData}
          style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          🔄 Refresh Dashboard
        </button>
      </div>

      {/* 7-Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', background: 'rgba(17, 24, 39, 0.8)', padding: '0.4rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {[
          { key: 'DEPARTMENTS', label: '🏢 1. Department Details' },
          { key: 'TEACHERS', label: '👨‍🏫 2. Teacher Details' },
          { key: 'STUDENTS', label: '🎓 3. Student Details' },
          { key: 'APPROVALS', label: `📋 4. Test Approvals (${pendingApprovalExams.length})` },
          { key: 'RESULTS', label: '📊 5. Student Results' },
          { key: 'RETEST_REQUESTS', label: `📩 6. Retest Requests (${retestRequests.filter(r => r.status === 'PENDING_ADMIN').length})` },
          { key: 'AUDIT_LOGS', label: '🛡️ 7. Audit Logs' },
          { key: 'EXTENSION_SECURITY', label: '🔒 8. E-Extension Security' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '8px',
              border: activeTab === tab.key ? '1px solid #10b981' : '1px solid transparent',
              background: activeTab === tab.key ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: activeTab === tab.key ? '#34d399' : '#9ca3af',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Placeholder */}
      {loading ? (
        <div style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#9ca3af' }}>
          Loading dashboard data...
        </div>
      ) : (
        <>


          {/* MENU 2: DEPARTMENT DETAILS */}
          {activeTab === 'DEPARTMENTS' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {departments.map((dept) => (
                  <div key={dept.id} style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🏢</span>
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {dept.code}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#f3f4f6' }}>{dept.name}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                      <div>👨‍🏫 Teachers: <strong>{dept.teacherCount}</strong></div>
                      <div>🎓 Students: <strong>{dept.studentCount}</strong></div>
                      <div>📝 Exams: <strong>{dept.activeExams}</strong></div>
                      <div>✍️ Attempts: <strong>{dept.totalAttempts}</strong></div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>Department Performance Summary</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem' }}>Department Name</th>
                      <th style={{ padding: '1rem' }}>Code</th>
                      <th style={{ padding: '1rem' }}>Faculty Count</th>
                      <th style={{ padding: '1rem' }}>Enrolled Students</th>
                      <th style={{ padding: '1rem' }}>Published Tests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{d.name}</td>
                        <td style={{ padding: '1rem', color: '#34d399', fontWeight: 700 }}>{d.code}</td>
                        <td style={{ padding: '1rem' }}>{d.teacherCount} Teachers</td>
                        <td style={{ padding: '1rem' }}>{d.studentCount} Students</td>
                        <td style={{ padding: '1rem', color: '#818cf8', fontWeight: 600 }}>{d.activeExams} Exams</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENU 2: DEPARTMENT-WISE TEACHER DETAILS */}
          {activeTab === 'TEACHERS' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f3f4f6' }}>Faculty Roster</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Filter Department:</label>
                  <select
                    value={selectedDeptTeacher}
                    onChange={(e) => setSelectedDeptTeacher(e.target.value)}
                    style={{ background: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem' }}>Teacher Name</th>
                      <th style={{ padding: '1rem' }}>Employee ID</th>
                      <th style={{ padding: '1rem' }}>Department</th>
                      <th style={{ padding: '1rem' }}>Assigned Subject</th>
                      <th style={{ padding: '1rem' }}>Created Exams</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#f3f4f6' }}>{t.name}</td>
                        <td style={{ padding: '1rem', color: '#818cf8', fontWeight: 600 }}>{t.employeeId}</td>
                        <td style={{ padding: '1rem', color: '#cbd5e1' }}>{t.department}</td>
                        <td style={{ padding: '1rem', color: '#cbd5e1' }}>{t.subject}</td>
                        <td style={{ padding: '1rem', color: '#34d399', fontWeight: 700 }}>{t.examCount} Papers</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENU 3: DEPARTMENT-WISE STUDENT DETAILS */}
          {activeTab === 'STUDENTS' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f3f4f6' }}>Enrolled Student Directory</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Filter Department:</label>
                  <select
                    value={selectedDeptStudent}
                    onChange={(e) => setSelectedDeptStudent(e.target.value)}
                    style={{ background: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem' }}>Student Name</th>
                      <th style={{ padding: '1rem' }}>Register No</th>
                      <th style={{ padding: '1rem' }}>Email</th>
                      <th style={{ padding: '1rem' }}>Department</th>
                      <th style={{ padding: '1rem' }}>Exams Attempted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#f3f4f6' }}>{s.name}</td>
                        <td style={{ padding: '1rem', color: '#34d399', fontWeight: 700 }}>{s.regNo}</td>
                        <td style={{ padding: '1rem', color: '#cbd5e1' }}>{s.email}</td>
                        <td style={{ padding: '1rem', color: '#cbd5e1' }}>{s.department}</td>
                        <td style={{ padding: '1rem', color: '#818cf8', fontWeight: 600 }}>{s.attemptsCount} Attempts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENU 4: TEST APPROVAL MENU */}
          {activeTab === 'APPROVALS' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', color: '#f3f4f6' }}>Question Paper Publication Approval</h3>
                <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>
                  Review teacher-submitted question papers and click <strong>Approve & Publish</strong> to release tests to students.
                </p>
              </div>

              <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem' }}>Exam Title</th>
                      <th style={{ padding: '1rem' }}>Subject & Dept</th>
                      <th style={{ padding: '1rem' }}>Questions</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => {
                      const isPublished = exam.status === 'ACTIVE' || exam.status === 'PUBLISHED';
                      return (
                        <tr key={exam.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600, color: '#f3f4f6' }}>{exam.title}</td>
                          <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                            {exam.subject} <span style={{ color: '#64748b' }}>({exam.department || 'CS'})</span>
                          </td>
                          <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                            {exam.mcqCount} MCQ / {exam.codingCount} Coding
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: isPublished ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)', color: isPublished ? '#34d399' : '#fbbf24', border: isPublished ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)' }}>
                              {isPublished ? '✓ PUBLISHED' : '⏳ PENDING ADMIN APPROVAL'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setSelectedExam(exam)}
                                style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                              >
                                Review Paper
                              </button>
                              {!isPublished ? (
                                <button
                                  onClick={() => setPublishTarget(exam)}
                                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)' }}
                                >
                                  🚀 Approve & Publish
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnpublishExam(exam)}
                                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.4rem 0.85rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                                >
                                  🛑 Stop Sharing
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENU 5: TEST RESULTS OF STUDENTS WITH MARKS */}
          {activeTab === 'RESULTS' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', color: '#f3f4f6' }}>Student Exam Performance & Marks</h3>
                <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>
                  Comprehensive breakdown of student test attempts, MCQ scores, Coding scores, and total marks.
                </p>
              </div>

              <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '1rem' }}>Student Name</th>
                      <th style={{ padding: '1rem' }}>Reg No</th>
                      <th style={{ padding: '1rem' }}>Exam Title</th>
                      <th style={{ padding: '1rem' }}>MCQ Score</th>
                      <th style={{ padding: '1rem' }}>Coding Score</th>
                      <th style={{ padding: '1rem' }}>Total Marks</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#f3f4f6' }}>{r.studentName}</td>
                        <td style={{ padding: '1rem', color: '#34d399', fontWeight: 700 }}>{r.regNo}</td>
                        <td style={{ padding: '1rem', color: '#cbd5e1' }}>{r.examTitle}</td>
                        <td style={{ padding: '1rem', color: '#818cf8', fontWeight: 600 }}>{r.mcqScore} Marks</td>
                        <td style={{ padding: '1rem', color: '#c084fc', fontWeight: 600 }}>{r.codingScore} Marks</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.95rem' }}>
                            {r.totalScore} Marks
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: r.status === 'SUBMITTED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: r.status === 'SUBMITTED' ? '#34d399' : '#f87171' }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENU 6: STUDENT REQUEST FOR RETEST WITH GREEN APPROVE & RED REJECT */}
          {activeTab === 'RETEST_REQUESTS' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', color: '#f3f4f6' }}>Student Retest Approval Queue</h3>
                <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>
                  Review student retest requests and use the <strong>Green Approve</strong> or <strong>Red Reject</strong> buttons.
                </p>
              </div>

              {retestRequests.length === 0 ? (
                <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                  No student retest requests submitted.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {retestRequests.map((req) => (
                    <div key={req.id} style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f3f4f6' }}>{req.studentName}</span>
                          <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {req.regNo}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.88rem', color: '#34d399', fontWeight: 600, marginBottom: '0.5rem' }}>
                          Exam: {req.examTitle || 'Examination'}
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.75rem', borderRadius: '8px', margin: 0, lineHeight: 1.4 }}>
                          💬 Student Message: "{req.reason}"
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {req.status === 'PENDING_ADMIN' ? (
                          <>
                            {/* GREEN APPROVE BUTTON */}
                            <button
                              onClick={() => handleApproveRetest(req.id)}
                              style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.7rem 1.4rem',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                              }}
                            >
                              ✓ Approve Retest
                            </button>

                            {/* RED REJECT BUTTON */}
                            <button
                              onClick={() => handleRejectRetest(req.id)}
                              style={{
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.7rem 1.4rem',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                              }}
                            >
                              ✕ Reject Retest
                            </button>
                          </>
                        ) : req.status === 'APPROVED_BY_ADMIN' ? (
                          <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                            ✓ Approved by Admin → Sent to Teacher
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                            ✕ Rejected by Admin
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MENU 8: SYSTEM AUDIT LOGS (AD-05) */}
          {activeTab === 'AUDIT_LOGS' && (
            <div style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f3f4f6' }}>System Security & Audit Trail</h3>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Immutable log of administrative, faculty, and system security events</div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select
                    value={auditSeverityFilter}
                    onChange={(e) => setAuditSeverityFilter(e.target.value)}
                    style={{ background: '#1f2937', color: '#f3f4f6', border: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="ALL">All Severities</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="HIGH">HIGH</option>
                  </select>

                  <button
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8," + ["Timestamp,Actor,Role,Action,Details,IP,Severity", ...filteredAuditLogs.map(l => `"${l.timestamp}","${l.actor}","${l.role}","${l.action}","${l.details}","${l.ipAddress}","${l.severity}"`)].join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `audit_trail_${Date.now()}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📥 Export Audit Trail (CSV)
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>Actor</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>Action Event</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>Details</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>IP Address</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontFamily: 'monospace' }}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#f3f4f6', fontWeight: 600 }}>{log.actor} <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>({log.role})</span></td>
                        <td style={{ padding: '0.75rem 1rem', color: '#34d399', fontWeight: 700 }}>{log.action}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#d1d5db' }}>{log.details}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontFamily: 'monospace' }}>{log.ipAddress}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: log.severity === 'HIGH' ? 'rgba(239,68,68,0.2)' : log.severity === 'WARN' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                            color: log.severity === 'HIGH' ? '#f87171' : log.severity === 'WARN' ? '#fbbf24' : '#34d399',
                            border: log.severity === 'HIGH' ? '1px solid rgba(239,68,68,0.3)' : log.severity === 'WARN' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(16,185,129,0.3)'
                          }}>
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                </table>
              </div>
            </div>
          )}

          {/* MENU 8: E-EXTENSION SECURITY CONTROLS & MONITORING */}
          {activeTab === 'EXTENSION_SECURITY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Security Policy Settings Card */}
              <div style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#f3f4f6' }}>🔒 E-Extension Security Policies & Controls</h3>
                <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
                  Configure mandatory extension enforcement, disconnect lock rules, and cheating prevention tolerances.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3f4f6' }}>Require E-Extension</div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Block exam start if E-Extension is inactive</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={extSettings.requireExtension}
                      onChange={(e) => {
                        const updated = { ...extSettings, requireExtension: e.target.checked };
                        setExtSettings(updated);
                        api('/api/extension/security-settings', { method: 'POST', body: JSON.stringify(updated) });
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3f4f6' }}>Lock Exam on Disconnect</div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Immediately pause test on heartbeat loss</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={extSettings.lockOnDisconnect}
                      onChange={(e) => {
                        const updated = { ...extSettings, lockOnDisconnect: e.target.checked };
                        setExtSettings(updated);
                        api('/api/extension/security-settings', { method: 'POST', body: JSON.stringify(updated) });
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3f4f6' }}>Allow Exam Resume</div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Permit student to resume after re-verifying</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={extSettings.allowExamResume}
                      onChange={(e) => {
                        const updated = { ...extSettings, allowExamResume: e.target.checked };
                        setExtSettings(updated);
                        api('/api/extension/security-settings', { method: 'POST', body: JSON.stringify(updated) });
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              {/* Real-time E-Extension Security Event Audit Trail */}
              <div style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f3f4f6' }}>🛡️ Extension Security Disconnect & Violation Audit Logs</h3>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Real-time backend record of session heartbeats, extension disconnects, and lock events</div>
                  </div>
                  <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '0.35rem 0.8rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                    Total Events: {extSecurityLogs.length}
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Event Type</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Student Details</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Exam</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Security Event Log</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extSecurityLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontFamily: 'monospace' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: log.type === 'EXTENSION_VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : log.type === 'EXTENSION_DISCONNECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: log.type === 'EXTENSION_VERIFIED' ? '#34d399' : log.type === 'EXTENSION_DISCONNECTED' ? '#f87171' : '#fbbf24'
                            }}>
                              {log.type}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#f3f4f6', fontWeight: 600 }}>{log.studentName}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>{log.examTitle}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* CONFIRM PUBLISH DIALOG */}
      {publishTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 100 }}>
          <div style={{ background: '#111827', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '2rem', maxWidth: '520px', width: '90%' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#f3f4f6' }}>Confirm Publication Approval</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Are you sure you want to approve and publish <strong style={{ color: '#fff' }}>"{publishTarget.title}"</strong>?
              <br />
              Students will immediately see this test on their dashboard.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPublishTarget(null)}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAndPublish}
                disabled={isPublishing}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                {isPublishing ? 'Publishing...' : 'Yes, Approve & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW DETAILS MODAL */}
      {selectedExam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', zIndex: 90, padding: '2rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', maxWidth: '850px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f3f4f6' }}>Review Paper: {selectedExam.title}</h3>
              <button onClick={() => setSelectedExam(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
              <h4 style={{ color: '#818cf8', margin: '0 0 1rem 0' }}>MCQ Questions ({selectedExam.mcqQuestions?.length || 0})</h4>
              {selectedExam.mcqQuestions?.map((q: any, idx: number) => (
                <div key={q.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Q{idx + 1}. {q.text} ({q.marks} Marks)</div>
                </div>
              ))}

              <h4 style={{ color: '#c084fc', margin: '1.5rem 0 1rem 0' }}>Coding Questions ({selectedExam.codingQuestions?.length || 0})</h4>
              {selectedExam.codingQuestions?.map((q: any, idx: number) => (
                <div key={q.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Task #{idx + 1}: {q.title} ({q.marks} Marks)</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>
              <button onClick={() => setSelectedExam(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
