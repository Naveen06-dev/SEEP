import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Eye, EyeOff, RefreshCw, ChevronRight, X, CheckCircle, XCircle, Clock } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'results' | 'retests'>('results');

  useEffect(() => { loadResults(); }, []);

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
      alert('Test attempt reset successfully! The student can now re-attempt the exam.');
      loadResults();
    } catch (err: any) {
      alert(err.message || 'Failed to reset test attempt');
    }
  };

  const handleToggleVisibility = async (attemptId: string, currentVisible: boolean) => {
    try {
      const endpoint = currentVisible
        ? `/api/teacher/results/${attemptId}/hide`
        : `/api/teacher/results/${attemptId}/publish`;
      await api(endpoint, { method: 'PUT' });
      setResults((prev) =>
        prev.map((item) => (item.id === attemptId ? { ...item, resultVisible: !currentVisible } : item))
      );
      if (selectedAttempt?.id === attemptId) {
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

  const pendingRetests = retestRequests.filter(r => r.adminApproved && !r.teacherReset);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Results & Evaluations</h1>
          <p className="text-slate-400 text-sm mt-1">
            Review submissions, publish results, and manage retest approvals.
          </p>
        </div>
        <Button variant="outline" onClick={loadResults}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Submissions', value: results.length },
          { label: 'Published Results', value: results.filter(r => r.resultVisible).length },
          { label: 'Submitted', value: results.filter(r => r.status === 'SUBMITTED').length },
          { label: 'Retest Requests', value: pendingRetests.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="text-2xl font-bold text-slate-900">{loading ? '—' : stat.value}</div>
              <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border flex gap-1">
        {[
          { key: 'results', label: `Results (${results.length})` },
          { key: 'retests', label: `Retest Requests (${pendingRetests.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-900 hover:border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results Table */}
      {activeTab === 'results' && (
        <Card>
          {loading ? (
            <div className="text-center py-16 text-slate-400 animate-pulse">Loading results...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Reg No</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>MCQ</TableHead>
                  <TableHead>Coding</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-400 py-12">
                      No results available yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-slate-900">{r.studentName}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-emerald-500">{r.regNo}</span>
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-[200px] truncate">{r.examTitle}</TableCell>
                      <TableCell className="text-slate-600">{r.mcqScore ?? '—'}</TableCell>
                      <TableCell className="text-slate-600">{r.codingScore ?? '—'}</TableCell>
                      <TableCell>
                        <span className="font-bold text-slate-900">{r.totalScore ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        {r.status === 'SUBMITTED' ? (
                          <Badge variant="success">Submitted</Badge>
                        ) : r.status === 'MALPRACTICE' ? (
                          <Badge variant="destructive">Terminated</Badge>
                        ) : (
                          <Badge variant="outline">In Progress</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.resultVisible ? (
                          <Badge variant="info" className="bg-info/10 text-info border-info/20">Published</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400">Hidden</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={r.resultVisible ? 'Hide Result' : 'Publish Result'}
                            onClick={() => handleToggleVisibility(r.id, r.resultVisible)}
                          >
                            {r.resultVisible ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View Details"
                            onClick={() => openAttemptDetails(r.id)}
                          >
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Retest Requests */}
      {activeTab === 'retests' && (
        <div className="space-y-3">
          {pendingRetests.length === 0 ? (
            <div className="text-center py-16 bg-surface rounded-xl border border-border">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900">No Pending Retest Requests</h3>
              <p className="text-slate-400 text-sm mt-1">All retest requests have been processed.</p>
            </div>
          ) : (
            pendingRetests.map((req: any) => (
              <Card key={req.id} className="border-l-4 border-l-warning">
                <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900">{req.studentName}</h3>
                      <span className="text-xs font-mono text-slate-400">{req.regNo}</span>
                      <Badge variant="warning" className="text-xs">Admin Approved</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">Exam: {req.examTitle || req.examId}</p>
                    <div className="bg-slate-50 border border-border rounded-md p-3 text-sm text-slate-600">
                      <span className="font-medium text-slate-900 block mb-1">Reason:</span>
                      {req.reason}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleResetTestByTeacher(req.id)}>
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    Reset Attempt
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Attempt Detail Drawer/Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-surface border-b border-border z-10">
              <div>
                <CardTitle>Submission Details</CardTitle>
                <CardDescription>{selectedAttempt.exam?.title || selectedAttempt.examTitle}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAttempt(null)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Candidate Info */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Student Name', value: selectedAttempt.studentName },
                  { label: 'Register No', value: selectedAttempt.regNo },
                  { label: 'MCQ Score', value: selectedAttempt.mcqScore ?? '—' },
                  { label: 'Coding Score', value: selectedAttempt.codingScore ?? '—' },
                  { label: 'Total Score', value: selectedAttempt.totalScore ?? '—' },
                  { label: 'Status', value: selectedAttempt.status },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 border border-border rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.label}</div>
                    <div className="text-sm font-semibold text-slate-900">{String(item.value)}</div>
                  </div>
                ))}
              </div>

              {/* Question Breakdown */}
              {selectedAttempt.questionBreakdown?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Question Breakdown</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAttempt.questionBreakdown.map((q: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-slate-900">Q{idx + 1}</TableCell>
                          <TableCell className="text-slate-600">{q.score ?? '—'}</TableCell>
                          <TableCell>
                            {q.passed ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <Button
                  variant={selectedAttempt.resultVisible ? 'outline' : 'default'}
                  onClick={() => handleToggleVisibility(selectedAttempt.id, selectedAttempt.resultVisible)}
                >
                  {selectedAttempt.resultVisible ? (
                    <><EyeOff className="h-4 w-4 mr-2" />Hide from Student</>
                  ) : (
                    <><Eye className="h-4 w-4 mr-2" />Publish to Student</>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setSelectedAttempt(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
