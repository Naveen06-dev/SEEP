import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  FilePlus2, 
  Layers, 
  Code2, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Sparkles, 
  Check, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  ChevronRight
} from 'lucide-react';

type Step1Data = {
  title: string;
  subject: string;
  department: string;
  durationMinutes: number;
  mcqCount: number;
  codingCount: number;
};

type McqItem = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  marks: number;
};

type TestCaseItem = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
};

type CodingItem = {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  marks: number;
  timeLimitMs: number;
  memoryLimitMB: number;
  allowedLanguages: string[];
  testCaseCount: number;
  testCases: TestCaseItem[];
};

export function AddQuestionPaper() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [examId, setExamId] = useState<string | null>(null);

  // Step 1 state
  const [setup, setSetup] = useState<Step1Data>({
    title: '',
    subject: '',
    department: 'Computer Science',
    durationMinutes: 60,
    mcqCount: 2,
    codingCount: 1
  });
  const [setupError, setSetupError] = useState('');

  // Step 2 state
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [mcqList, setMcqList] = useState<McqItem[]>([]);
  const [currentMcq, setCurrentMcq] = useState<McqItem>({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    marks: 2
  });

  const [currentCodingIndex, setCurrentCodingIndex] = useState(0);
  const [codingList, setCodingList] = useState<CodingItem[]>([]);
  const [currentCoding, setCurrentCoding] = useState<CodingItem>({
    title: '',
    description: '',
    inputFormat: 'Standard Input',
    outputFormat: 'Standard Output',
    constraints: '1 <= N <= 10^5',
    marks: 10,
    timeLimitMs: 2000,
    memoryLimitMB: 128,
    allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
    testCaseCount: 2,
    testCases: [
      { input: '2 7 11 15\n9', expectedOutput: '2 7', isHidden: false },
      { input: '3 2 4\n6', expectedOutput: '2 4', isHidden: true }
    ]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 Handle
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    if (setup.durationMinutes <= 0) {
      setSetupError('Duration must be greater than 0 minutes');
      return;
    }
    if (setup.mcqCount < 0 || setup.codingCount < 0) {
      setSetupError('Question counts cannot be negative');
      return;
    }
    if (setup.mcqCount + setup.codingCount === 0) {
      setSetupError('At least one MCQ or Coding question must exist');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api<{ id: string }>('/api/teacher/exams', {
        method: 'POST',
        body: JSON.stringify(setup)
      });
      setExamId(res.id);
      setStep(2);
    } catch (err: any) {
      setSetupError(err.message || 'Failed to create exam setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic testcase form generator
  const handleTestCaseCountChange = (count: number) => {
    const validCount = Math.max(1, count);
    const newTestCases: TestCaseItem[] = [];
    for (let i = 0; i < validCount; i++) {
      newTestCases.push(
        currentCoding.testCases[i] || {
          input: '',
          expectedOutput: '',
          isHidden: i >= 1
        }
      );
    }
    setCurrentCoding((prev) => ({
      ...prev,
      testCaseCount: validCount,
      testCases: newTestCases
    }));
  };

  const handleSaveMcq = async () => {
    if (!currentMcq.question || !currentMcq.optionA || !currentMcq.optionB) {
      alert('Please fill out question text and options A & B');
      return;
    }

    const updatedList = [...mcqList, currentMcq];
    setMcqList(updatedList);

    if (examId) {
      try {
        await api(`/api/teacher/exams/${examId}/mcq`, {
          method: 'POST',
          body: JSON.stringify({ questions: updatedList })
        });
      } catch (e) {
        console.error('Failed to save MCQ batch', e);
      }
    }

    if (currentMcqIndex + 1 < setup.mcqCount) {
      setCurrentMcqIndex((n) => n + 1);
      setCurrentMcq({
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A',
        marks: 2
      });
    } else {
      alert('All MCQ questions saved!');
    }
  };

  const handleSaveCoding = async () => {
    if (!currentCoding.title || !currentCoding.description) {
      alert('Please provide title and problem description');
      return;
    }

    if (examId) {
      try {
        await api(`/api/teacher/exams/${examId}/coding`, {
          method: 'POST',
          body: JSON.stringify(currentCoding)
        });
      } catch (e) {
        console.error('Failed to save coding question', e);
      }
    }

    const updatedList = [...codingList, currentCoding];
    setCodingList(updatedList);

    if (currentCodingIndex + 1 < setup.codingCount) {
      setCurrentCodingIndex((n) => n + 1);
      setCurrentCoding({
        title: '',
        description: '',
        inputFormat: 'Standard Input',
        outputFormat: 'Standard Output',
        constraints: 'None',
        marks: 10,
        timeLimitMs: 2000,
        memoryLimitMB: 128,
        allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
        testCaseCount: 2,
        testCases: [
          { input: '', expectedOutput: '', isHidden: false },
          { input: '', expectedOutput: '', isHidden: true }
        ]
      });
    } else {
      alert('All Coding questions saved!');
    }
  };

  const handleFinishExam = () => {
    alert('Question paper saved successfully! Submitted for Admin approval & publication.');
    navigate('/teacher/exams');
  };

  const isMcqDone = mcqList.length >= setup.mcqCount;
  const isCodingDone = codingList.length >= setup.codingCount;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <FilePlus2 className="w-6 h-6 text-indigo-600" />
          Create Question Paper
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure examination blueprint and build multiple-choice questions & coding problem sets
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            step === 1 
              ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' 
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
            step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            1
          </div>
          <div>
            <div className="font-semibold text-sm">Exam Setup & Metadata</div>
            <div className="text-xs text-slate-400">Title, duration, question counts</div>
          </div>
        </div>

        <div 
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            step === 2 
              ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' 
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
            step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            2
          </div>
          <div>
            <div className="font-semibold text-sm">Question Paper Builder</div>
            <div className="text-xs text-slate-400">MCQs and coding problems</div>
          </div>
        </div>
      </div>

      {/* STEP 1: EXAM SETUP */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Exam Blueprint & Parameters</CardTitle>
            <CardDescription>
              Define the title, target department, test duration, and question quotas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1Submit} className="space-y-5">
              {setupError && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{setupError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Exam Title *
                  </label>
                  <Input
                    type="text"
                    required
                    value={setup.title}
                    onChange={(e) => setSetup({ ...setup, title: e.target.value })}
                    placeholder="e.g. Data Structures & Algorithms Midterm"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subject Code / Name *
                  </label>
                  <Input
                    type="text"
                    required
                    value={setup.subject}
                    onChange={(e) => setSetup({ ...setup, subject: e.target.value })}
                    placeholder="e.g. CS201 - Advanced Algorithms"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <Input
                    type="text"
                    value={setup.department}
                    onChange={(e) => setSetup({ ...setup, department: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Duration (Minutes) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={setup.durationMinutes}
                    onChange={(e) => setSetup({ ...setup, durationMinutes: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Number of MCQ Questions
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={setup.mcqCount}
                    onChange={(e) => setSetup({ ...setup, mcqCount: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs text-slate-400 mt-1 block">Objective multiple-choice format</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Number of Coding Questions
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={setup.codingCount}
                    onChange={(e) => setSetup({ ...setup, codingCount: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs text-slate-400 mt-1 block">Programming tasks with automated test runner</span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6"
                >
                  {isSubmitting ? 'Creating Blueprint...' : 'Continue to Question Builder'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: QUESTION BUILDER */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Status summary pill */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-slate-500">Exam: <strong className="text-slate-900">{setup.title}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isMcqDone ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                MCQs: {mcqList.length}/{setup.mcqCount} {isMcqDone && '✓'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isCodingDone ? 'bg-emerald-500' : 'bg-violet-500'}`} />
                Coding: {codingList.length}/{setup.codingCount} {isCodingDone && '✓'}
              </span>
            </div>
          </div>

          {/* MCQ SECTION FORM */}
          {setup.mcqCount > 0 && !isMcqDone && (
            <Card className="border-indigo-100 shadow-sm">
              <CardHeader className="bg-indigo-50/40 border-b border-indigo-100/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-base">
                      MCQ Question {currentMcqIndex + 1} of {setup.mcqCount}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                    Saved {mcqList.length} / {setup.mcqCount}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Question Statement *
                  </label>
                  <textarea
                    rows={3}
                    value={currentMcq.question}
                    onChange={(e) => setCurrentMcq({ ...currentMcq, question: e.target.value })}
                    placeholder="Enter the multiple choice question statement..."
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 placeholder:text-slate-400 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Option A *
                    </label>
                    <Input
                      type="text"
                      value={currentMcq.optionA}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, optionA: e.target.value })}
                      placeholder="Option A answer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Option B *
                    </label>
                    <Input
                      type="text"
                      value={currentMcq.optionB}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, optionB: e.target.value })}
                      placeholder="Option B answer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Option C
                    </label>
                    <Input
                      type="text"
                      value={currentMcq.optionC}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, optionC: e.target.value })}
                      placeholder="Option C answer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Option D
                    </label>
                    <Input
                      type="text"
                      value={currentMcq.optionD}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, optionD: e.target.value })}
                      placeholder="Option D answer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Correct Answer Option
                    </label>
                    <select
                      value={currentMcq.correctAnswer}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, correctAnswer: e.target.value as any })}
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Question Marks
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={currentMcq.marks}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, marks: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4">
                  <Button
                    onClick={handleSaveMcq}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                  >
                    Save & {currentMcqIndex + 1 < setup.mcqCount ? 'Next MCQ Question' : 'Complete MCQs'}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CODING QUESTION SECTION FORM */}
          {setup.codingCount > 0 && isMcqDone && !isCodingDone && (
            <Card className="border-violet-100 shadow-sm">
              <CardHeader className="bg-violet-50/40 border-b border-violet-100/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-violet-900">
                    <Code2 className="w-5 h-5 text-violet-600" />
                    <CardTitle className="text-base">
                      Coding Challenge {currentCodingIndex + 1} of {setup.codingCount}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-200">
                    Saved {codingList.length} / {setup.codingCount}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Problem Title *
                  </label>
                  <Input
                    type="text"
                    value={currentCoding.title}
                    onChange={(e) => setCurrentCoding({ ...currentCoding, title: e.target.value })}
                    placeholder="e.g. Reverse an Array / Two Sum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Problem Description & Examples *
                  </label>
                  <textarea
                    rows={4}
                    value={currentCoding.description}
                    onChange={(e) => setCurrentCoding({ ...currentCoding, description: e.target.value })}
                    placeholder="Describe problem statement, input specification, and sample test cases..."
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-slate-900 placeholder:text-slate-400 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Input Format
                    </label>
                    <Input
                      type="text"
                      value={currentCoding.inputFormat}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, inputFormat: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Output Format
                    </label>
                    <Input
                      type="text"
                      value={currentCoding.outputFormat}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, outputFormat: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Constraints
                    </label>
                    <Input
                      type="text"
                      value={currentCoding.constraints}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, constraints: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Question Marks
                    </label>
                    <Input
                      type="number"
                      value={currentCoding.marks}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, marks: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Time Limit (ms)
                    </label>
                    <Input
                      type="number"
                      value={currentCoding.timeLimitMs}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, timeLimitMs: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Memory Limit (MB)
                    </label>
                    <Input
                      type="number"
                      value={currentCoding.memoryLimitMB}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, memoryLimitMB: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* TEST CASES GENERATOR */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Test Cases Generator</h4>
                      <p className="text-xs text-slate-500">Provide input/output pairs for the auto-evaluator</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Count:</span>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={currentCoding.testCaseCount}
                        onChange={(e) => handleTestCaseCountChange(Number(e.target.value))}
                        className="w-16 h-8 text-xs text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentCoding.testCases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            Test Case #{idx + 1}
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => {
                                const nextTCs = [...currentCoding.testCases];
                                nextTCs[idx].isHidden = e.target.checked;
                                setCurrentCoding({ ...currentCoding, testCases: nextTCs });
                              }}
                              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />
                            {tc.isHidden ? (
                              <span className="text-rose-600 flex items-center gap-1">
                                <EyeOff className="w-3.5 h-3.5" />
                                Hidden Test Case
                              </span>
                            ) : (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                Visible / Sample
                              </span>
                            )}
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            type="text"
                            placeholder="Input (stdin)"
                            value={tc.input}
                            onChange={(e) => {
                              const nextTCs = [...currentCoding.testCases];
                              nextTCs[idx].input = e.target.value;
                              setCurrentCoding({ ...currentCoding, testCases: nextTCs });
                            }}
                            className="bg-white text-xs font-mono"
                          />
                          <Input
                            type="text"
                            placeholder="Expected Output (stdout)"
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const nextTCs = [...currentCoding.testCases];
                              nextTCs[idx].expectedOutput = e.target.value;
                              setCurrentCoding({ ...currentCoding, testCases: nextTCs });
                            }}
                            className="bg-white text-xs font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4">
                  <Button
                    onClick={handleSaveCoding}
                    className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
                  >
                    Save & {currentCodingIndex + 1 < setup.codingCount ? 'Next Coding Problem' : 'Complete Coding Questions'}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ALL QUESTIONS FINISHED - SAVE DRAFT */}
          {isMcqDone && isCodingDone && (
            <Card className="border-emerald-200 bg-emerald-50/30 text-center py-8">
              <CardContent className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">All Questions Successfully Added!</h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
                    Your question paper has been fully configured and is ready to be saved as a Draft for Admin review and activation.
                  </p>
                </div>
                <Button
                  onClick={handleFinishExam}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 shadow-sm"
                >
                  Save Question Paper (Draft)
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
