import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { 
  FileText, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  Clock, 
  X, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Code2
} from 'lucide-react';

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
  const navigate = useNavigate();
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            Question Papers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage, edit, review, and monitor created examination papers and question banks
          </p>
        </div>
        <Button 
          onClick={() => navigate('/teacher/exams/new')} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Question Paper
        </Button>
      </div>

      {/* Main Content */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
            <p className="text-sm text-slate-500">Loading question papers...</p>
          </CardContent>
        </Card>
      ) : exams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">No question papers created yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
              Start building your first examination with dynamic MCQ and coding question sets.
            </p>
            <Button 
              onClick={() => navigate('/teacher/exams/new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-sm border border-slate-200/80">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                  <TableHead className="font-semibold text-slate-700">Exam Title</TableHead>
                  <TableHead className="font-semibold text-slate-700">Subject & Dept</TableHead>
                  <TableHead className="font-semibold text-slate-700">Duration</TableHead>
                  <TableHead className="font-semibold text-slate-700">Questions Breakdown</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Created Date</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => {
                  const isPublished = exam.status === 'PUBLISHED' || exam.status === 'ACTIVE';
                  return (
                    <TableRow key={exam.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">{exam.title}</span>
                            <div className="text-xs text-slate-400">ID: {exam.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <span className="font-medium text-slate-800">{exam.subject}</span>
                        {exam.department && (
                          <span className="text-xs text-slate-500 block">{exam.department}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {exam.durationMinutes} mins
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                            {exam.mcqCount} MCQ
                          </Badge>
                          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                            <Code2 className="w-3 h-3 mr-1" />
                            {exam.codingCount} Coding
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isPublished ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <Clock className="w-3 h-3" />
                            Pending Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(exam.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openView(exam.id)}
                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(exam.id)}
                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                          {!isPublished && (
                            <span 
                              title="Question papers require Admin verification before activation"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md cursor-help"
                            >
                              <Lock className="w-3 h-3 text-amber-600" />
                              Admin Lock
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* CONFIRM PUBLISH MODAL */}
      {publishTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Exam Publication</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to publish <strong className="text-slate-900">"{publishTarget.title}"</strong>? Once published, this exam will become immediately visible and active for enrolled students.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setPublishTarget(null)}
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPublishing ? 'Publishing...' : 'Yes, Publish Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW / EDIT MODAL */}
      {selectedExam && viewMode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {viewMode === 'view' ? 'Exam Details' : 'Edit Question Paper'}: {selectedExam.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedExam.subject} • {selectedExam.durationMinutes} mins • {selectedExam.mcqQuestions?.length || 0} MCQ • {selectedExam.codingQuestions?.length || 0} Coding
                </p>
              </div>
              <button
                onClick={() => setViewMode(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* MCQ SECTION */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Multiple Choice Questions ({selectedExam.mcqQuestions?.length || 0})
                  </h4>
                </div>

                {(!selectedExam.mcqQuestions || selectedExam.mcqQuestions.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-50 text-slate-400 text-xs text-center border border-slate-100">
                    No MCQ questions added yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedExam.mcqQuestions.map((q, idx) => (
                      <div 
                        key={q.id || idx} 
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <span className="font-semibold text-sm text-slate-900">
                            Q{idx + 1}. {q.text}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                              {q.marks} Marks
                            </Badge>
                            {viewMode === 'edit' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteQuestion(q.id, 'mcq')}
                                className="h-7 px-2 text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-3">
                          {q.options?.map((opt: string, optIdx: number) => {
                            const isCorrect = optIdx === q.correctIndex;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-lg border text-slate-700 font-medium ${
                                  isCorrect 
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold' 
                                    : 'bg-slate-50/70 border-slate-200'
                                }`}
                              >
                                <span className="font-bold text-slate-500 mr-1.5">
                                  {['A', 'B', 'C', 'D'][optIdx]}:
                                </span>
                                {opt}
                                {isCorrect && (
                                  <span className="ml-1 text-emerald-600 font-bold">✓ (Correct)</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CODING SECTION */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-violet-600 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4" />
                    Coding Challenges ({selectedExam.codingQuestions?.length || 0})
                  </h4>
                </div>

                {(!selectedExam.codingQuestions || selectedExam.codingQuestions.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-50 text-slate-400 text-xs text-center border border-slate-100">
                    No coding questions added yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedExam.codingQuestions.map((q, idx) => (
                      <div 
                        key={q.id || idx} 
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-violet-200 transition-colors shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <span className="font-bold text-sm text-slate-900">
                              Task #{idx + 1}: {q.title}
                            </span>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{q.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-xs font-semibold">
                              {q.marks} Marks
                            </Badge>
                            {viewMode === 'edit' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteQuestion(q.id, 'coding')}
                                className="h-7 px-2 text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                          <span>Time Limit: <strong className="text-slate-700">{q.timeLimitMs}ms</strong></span>
                          <span>•</span>
                          <span>Memory Limit: <strong className="text-slate-700">{q.memoryLimitMB}MB</strong></span>
                          <span>•</span>
                          <span>Test Cases: <strong className="text-slate-700">{q.testCases?.length || 0}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <Button onClick={() => setViewMode(null)} className="bg-slate-900 hover:bg-slate-800 text-white">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
