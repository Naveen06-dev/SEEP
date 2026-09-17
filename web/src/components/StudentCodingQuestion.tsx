import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, API_URL } from '../lib/api';
import { CodeEditor } from './CodeEditor';

type CodingQuestion = {
  id: string;
  title: string;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  marks: number;
  allowedLanguages?: string[];
  starterCode?: Record<string, string>;
  sampleTestCases?: { id: string; input: string; expectedOutput: string }[];
  testCases?: { id: string; input: string; expectedOutput: string; isHidden?: boolean }[];
};

type Props = {
  attemptId: string;
  question: CodingQuestion;
};

type RunResult = {
  testCaseId?: string;
  input?: string;
  expectedOutput?: string;
  stdout?: string;
  stderr?: string;
  compileError?: string | null;
  runtimeError?: string | null;
  passed?: boolean;
  executionTimeMs?: number;
  memoryKb?: number;
};

type SubmissionResult = {
  submissionId: string;
  score: number;
  maxScore: number;
  passedCases: number;
  totalCases: number;
  executionTimeMs: number;
  memoryKb: number;
  status: 'ACCEPTED' | 'PARTIAL' | 'COMPILED' | 'REJECTED';
  compileError?: string | null;
  runtimeError?: string | null;
};

export function StudentCodingQuestion({ attemptId, question }: Props) {
  const allowedLangs = question.allowedLanguages?.length ? question.allowedLanguages : ['python', 'c', 'cpp', 'java', 'javascript'];
  const starterCode = question.starterCode || {
    python: '# Write your code in Python\nimport sys\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    if not lines: return\n    # Process inputs here\n\nif __name__ == "__main__":\n    main()\n',
    c: '#include <stdio.h>\n\nint main() {\n    // Read input and produce output\n    return 0;\n}\n',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input and produce output\n    return 0;\n}\n',
    java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input and produce output\n    }\n}\n',
    javascript: 'const fs = require("fs");\nconst input = fs.readFileSync(0, "utf-8");\n// Process input and console.log output\n'
  };

  const sampleTestCases = question.sampleTestCases ?? question.testCases?.filter(tc => !tc.isHidden) ?? [];

  const [language, setLanguage] = useState(allowedLangs[0] || 'python');
  const [code, setCode] = useState(starterCode[language] || starterCode.python || '');
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [runMeta, setRunMeta] = useState<{ executionTimeMs?: number; memoryKb?: number }>({});
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'run' | 'submission'>('run');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Autosave & socket setup
  useEffect(() => {
    const baseUrl = (API_URL || 'http://localhost:4000').replace('/api', '');
    const socket = io(baseUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3,
      timeout: 5000,
      autoConnect: true
    });

    socket.on('connect_error', () => {});
    socket.emit('join-attempt', attemptId);

    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('coding-autosave', { attemptId, codingQuestionId: question.id, language, sourceCode: code });
      }
      api(`/api/attempts/${attemptId}/autosave`, {
        method: 'POST',
        body: JSON.stringify({ codingQuestionId: question.id, language, sourceCode: code })
      }).catch(() => {});
    }, 10000);

    api<any>(`/api/attempts/${attemptId}/autosave/${question.id}`).then((saved) => {
      if (saved?.sourceCode) {
        setCode(saved.sourceCode);
        if (saved.language && allowedLangs.includes(saved.language)) {
          setLanguage(saved.language);
        }
      }
    }).catch(() => {});

    return () => {
      clearInterval(interval);
      try {
        socket.off('connect_error');
        socket.disconnect();
      } catch (e) {}
    };
  }, [attemptId, question.id]);

  // Update starter code when changing language if editor is empty or matches prior template
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (!code.trim() || Object.values(starterCode).includes(code)) {
      setCode(starterCode[newLang] || '');
    }
  };

  const handleResetCode = () => {
    if (confirm('Reset editor to default starter code? Any unsaved edits will be replaced.')) {
      setCode(starterCode[language] || '');
    }
  };

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setGlobalError(null);
    setConsoleTab('run');

    try {
      const data = await api<any>('/api/coding/run', {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id, language, sourceCode: code })
      });
      setRunResults(data.results || []);
      setRunMeta({ executionTimeMs: data.executionTimeMs, memoryKb: data.memoryKb });
      setSelectedCaseIdx(0);
    } catch (e: any) {
      setGlobalError(e.message || 'Execution failed. Please verify syntax.');
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    setConsoleTab('submission');

    try {
      const data = await api<SubmissionResult>('/api/coding/submit', {
        method: 'POST',
        body: JSON.stringify({ attemptId, questionId: question.id, language, sourceCode: code })
      });
      setSubmission(data);
    } catch (e: any) {
      setGlobalError(e.message || 'Submission failed. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentResult = runResults[selectedCaseIdx] || null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(340px, 1fr) minmax(450px, 1.25fr)',
      gap: '1.25rem',
      height: 'calc(100vh - 120px)',
      minHeight: '620px'
    }}>
      {/* ── LEFT COLUMN: Question & Test Cases ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.75rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        {/* Header & Marks */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                Coding Challenge
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                ID: {question.id.slice(0, 8)}
              </span>
            </div>
            <span style={{
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '0.3rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 800
            }}>
              +{question.marks} Marks
            </span>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
            {question.title}
          </h2>
        </div>

        {/* Problem Description */}
        <div style={{
          color: '#334155',
          fontSize: '0.94rem',
          lineHeight: 1.7,
          whiteSpace: 'pre-line',
          background: '#f8fafc',
          border: '1px solid #f1f5f9',
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          {question.description}
        </div>

        {/* Formats & Constraints */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {question.inputFormat && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                📥 Input Format
              </div>
              <p style={{ margin: 0, color: '#1e293b', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {question.inputFormat}
              </p>
            </div>
          )}

          {question.outputFormat && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                📤 Output Format
              </div>
              <p style={{ margin: 0, color: '#1e293b', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {question.outputFormat}
              </p>
            </div>
          )}

          {question.constraints && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                ⚡ Constraints
              </div>
              <p style={{ margin: 0, color: '#92400e', fontSize: '0.88rem', lineHeight: 1.5, fontFamily: "'Fira Code', monospace" }}>
                {question.constraints}
              </p>
            </div>
          )}
        </div>

        {/* Sample Test Cases */}
        {sampleTestCases.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              🧪 Sample Test Cases
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sampleTestCases.map((tc, idx) => (
                <div key={(tc as any).id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '0.45rem 0.85rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    Sample Case #{idx + 1}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#ffffff' }}>
                    <div style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Input
                      </div>
                      <pre style={{ margin: 0, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.84rem', color: '#0f172a', whiteSpace: 'pre-wrap', background: '#f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                        {tc.input || '(empty)'}
                      </pre>
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Expected Output
                      </div>
                      <pre style={{ margin: 0, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.84rem', color: '#15803d', whiteSpace: 'pre-wrap', background: '#f0fdf4', padding: '0.5rem', borderRadius: '6px' }}>
                        {tc.expectedOutput}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT COLUMN: Code Editor, Action Bar & Test Runner ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        {/* Top Action Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1.25rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Language:
            </span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {allowedLangs.map((l) => (
                <option key={l} value={l}>
                  {l === 'cpp' ? 'C++' : l === 'c' ? 'C (GCC)' : l === 'python' ? 'Python 3' : l === 'java' ? 'Java (JDK)' : l === 'javascript' ? 'JavaScript (Node.js)' : l.toUpperCase()}
                </option>
              ))}
            </select>
            <button
              onClick={handleResetCode}
              title="Reset starter template"
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ↺ Reset
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={runCode}
              disabled={isRunning || isSubmitting}
              style={{
                background: isRunning ? '#e2e8f0' : '#f0fdf4',
                color: isRunning ? '#94a3b8' : '#16a34a',
                border: '1px solid #bbf7d0',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: isRunning ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              {isRunning ? '⏳ Running...' : '▶ Run Code'}
            </button>

            <button
              type="button"
              onClick={submitCode}
              disabled={isRunning || isSubmitting}
              style={{
                background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 2px 8px rgba(37,99,235,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              {isSubmitting ? '⏳ Evaluating...' : '✓ Submit Solution'}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div style={{ flex: 1, minHeight: '300px', position: 'relative' }}>
          <CodeEditor
            language={language}
            value={code}
            onChange={setCode}
            theme="light"
            height="100%"
          />
        </div>

        {/* Global Error Banner if any */}
        {globalError && (
          <div style={{ background: '#fef2f2', borderTop: '1px solid #fecaca', padding: '0.65rem 1.25rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
            ⚠️ {globalError}
          </div>
        )}

        {/* Bottom Console Tabs & Output Area */}
        <div style={{
          height: '240px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Console Header / Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 1rem'
          }}>
            <div style={{ display: 'flex' }}>
              <button
                onClick={() => setConsoleTab('run')}
                style={{
                  padding: '0.6rem 1rem',
                  border: 'none',
                  borderBottom: consoleTab === 'run' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'transparent',
                  color: consoleTab === 'run' ? '#2563eb' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Test Results {runResults.length > 0 && `(${runResults.filter(r => r.passed).length}/${runResults.length} Passed)`}
              </button>

              <button
                onClick={() => setConsoleTab('submission')}
                style={{
                  padding: '0.6rem 1rem',
                  border: 'none',
                  borderBottom: consoleTab === 'submission' ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'transparent',
                  color: consoleTab === 'submission' ? '#2563eb' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                Submission Verdict
                {submission && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px',
                    background: submission.status === 'ACCEPTED' ? '#ecfdf5' : '#fef2f2',
                    color: submission.status === 'ACCEPTED' ? '#059669' : '#dc2626',
                    fontWeight: 800
                  }}>
                    {submission.status}
                  </span>
                )}
              </button>
            </div>

            {/* Execution Meta info */}
            {consoleTab === 'run' && runMeta.executionTimeMs != null && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                ⚡ {runMeta.executionTimeMs} ms
              </div>
            )}
          </div>

          {/* Console Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1rem' }}>
            {consoleTab === 'run' && (
              runResults.length === 0 ? (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.88rem' }}>
                  Click &ldquo;Run Code&rdquo; to execute your solution against visible test cases.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Case Pill Selectors */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {runResults.map((r, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCaseIdx(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          border: selectedCaseIdx === idx ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: selectedCaseIdx === idx ? '#eff6ff' : '#f8fafc',
                          color: r.passed ? '#059669' : '#dc2626',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{r.passed ? '✓' : '✗'}</span>
                        <span>Case {idx + 1}</span>
                      </button>
                    ))}
                  </div>

                  {/* Active Case Details */}
                  {currentResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {currentResult.compileError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>
                            Compilation Error:
                          </div>
                          <pre style={{ margin: 0, color: '#991b1b', fontSize: '0.82rem', fontFamily: "'Fira Code', monospace", whiteSpace: 'pre-wrap' }}>
                            {currentResult.compileError}
                          </pre>
                        </div>
                      )}

                      {currentResult.runtimeError && (
                        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.65rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', marginBottom: '0.25rem' }}>
                            Runtime Error:
                          </div>
                          <pre style={{ margin: 0, color: '#9a3412', fontSize: '0.82rem', fontFamily: "'Fira Code', monospace", whiteSpace: 'pre-wrap' }}>
                            {currentResult.runtimeError}
                          </pre>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                            Input
                          </div>
                          <pre style={{ margin: 0, background: '#f1f5f9', padding: '0.45rem', borderRadius: '6px', fontSize: '0.8rem', color: '#1e293b', maxHeight: '75px', overflowY: 'auto' }}>
                            {currentResult.input || '(none)'}
                          </pre>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                            Expected Output
                          </div>
                          <pre style={{ margin: 0, background: '#f0fdf4', padding: '0.45rem', borderRadius: '6px', fontSize: '0.8rem', color: '#15803d', maxHeight: '75px', overflowY: 'auto' }}>
                            {currentResult.expectedOutput || '(none)'}
                          </pre>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: currentResult.passed ? '#16a34a' : '#dc2626', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                            Your Output
                          </div>
                          <pre style={{ margin: 0, background: currentResult.passed ? '#f0fdf4' : '#fef2f2', padding: '0.45rem', borderRadius: '6px', fontSize: '0.8rem', color: currentResult.passed ? '#15803d' : '#991b1b', maxHeight: '75px', overflowY: 'auto' }}>
                            {currentResult.stdout || '(no output)'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {consoleTab === 'submission' && (
              !submission ? (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.88rem' }}>
                  Click &ldquo;Submit Solution&rdquo; to evaluate all test cases and compute your final score.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: submission.status === 'ACCEPTED' ? '#ecfdf5' : submission.status === 'PARTIAL' ? '#eff6ff' : '#fef2f2',
                    border: `1px solid ${submission.status === 'ACCEPTED' ? '#a7f3d0' : submission.status === 'PARTIAL' ? '#bfdbfe' : '#fecaca'}`,
                    padding: '0.75rem 1rem',
                    borderRadius: '10px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: submission.status === 'ACCEPTED' ? '#059669' : submission.status === 'PARTIAL' ? '#2563eb' : '#dc2626'
                      }}>
                        {submission.status === 'ACCEPTED' ? '🎉 All Test Cases Passed!' : submission.status === 'PARTIAL' ? '⚠️ Partially Accepted' : '❌ Solution Rejected'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Passed {submission.passedCases} of {submission.totalCases} test cases (including hidden cases)
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                        {submission.score} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ {submission.maxScore} marks</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Execution time: {submission.executionTimeMs} ms
                      </div>
                    </div>
                  </div>

                  {submission.compileError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>
                        Compilation Error:
                      </div>
                      <pre style={{ margin: 0, color: '#991b1b', fontSize: '0.82rem', fontFamily: "'Fira Code', monospace", whiteSpace: 'pre-wrap' }}>
                        {submission.compileError}
                      </pre>
                    </div>
                  )}

                  {submission.runtimeError && (
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.65rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', marginBottom: '0.25rem' }}>
                        Runtime Error:
                      </div>
                      <pre style={{ margin: 0, color: '#9a3412', fontSize: '0.82rem', fontFamily: "'Fira Code', monospace", whiteSpace: 'pre-wrap' }}>
                        {submission.runtimeError}
                      </pre>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
