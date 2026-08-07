import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

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
    alert('Question paper saved successfully in DRAFT status!');
    navigate('/teacher/exams');
  };

  const isMcqDone = mcqList.length >= setup.mcqCount;
  const isCodingDone = codingList.length >= setup.codingCount;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Add Question Paper</h2>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem' }}>
          Step-by-step examination builder with dynamic question generator & test case configuration
        </p>
      </div>

      {/* Wizard Progress Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: step === 1 ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: step === 1 ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            color: step === 1 ? '#818cf8' : '#9ca3af',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          Step 1: Exam Setup
        </div>
        <div
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: step === 2 ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: step === 2 ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            color: step === 2 ? '#818cf8' : '#9ca3af',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          Step 2: Question Builder
        </div>
      </div>

      {/* STEP 1: EXAM SETUP */}
      {step === 1 && (
        <form
          onSubmit={handleStep1Submit}
          style={{
            background: 'rgba(17, 24, 39, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Exam Blueprint & Rules</h3>

          {setupError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}>
              {setupError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Exam Title *</label>
              <input
                type="text"
                required
                value={setup.title}
                onChange={(e) => setSetup({ ...setup, title: e.target.value })}
                placeholder="e.g. Data Structures & Algorithms Midterm"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Subject *</label>
              <input
                type="text"
                required
                value={setup.subject}
                onChange={(e) => setSetup({ ...setup, subject: e.target.value })}
                placeholder="e.g. Computer Science 101"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Department</label>
              <input
                type="text"
                value={setup.department}
                onChange={(e) => setSetup({ ...setup, department: e.target.value })}
                placeholder="e.g. Computer Science"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Duration (Minutes) *</label>
              <input
                type="number"
                min="1"
                required
                value={setup.durationMinutes}
                onChange={(e) => setSetup({ ...setup, durationMinutes: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Number of MCQs</label>
              <input
                type="number"
                min="0"
                value={setup.mcqCount}
                onChange={(e) => setSetup({ ...setup, mcqCount: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Number of Coding Questions</label>
              <input
                type="number"
                min="0"
                value={setup.codingCount}
                onChange={(e) => setSetup({ ...setup, codingCount: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              {isSubmitting ? 'Creating Exam...' : 'Continue to Question Builder →'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: QUESTION BUILDER */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* MCQ SECTION FORM */}
          {setup.mcqCount > 0 && !isMcqDone && (
            <div
              style={{
                background: 'rgba(17, 24, 39, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#818cf8' }}>
                  MCQ Question {currentMcqIndex + 1} of {setup.mcqCount}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Saved: {mcqList.length} / {setup.mcqCount}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Question Statement *</label>
                  <textarea
                    rows={3}
                    value={currentMcq.question}
                    onChange={(e) => setCurrentMcq({ ...currentMcq, question: e.target.value })}
                    placeholder="Enter the multiple choice question statement..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Option A *</label>
                    <input
                      type="text"
                      value={currentMcq.optionA}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, optionA: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Option B *</label>
                    <input
                      type="text"
                      value={currentMcq.optionB}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, optionB: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Option C</label>
                    <input
                      type="text"
                      value={currentMcq.optionC}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, optionC: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Option D</label>
                    <input
                      type="text"
                      value={currentMcq.optionD}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, optionD: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Correct Option</label>
                    <select
                      value={currentMcq.correctAnswer}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, correctAnswer: e.target.value as any })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Marks</label>
                    <input
                      type="number"
                      min="1"
                      value={currentMcq.marks}
                      onChange={(e) => setCurrentMcq({ ...currentMcq, marks: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    onClick={handleSaveMcq}
                    style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save & {currentMcqIndex + 1 < setup.mcqCount ? 'Next MCQ' : 'Finish MCQs'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CODING QUESTION SECTION FORM */}
          {setup.codingCount > 0 && isMcqDone && !isCodingDone && (
            <div
              style={{
                background: 'rgba(17, 24, 39, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#a855f7' }}>
                  Coding Question {currentCodingIndex + 1} of {setup.codingCount}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Saved: {codingList.length} / {setup.codingCount}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Problem Title *</label>
                  <input
                    type="text"
                    value={currentCoding.title}
                    onChange={(e) => setCurrentCoding({ ...currentCoding, title: e.target.value })}
                    placeholder="e.g. Reverse an Array"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Question Description *</label>
                  <textarea
                    rows={4}
                    value={currentCoding.description}
                    onChange={(e) => setCurrentCoding({ ...currentCoding, description: e.target.value })}
                    placeholder="Write detailed problem statement, examples, and rules..."
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Input Format</label>
                    <input
                      type="text"
                      value={currentCoding.inputFormat}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, inputFormat: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Output Format</label>
                    <input
                      type="text"
                      value={currentCoding.outputFormat}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, outputFormat: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Constraints</label>
                    <input
                      type="text"
                      value={currentCoding.constraints}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, constraints: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Marks</label>
                    <input
                      type="number"
                      value={currentCoding.marks}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, marks: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Time Limit (ms)</label>
                    <input
                      type="number"
                      value={currentCoding.timeLimitMs}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, timeLimitMs: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Memory Limit (MB)</label>
                    <input
                      type="number"
                      value={currentCoding.memoryLimitMB}
                      onChange={(e) => setCurrentCoding({ ...currentCoding, memoryLimitMB: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                </div>

                {/* DYNAMIC TEST CASES FORM GENERATOR */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6' }}>Test Cases Generator</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Count:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={currentCoding.testCaseCount}
                        onChange={(e) => handleTestCaseCountChange(Number(e.target.value))}
                        style={{ width: '60px', padding: '0.3rem 0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {currentCoding.testCases.map((tc, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                          padding: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: tc.isHidden ? '#f87171' : '#34d399' }}>
                            Test Case #{idx + 1} ({tc.isHidden ? 'Hidden' : 'Visible / Sample'})
                          </span>
                          <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => {
                                const nextTCs = [...currentCoding.testCases];
                                nextTCs[idx].isHidden = e.target.checked;
                                setCurrentCoding({ ...currentCoding, testCases: nextTCs });
                              }}
                            />
                            Hidden Test Case
                          </label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <input
                            type="text"
                            placeholder="Input"
                            value={tc.input}
                            onChange={(e) => {
                              const nextTCs = [...currentCoding.testCases];
                              nextTCs[idx].input = e.target.value;
                              setCurrentCoding({ ...currentCoding, testCases: nextTCs });
                            }}
                            style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                          />
                          <input
                            type="text"
                            placeholder="Expected Output"
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const nextTCs = [...currentCoding.testCases];
                              nextTCs[idx].expectedOutput = e.target.value;
                              setCurrentCoding({ ...currentCoding, testCases: nextTCs });
                            }}
                            style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    onClick={handleSaveCoding}
                    style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save & {currentCodingIndex + 1 < setup.codingCount ? 'Next Coding Question' : 'Finish Coding Section'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ALL QUESTIONS FINISHED - FINAL SAVE DRAFT */}
          {isMcqDone && isCodingDone && (
            <div style={{ background: 'rgba(17, 24, 39, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ color: '#34d399', margin: '0 0 0.5rem 0' }}>All Questions Added Successfully!</h3>
              <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>Your question paper is ready to be stored in DRAFT status.</p>
              <button
                onClick={handleFinishExam}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Save Entire Question Paper (DRAFT)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
