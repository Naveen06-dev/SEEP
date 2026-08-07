import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, API_URL } from '../lib/api';
import { CodeEditor } from './CodeEditor';
import { RunConsole } from './RunConsole';
import { SubmissionSummary } from './SubmissionSummary';

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

export function StudentCodingQuestion({ attemptId, question }: Props) {
  const allowedLangs = (question.allowedLanguages?.length ? question.allowedLanguages : ['python', 'java', 'c']);
  const starterCode = question.starterCode || {};
  const sampleTestCases = question.sampleTestCases ?? question.testCases?.filter(tc => !tc.isHidden) ?? [];

  const [language, setLanguage] = useState(allowedLangs[0] || 'python');
  const [code, setCode] = useState(starterCode[language] || '');
  const [runResults, setRunResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [runMeta, setRunMeta] = useState<{ executionTimeMs?: number; memoryKb?: number }>({});

  useEffect(() => {
    const baseUrl = (API_URL || 'http://localhost:4000').replace('/api', '');
    const socket = io(baseUrl);
    socket.emit('join-attempt', attemptId);

    const interval = setInterval(() => {
      socket.emit('coding-autosave', { attemptId, codingQuestionId: question.id, language, sourceCode: code });
      api(`/api/attempts/${attemptId}/autosave`, {
        method: 'POST',
        body: JSON.stringify({ codingQuestionId: question.id, language, sourceCode: code })
      }).catch(() => {});
    }, 10000);

    api<any>(`/api/attempts/${attemptId}/autosave/${question.id}`).then((saved) => {
      if (saved?.sourceCode) {
        setCode(saved.sourceCode);
        setLanguage(saved.language);
      }
    }).catch(() => {});

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [attemptId, question.id]);

  useEffect(() => {
    setCode(starterCode[language] || '');
  }, [language]);

  const runCode = async () => {
    try {
      const data = await api<any>('/api/coding/run', {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id, language, sourceCode: code })
      });
      setRunResults(data.results || []);
      setRunMeta({ executionTimeMs: data.executionTimeMs, memoryKb: data.memoryKb });
    } catch (e) {
      console.error('Run error:', e);
    }
  };

  const submitCode = async () => {
    try {
      const data = await api<any>('/api/coding/submit', {
        method: 'POST',
        body: JSON.stringify({ attemptId, questionId: question.id, language, sourceCode: code })
      });
      setSummary(data);
    } catch (e) {
      console.error('Submit code error:', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Problem Statement */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{question.title}</h3>
          <span style={{ background: '#eef2ff', color: '#6366f1', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>{question.marks} marks</span>
        </div>
        <p style={{ margin: '0 0 1rem', color: '#475569', lineHeight: '1.65', fontSize: '0.95rem' }}>{question.description}</p>
        {question.inputFormat && (
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
            <strong style={{ color: '#334155', fontSize: '0.85rem' }}>📥 Input Format:</strong>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>{question.inputFormat}</p>
          </div>
        )}
        {question.outputFormat && (
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
            <strong style={{ color: '#334155', fontSize: '0.85rem' }}>📤 Output Format:</strong>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>{question.outputFormat}</p>
          </div>
        )}
        {question.constraints && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
            <strong style={{ color: '#92400e', fontSize: '0.85rem' }}>⚠️ Constraints:</strong>
            <p style={{ margin: '0.25rem 0 0', color: '#78350f', fontSize: '0.85rem' }}>{question.constraints}</p>
          </div>
        )}
        {sampleTestCases.length > 0 && (
          <div>
            <strong style={{ color: '#334155', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>🧪 Sample Test Cases:</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sampleTestCases.map((tc, idx) => (
                <div key={(tc as any).id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ background: '#f1f5f9', borderRadius: '6px', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>Input</div>
                    <code style={{ fontSize: '0.85rem', color: '#1e293b' }}>{tc.input}</code>
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: '6px', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', color: '#16a34a' }}>Expected Output</div>
                    <code style={{ fontSize: '0.85rem', color: '#15803d' }}>{tc.expectedOutput}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Language Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Language:</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
        >
          {allowedLangs.map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Code Editor */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <CodeEditor language={language} value={code} onChange={setCode} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={runCode}
          style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          ▶ Run Code
        </button>
        <button
          type="button"
          onClick={submitCode}
          style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}
        >
          ✓ Submit Solution
        </button>
      </div>

      <RunConsole results={runResults} {...runMeta} />
      {summary && (
        <SubmissionSummary
          score={summary.score}
          maxScore={summary.maxScore}
          passedCases={summary.passedCases}
          totalCases={summary.totalCases}
          executionTimeMs={summary.executionTimeMs}
          memoryKb={summary.memoryKb}
          language={language}
        />
      )}
    </div>
  );
}
