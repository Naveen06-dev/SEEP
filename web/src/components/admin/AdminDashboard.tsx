import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Users, BookOpen, TrendingUp, CheckCircle, RefreshCw, Building2, GraduationCap, ClipboardList, BarChart3, Inbox, ShieldAlert, AlertTriangle } from 'lucide-react';

type TabType = 'DEPARTMENTS' | 'TEACHERS' | 'STUDENTS' | 'APPROVALS' | 'RESULTS' | 'RETEST_REQUESTS' | 'AUDIT_LOGS' | 'EXTENSION_SECURITY';

const VALID_TABS: TabType[] = ['DEPARTMENTS', 'TEACHERS', 'STUDENTS', 'APPROVALS', 'RESULTS', 'RETEST_REQUESTS', 'AUDIT_LOGS', 'EXTENSION_SECURITY'];

const PIE_COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6'];

export function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = (searchParams.get('tab') as TabType) || 'DEPARTMENTS';
  const activeTab: TabType = VALID_TABS.includes(urlTab) ? urlTab : 'DEPARTMENTS';

  const setActiveTab = (tab: TabType) => setSearchParams({ tab });

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [retestRequests, setRetestRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [extSecurityLogs, setExtSecurityLogs] = useState<any[]>([]);

  const [selectedDeptTeacher, setSelectedDeptTeacher] = useState<string>('ALL');
  const [selectedDeptStudent, setSelectedDeptStudent] = useState<string>('ALL');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>('ALL');

  const [publishTarget, setPublishTarget] = useState<any | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => { loadAllAdminData(); }, []);

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
      if (extAudit?.logs) setExtSecurityLogs(extAudit.logs);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

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
      alert(`Exam "${exam.title}" stopped sharing.`);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to stop sharing exam');
    }
  };

  const handleApproveRetest = async (reqId: string) => {
    try {
      await api(`/api/attempts/retest-requests/${reqId}/approve-admin`, { method: 'POST' });
      alert('Retest request APPROVED by Admin!');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve retest request');
    }
  };

  const handleRejectRetest = async (reqId: string) => {
    try {
      await api(`/api/admin/retest-requests/${reqId}/reject`, { method: 'POST' });
      alert('Retest request REJECTED by Admin.');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject retest request');
    }
  };

  const filteredTeachers = selectedDeptTeacher === 'ALL' ? teachers : teachers.filter(t => t.department === selectedDeptTeacher);
  const filteredStudents = selectedDeptStudent === 'ALL' ? students : students.filter(s => s.department === selectedDeptStudent);
  const filteredAuditLogs = auditSeverityFilter === 'ALL' ? auditLogs : auditLogs.filter(l => l.severity === auditSeverityFilter);
  const pendingApprovalExams = exams.filter(e => e.status !== 'ACTIVE' && e.status !== 'PUBLISHED');

  // Analytics mock/derived data
  const scoreTrendData = [
    { month: 'Apr', avg: 68 }, { month: 'May', avg: 72 }, { month: 'Jun', avg: 75 },
    { month: 'Jul', avg: 70 }, { month: 'Aug', avg: 78 }, { month: 'Sep', avg: 82 },
  ];
  const passFailData = [
    { name: 'Passed', value: studentResults.filter(r => r.passed).length || 62 },
    { name: 'Failed', value: studentResults.filter(r => !r.passed).length || 18 },
  ];
  const difficultyData = [
    { name: 'Easy', count: 24 }, { name: 'Medium', count: 38 }, { name: 'Hard', count: 15 },
  ];

  const navTabs = [
    { key: 'DEPARTMENTS', label: 'Departments', icon: Building2 },
    { key: 'TEACHERS', label: 'Teachers', icon: Users },
    { key: 'STUDENTS', label: 'Students', icon: GraduationCap },
    { key: 'APPROVALS', label: `Approvals (${pendingApprovalExams.length})`, icon: ClipboardList },
    { key: 'RESULTS', label: 'Results', icon: BarChart3 },
    { key: 'RETEST_REQUESTS', label: `Retests (${retestRequests.length})`, icon: Inbox },
    { key: 'AUDIT_LOGS', label: 'Audit Logs', icon: ShieldAlert },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Command Center</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Manage departments, faculty, students, exams, results, and security.
          </p>
        </div>
        <Button variant="outline" onClick={loadAllAdminData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: students.length, icon: GraduationCap, trend: '+12 this month', color: 'text-primary' },
          { label: 'Faculty Members', value: teachers.length, icon: Users, trend: 'Across all depts', color: 'text-secondary' },
          { label: 'Pending Approvals', value: pendingApprovalExams.length, icon: ClipboardList, trend: 'Exams awaiting publish', color: 'text-amber-500' },
          { label: 'Retest Requests', value: retestRequests.length, icon: Inbox, trend: 'Awaiting admin review', color: 'text-rose-500' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="text-3xl font-bold text-slate-900">{loading ? '—' : kpi.value}</div>
              <div className="text-xs text-slate-400">{kpi.trend}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Average Score Trend</CardTitle>
            <CardDescription>Platform-wide candidate performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[60, 90]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="avg" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pass vs Fail</CardTitle>
            <CardDescription>Overall exam outcome distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={passFailData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {passFailData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border flex gap-1 overflow-x-auto">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-900 hover:border-border'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">Loading data...</div>
      ) : (
        <div className="space-y-4">

          {/* DEPARTMENTS TAB */}
          {activeTab === 'DEPARTMENTS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {departments.map((dept) => (
                  <Card key={dept.id}>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-center mb-3">
                        <Building2 className="h-6 w-6 text-primary" />
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-400/20">{dept.code}</Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-3">{dept.name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>Teachers: <span className="font-bold text-slate-900">{dept.teacherCount}</span></div>
                        <div>Students: <span className="font-bold text-slate-900">{dept.studentCount}</span></div>
                        <div>Exams: <span className="font-bold text-slate-900">{dept.activeExams}</span></div>
                        <div>Attempts: <span className="font-bold text-slate-900">{dept.totalAttempts}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {departments.length === 0 && (
                  <div className="col-span-4 text-center py-10 text-slate-400">No departments found.</div>
                )}
              </div>
              <Card>
                <div className="p-4 border-b border-border font-semibold text-slate-900 text-sm">Department Summary</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Published Exams</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium text-slate-900">{d.name}</TableCell>
                        <TableCell><Badge variant="outline">{d.code}</Badge></TableCell>
                        <TableCell className="text-slate-600">{d.teacherCount}</TableCell>
                        <TableCell className="text-slate-600">{d.studentCount}</TableCell>
                        <TableCell><span className="font-semibold text-primary">{d.activeExams}</span></TableCell>
                      </TableRow>
                    ))}
                    {departments.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No data available.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* TEACHERS TAB */}
          {activeTab === 'TEACHERS' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Faculty Roster</h2>
                <select
                  value={selectedDeptTeacher}
                  onChange={(e) => setSelectedDeptTeacher(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher Name</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Exams Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-slate-900">{t.name}</TableCell>
                        <TableCell><span className="font-mono text-primary text-xs">{t.employeeId}</span></TableCell>
                        <TableCell className="text-slate-600">{t.department}</TableCell>
                        <TableCell className="text-slate-600">{t.subject}</TableCell>
                        <TableCell><Badge variant="outline">{t.examCount} Papers</Badge></TableCell>
                      </TableRow>
                    ))}
                    {filteredTeachers.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No teachers found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'STUDENTS' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Enrolled Student Directory</h2>
                <select
                  value={selectedDeptStudent}
                  onChange={(e) => setSelectedDeptStudent(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Register No</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Attempts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                        <TableCell><span className="font-mono text-emerald-500 text-xs font-bold">{s.regNo}</span></TableCell>
                        <TableCell className="text-slate-600 text-sm">{s.email}</TableCell>
                        <TableCell className="text-slate-600">{s.department}</TableCell>
                        <TableCell><Badge variant="outline">{s.attemptsCount} Attempts</Badge></TableCell>
                      </TableRow>
                    ))}
                    {filteredStudents.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No students found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* APPROVALS TAB */}
          {activeTab === 'APPROVALS' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Test Approvals</h2>
                <p className="text-slate-400 text-sm mt-1">Review and publish exams created by instructors.</p>
              </div>
              {pendingApprovalExams.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-border">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900">All Exams Reviewed</h3>
                  <p className="text-slate-400 text-sm mt-1">No pending exam approvals at this time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovalExams.map((exam) => (
                    <Card key={exam.id}>
                      <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900">{exam.title}</h3>
                            <Badge variant="warning" className="text-xs">Pending</Badge>
                          </div>
                          <p className="text-sm text-slate-400">{exam.subject} · {exam.durationMinutes} mins · {exam.mcqCount} MCQ · {exam.codingCount} Coding</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => handleUnpublishExam(exam)}>Stop Sharing</Button>
                          <Button size="sm" onClick={() => setPublishTarget(exam)}>
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            Approve & Publish
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {/* Also show published exams */}
              {exams.filter(e => e.status === 'ACTIVE' || e.status === 'PUBLISHED').length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="font-semibold text-slate-600 text-sm uppercase tracking-wider">Live Assessments</h3>
                  {exams.filter(e => e.status === 'ACTIVE' || e.status === 'PUBLISHED').map((exam) => (
                    <Card key={exam.id}>
                      <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900">{exam.title}</h3>
                            <Badge variant="success" className="text-xs">Live</Badge>
                          </div>
                          <p className="text-sm text-slate-400">{exam.subject} · {exam.durationMinutes} mins</p>
                        </div>
                        <Button variant="outline" size="sm" className="text-rose-500 border-rose-400/30 hover:bg-rose-50" onClick={() => handleUnpublishExam(exam)}>
                          Stop Sharing
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RESULTS TAB */}
          {activeTab === 'RESULTS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Question Difficulty Distribution</CardTitle>
                    <CardDescription>Breakdown across assessment types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={difficultyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                          <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Pass / Fail Breakdown</CardTitle>
                    <CardDescription>Aggregated across all assessments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56 flex items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={passFailData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                            {passFailData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                          <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <div className="p-4 border-b border-border font-semibold text-slate-900 text-sm">Student Results</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentResults.slice(0, 20).map((r: any, idx) => (
                      <TableRow key={r.id || idx}>
                        <TableCell className="font-medium text-slate-900">{r.studentName || r.student?.name || 'Student'}</TableCell>
                        <TableCell className="text-slate-600">{r.examTitle || r.exam?.title || '—'}</TableCell>
                        <TableCell><span className="font-bold text-slate-900">{r.totalScore ?? '—'}</span></TableCell>
                        <TableCell>
                          {r.status === 'SUBMITTED' ? <Badge variant="success">Passed</Badge>
                            : r.status === 'MALPRACTICE' ? <Badge variant="destructive">Terminated</Badge>
                            : <Badge variant="secondary">Pending</Badge>}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {studentResults.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No results available.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* RETEST REQUESTS TAB */}
          {activeTab === 'RETEST_REQUESTS' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Retest Requests</h2>
                <p className="text-slate-400 text-sm mt-1">Review retest requests submitted by candidates flagged for malpractice.</p>
              </div>
              {retestRequests.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-border">
                  <Inbox className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900">No Retest Requests</h3>
                  <p className="text-slate-400 text-sm mt-1">All retest requests have been resolved.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {retestRequests.map((req: any) => (
                    <Card key={req.id} className="border-l-4 border-l-warning">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-900">{req.studentName}</h3>
                              <span className="text-xs font-mono text-slate-400">{req.regNo}</span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">Exam: {req.examTitle || req.examId}</p>
                            <div className="bg-slate-50 border border-border rounded-md p-3 text-sm text-slate-600">
                              <span className="font-medium text-slate-900 block mb-1">Reason:</span>
                              {req.reason}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button variant="outline" size="sm" className="text-rose-500 border-rose-400/30 hover:bg-rose-50" onClick={() => handleRejectRetest(req.id)}>
                              Reject
                            </Button>
                            <Button size="sm" onClick={() => handleApproveRetest(req.id)}>
                              <CheckCircle className="h-4 w-4 mr-1.5" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'AUDIT_LOGS' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Security Audit Logs</h2>
                  <p className="text-slate-400 text-sm mt-1">All proctoring events and system security logs.</p>
                </div>
                <select
                  value={auditSeverityFilter}
                  onChange={(e) => setAuditSeverityFilter(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">All Severities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.slice(0, 20).map((log: any, idx) => (
                      <TableRow key={log.id || idx}>
                        <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{log.studentName || '—'}</TableCell>
                        <TableCell className="text-slate-600">{log.type || log.event || '—'}</TableCell>
                        <TableCell>
                          {log.severity === 'HIGH' ? <Badge variant="destructive">High</Badge>
                            : log.severity === 'MEDIUM' ? <Badge variant="warning">Medium</Badge>
                            : <Badge variant="outline">Low</Badge>}
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs max-w-xs truncate">{log.details || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {filteredAuditLogs.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No audit logs found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {publishTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-2xl">
            <CardHeader>
              <CardTitle>Approve & Publish Assessment?</CardTitle>
              <CardDescription>This will make the exam available to all enrolled candidates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 border border-border rounded-lg p-4">
                <p className="font-semibold text-slate-900">{publishTarget.title}</p>
                <p className="text-sm text-slate-400 mt-1">{publishTarget.subject} · {publishTarget.durationMinutes} mins</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setPublishTarget(null)}>Cancel</Button>
                <Button onClick={handleApproveAndPublish} disabled={isPublishing}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
