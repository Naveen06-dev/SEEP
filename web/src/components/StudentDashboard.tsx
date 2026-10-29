import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Code2, FileText, Clock, Calendar as CalendarIcon, TrendingUp, Target, Award, PlayCircle, AlertCircle, ShieldAlert, BookOpen, CheckCircle, XCircle, X, RefreshCw, Eye, AlertTriangle } from 'lucide-react';

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
  const [retestRequests, setRetestRequests] = useState<any[]>([]);
  const [selectedAttemptDetails, setSelectedAttemptDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [retestReason, setRetestReason] = useState('');
  const [submittingRetest, setSubmittingRetest] = useState(false);
  const [retestSuccessMsg, setRetestSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'available';

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
      const sid = studentUser ? JSON.parse(studentUser).id : 'student-1';
      const [attempts, retests] = await Promise.all([
        api<any[]>(`/api/attempts?studentId=${sid}`).catch(() => []),
        api<any[]>(`/api/attempts/retest-requests/student/${sid}`).catch(() => [])
      ]);
      setMyAttempts(Array.isArray(attempts) ? attempts : []);
      setRetestRequests(Array.isArray(retests) ? retests : []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const openAttemptResult = async (attemptId: string) => {
    try {
      setLoadingDetails(true);
      const details = await api<any>(`/api/attempts/${attemptId}/result`);
      setSelectedAttemptDetails(details);
      setRetestSuccessMsg('');
      setRetestReason('');
    } catch (err) {
      alert('Failed to load attempt details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRetestSubmit = async (examId: string) => {
    if (!retestReason.trim()) return;
    try {
      setSubmittingRetest(true);
      const studentUser = localStorage.getItem('seep_user');
      const u = studentUser ? JSON.parse(studentUser) : {};
      await api('/api/attempts/retest-request', {
        method: 'POST',
        body: JSON.stringify({
          examId,
          studentId: u.id || 'student-1',
          studentName: `${u.firstName || 'Student'} ${u.lastName || ''}`.trim(),
          regNo: u.regNo || 'CS2026001',
          reason: retestReason
        })
      });
      setRetestSuccessMsg('Retest appeal submitted successfully to Admin & Teacher!');
      setRetestReason('');
      loadData();
    } catch (err) {
      alert('Failed to submit retest request');
    } finally {
      setSubmittingRetest(false);
    }
  };

  const handleStartExam = (examId: string) => {
    const isVerified = localStorage.getItem(`seep_ext_verified_${examId}`) === 'true' || localStorage.getItem('seep_ext_verified_any') === 'true';
    if (isVerified) {
      window.open(`/student/exam/${examId}?step=step5_countdown`, '_blank');
    } else {
      window.open(`/student/exam/${examId}?step=step3_chrome_store`, '_blank');
    }
  };

  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || user?.email?.split('@')[0] || 'Student';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const fetchedExams = exams.filter((e) => ['ACTIVE', 'PUBLISHED'].includes(e.status));
  const hasDefaultExam = fetchedExams.some((e) => e.id === DEFAULT_MANUAL_EXAM.id);
  const availableExams = hasDefaultExam ? fetchedExams : [DEFAULT_MANUAL_EXAM, ...fetchedExams];

  // Mock data for analytics
  const performanceData = [
    { name: 'Week 1', score: 65 },
    { name: 'Week 2', score: 72 },
    { name: 'Week 3', score: 68 },
    { name: 'Week 4', score: 85 },
    { name: 'Week 5', score: 82 },
    { name: 'Week 6', score: 90 },
  ];

  const skillData = [
    { subject: 'Algorithms', score: 85 },
    { subject: 'Data Structs', score: 72 },
    { subject: 'JavaScript', score: 90 },
    { subject: 'React', score: 65 },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {greeting}, {userName.split(' ')[0]}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Here's your assessment overview and upcoming activities.
          </p>
        </div>
        <Button onClick={() => navigate('/student/dashboard?tab=my-exams')}>
          View Assessments
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="flex justify-between items-center text-slate-400 mb-2">
              <span className="text-sm font-semibold tracking-wide">UPCOMING EXAMS</span>
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{loading ? '-' : availableExams.length}</div>
            <div className="text-xs font-medium text-emerald-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Next exam in 2 days</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="flex justify-between items-center text-slate-400 mb-2">
              <span className="text-sm font-semibold tracking-wide">COMPLETED</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{loading ? '-' : myAttempts.length}</div>
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <span>All time submissions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="flex justify-between items-center text-slate-400 mb-2">
              <span className="text-sm font-semibold tracking-wide">AVERAGE SCORE</span>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold text-slate-900">82%</div>
            <div className="text-xs font-medium text-emerald-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>+4.2% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="flex justify-between items-center text-slate-400 mb-2">
              <span className="text-sm font-semibold tracking-wide">SUCCESS RATE</span>
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold text-slate-900">94%</div>
            <div className="text-xs font-medium text-emerald-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Top 10% of candidates</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Your assessment scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill Distribution</CardTitle>
            <CardDescription>Your proficiency across core topics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis dataKey="subject" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontSize: 12, fontWeight: 500}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="score" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAvailableExams = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Upcoming Assessments</h2>
          <p className="text-slate-400 mt-1 text-sm">Assessments scheduled and ready to start.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">Loading assessments...</div>
      ) : availableExams.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-xl border border-border">
          <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Upcoming Assessments</h3>
          <p className="text-slate-400 text-sm">You have no assessments scheduled at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableExams.map((exam, idx) => (
            <Card key={exam.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {exam.subject}
                  </Badge>
                  <Badge variant={exam.status === 'ACTIVE' ? 'success' : 'default'} className="text-[10px] uppercase">
                    {exam.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight">{exam.title}</CardTitle>
                <CardDescription className="mt-2 line-clamp-2">
                  Official examination covering core topics. Make sure you have a stable connection.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4 pt-0">
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-md">
                    <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    {exam.durationMinutes} mins
                  </div>
                  {exam.codingCount > 0 && (
                    <div className="flex items-center text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-md">
                      <Code2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                      {exam.codingCount} Coding
                    </div>
                  )}
                  {exam.mcqCount > 0 && (
                    <div className="flex items-center text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-md">
                      <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                      {exam.mcqCount} MCQs
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="p-6 pt-0 mt-auto">
                <Button className="w-full" onClick={() => handleStartExam(exam.id)}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Assessment
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Assessment History & Results</h2>
        <p className="text-slate-400 mt-1 text-sm">Review your completed submissions, scores, and proctoring reports.</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assessment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myAttempts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              myAttempts.map((att) => {
                const isMal = att.status === 'MALPRACTICE' || att.malpractice;
                return (
                  <TableRow key={att.id}>
                    <TableCell className="font-medium text-slate-900">
                      <div>{att.exam?.title || att.examTitle || 'Examination'}</div>
                      <div className="text-xs text-slate-400">{att.exam?.subject || 'Assessment'}</div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'In Progress'}
                    </TableCell>
                    <TableCell>
                      {att.status === 'SUBMITTED' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : isMal ? (
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="destructive">Terminated</Badge>
                          {att.malpracticeType && (
                            <span className="text-[11px] font-mono text-rose-500 font-medium">
                              {att.malpracticeType}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="warning">In Progress</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${isMal ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {att.totalScore ?? 0} pts
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAttemptResult(att.id)}
                        className="hover:bg-primary/5 hover:text-primary"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View Result
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold text-slate-900">Security Center</h2>
        <p className="text-slate-400 mt-1 text-sm">Review proctoring integrity status and requirements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <ShieldAlert className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Extension Monitor</CardTitle>
            <CardDescription>NeoExamShield Status</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-lg font-bold text-emerald-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
             </div>
             <p className="text-sm text-slate-400 mt-2">Browser controls and monitoring are functioning correctly.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardHeader>
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <CardTitle>Incognito Check</CardTitle>
            <CardDescription>Session restriction</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-lg font-bold text-emerald-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verified
             </div>
             <p className="text-sm text-slate-400 mt-2">Incognito mode is strictly prohibited during test sessions.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-secondary">
          <CardHeader>
            <Target className="h-8 w-8 text-secondary mb-2" />
            <CardTitle>AI Malpractice logs</CardTitle>
            <CardDescription>Real-time Telemetry</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Monitoring
             </div>
             <p className="text-sm text-slate-400 mt-2">Tab switching and hotkeys are logged automatically.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="w-full p-6 max-w-screen-xl mx-auto">
      {activeTab === 'available' && renderDashboard()}
      {activeTab === 'my-exams' && renderAvailableExams()}
      {activeTab === 'results' && renderResults()}
      {activeTab === 'security' && renderSecurity()}

      {/* Result Details Inspection Modal for Student */}
      {selectedAttemptDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-border">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-surface border-b border-border z-10 p-5">
              <div>
                <CardTitle className="text-xl">
                  {selectedAttemptDetails.examTitle || 'Assessment Result'}
                </CardTitle>
                <CardDescription>
                  {selectedAttemptDetails.subject} &bull; Reg No: {selectedAttemptDetails.regNo}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAttemptDetails(null)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Malpractice Notice */}
              {selectedAttemptDetails.malpractice || selectedAttemptDetails.status === 'MALPRACTICE' ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-base text-rose-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Assessment Terminated: Malpractice Detected</span>
                  </div>
                  <div className="text-sm text-rose-800">
                    <strong>Violation Reason:</strong> {selectedAttemptDetails.malpracticeType || 'Proctoring Security Policy Violation'}
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed m-0">
                    This attempt was locked by the proctoring engine. The incident report and your earned marks have been submitted to your Course Teacher and Institution Administrator.
                  </p>

                  {/* Retest Status or Action */}
                  <div className="pt-2 border-t border-rose-200/80">
                    {(() => {
                      const matchedRetest = retestRequests.find(r => r.examId === selectedAttemptDetails.examId);
                      if (matchedRetest) {
                        if (matchedRetest.status === 'RESET_BY_TEACHER') {
                          return (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold">✓ Test reset by teacher! You can retake this assessment now.</span>
                              <Button size="sm" onClick={() => handleStartExam(selectedAttemptDetails.examId)}>
                                Retake Exam
                              </Button>
                            </div>
                          );
                        } else if (matchedRetest.status === 'APPROVED_BY_ADMIN') {
                          return (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs font-semibold">
                              ⏳ Retest approved by Admin! Waiting for Course Teacher to reset test attempt.
                            </div>
                          );
                        } else {
                          return (
                            <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-slate-700 text-xs font-semibold">
                              ⏳ Retest appeal submitted. Pending Administrator review.
                            </div>
                          );
                        }
                      }

                      if (retestSuccessMsg) {
                        return (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 text-xs font-semibold">
                            ✓ {retestSuccessMsg}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 mt-2">
                          <div className="text-xs font-bold text-slate-800">Appeal & Retest Request:</div>
                          <textarea
                            value={retestReason}
                            onChange={(e) => setRetestReason(e.target.value)}
                            placeholder="Explain the incident (e.g. accidental keypress, external browser popup, hardware issue)..."
                            rows={2}
                            className="w-full text-xs p-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                          />
                          <Button
                            size="sm"
                            disabled={submittingRetest || !retestReason.trim()}
                            onClick={() => handleRetestSubmit(selectedAttemptDetails.examId)}
                          >
                            {submittingRetest ? 'Submitting...' : 'Submit Retest Appeal to Admin & Teacher'}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Assessment submitted successfully. Score and questions breakdown delivered to your Teacher & Administrator.</span>
                </div>
              )}

              {/* Scorecard Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-border rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase">Total Score</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {selectedAttemptDetails.totalScore ?? 0}
                    <span className="text-xs font-medium text-slate-400"> / {selectedAttemptDetails.totalMarks ?? 20}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-border rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase">Accuracy</div>
                  <div className="text-2xl font-black text-primary mt-1">
                    {selectedAttemptDetails.percentage ?? 0}%
                  </div>
                </div>
                <div className="bg-slate-50 border border-border rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase">MCQ Score</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {selectedAttemptDetails.mcqScore ?? 0}
                    <span className="text-xs font-medium text-slate-400"> / {selectedAttemptDetails.maxMcqMarks ?? 5}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-border rounded-lg p-3 text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase">Coding Score</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {selectedAttemptDetails.codingScore ?? 0}
                    <span className="text-xs font-medium text-slate-400"> / {selectedAttemptDetails.maxCodingMarks ?? 15}</span>
                  </div>
                </div>
              </div>

              {/* MCQ Question Breakdown */}
              {selectedAttemptDetails.questionBreakdown && selectedAttemptDetails.questionBreakdown.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2.5">Multiple Choice Questions</h4>
                  <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                    {selectedAttemptDetails.questionBreakdown.map((q: any, idx: number) => (
                      <div key={idx} className="p-3 text-sm bg-white hover:bg-slate-50 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 mb-1">
                            Q{q.sequence || idx + 1}: {q.question}
                          </div>
                          <div className="text-xs text-slate-500">
                            Your Answer:{' '}
                            <span className={q.passed ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-500'}>
                              {q.selectedAnswer || 'Not Answered'}
                            </span>
                          </div>
                          {!q.passed && q.correctAnswer && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Correct: <span className="font-semibold text-slate-700">{q.correctAnswer}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant={q.passed ? 'success' : 'destructive'} className="text-[10px]">
                            {q.score ?? 0} / {q.marks ?? 1} pts
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coding Breakdown */}
              {selectedAttemptDetails.codingBreakdown && selectedAttemptDetails.codingBreakdown.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2.5">Coding Challenges</h4>
                  <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                    {selectedAttemptDetails.codingBreakdown.map((c: any, idx: number) => (
                      <div key={idx} className="p-3 text-sm bg-white flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{c.title}</div>
                          <div className="text-xs text-slate-400">
                            Status: <span className="font-mono text-slate-600">{c.status}</span> &bull; Passed Cases: {c.passedCases}/{c.totalCases}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-sm">{c.score}</span>
                          <span className="text-xs text-slate-400"> / {c.maxMarks} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-border">
                <Button variant="outline" onClick={() => setSelectedAttemptDetails(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
