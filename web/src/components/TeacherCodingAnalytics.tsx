import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { BarChart3, Clock, Cpu, Code2, ArrowLeft, CheckCircle2 } from 'lucide-react';

type AnalyticsRow = {
  questionId: string;
  title: string;
  averageScore: number;
  passPercentage: number;
  averageExecutionTimeMs: number;
  averageMemoryKb: number;
  mostCommonLanguage: string;
  submissionCount: number;
};

export function TeacherCodingAnalytics({ examId: examIdProp }: { examId: string }) {
  const params = useParams();
  const navigate = useNavigate();
  const examId = examIdProp || params.examId || 'demo';
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(examId !== 'demo');

  useEffect(() => {
    if (examId === 'demo') return;
    setLoading(true);
    api<{ analytics: AnalyticsRow[] }>(`/api/exams/${examId}/coding-analytics`)
      .then((d) => setRows(d.analytics || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [examId]);

  if (examId === 'demo') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <BarChart3 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Coding Analytics Preview</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              To view real-time coding telemetry, execution metrics, and language statistics, select a published exam with coding questions from your Question Papers list.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/teacher/exams')}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Question Papers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Coding Assessment Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Execution time, memory efficiency, pass rates, and submission breakdowns
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/teacher/exams')}
          className="self-start sm:self-auto flex items-center gap-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exams
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problem Telemetry & Execution Summary</CardTitle>
          <CardDescription>Aggregate metrics collected from student code runner executions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
              <p>Loading coding analytics...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No submissions recorded yet for this coding assessment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75">
                    <TableHead className="font-semibold text-slate-700">Coding Question</TableHead>
                    <TableHead className="font-semibold text-slate-700">Avg Score</TableHead>
                    <TableHead className="font-semibold text-slate-700">Pass Rate</TableHead>
                    <TableHead className="font-semibold text-slate-700">Avg Execution Time</TableHead>
                    <TableHead className="font-semibold text-slate-700">Avg Memory</TableHead>
                    <TableHead className="font-semibold text-slate-700">Dominant Language</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Submissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.questionId} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-violet-600 shrink-0" />
                          <span>{r.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-slate-800">{r.averageScore}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.passPercentage >= 70 ? 'success' : r.passPercentage >= 40 ? 'warning' : 'destructive'}
                        >
                          {r.passPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs font-mono">
                        {r.averageExecutionTimeMs} ms
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs font-mono">
                        {r.averageMemoryKb} KB
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs uppercase bg-slate-100 text-slate-700">
                          {r.mostCommonLanguage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {r.submissionCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
