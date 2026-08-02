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
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  marks: number;
  allowedLanguages: string[];
  starterCode: Record<string, string>;
  sampleTestCases: { id: string; input: string; expectedOutput: string }[];
};

type Props = {
  attemptId: string;
  question: CodingQuestion;
};

export function StudentCodingQuestion({ attemptId, question }: Props) {
  const [language, setLanguage] = useState(question.allowedLanguages[0] || 'python');
  const [code, setCode] = useState(question.starterCode[language] || '');
  const [runResults, setRunResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [runMeta, setRunMeta] = useState<{ executionTimeMs?: number; memoryKb?: number }>({});

  useEffect(() => {
    const socket = io(API_URL.replace('/api', '').replace(':4000', ':4000') || 'http://localhost:4000');
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
  }, [attemptId, question.id, language, code]);

  useEffect(() => {
    setCode(question.starterCode[language] || '');
  }, [language, question.starterCode]);

  const runCode = async () => {
    const data = await api<any>('/api/coding/run', {
      method: 'POST',
      body: JSON.stringify({ questionId: question.id, language, sourceCode: code })
    });
    setRunResults(data.results || []);
    setRunMeta({ executionTimeMs: data.executionTimeMs, memoryKb: data.memoryKb });
  };

  const submitCode = async () => {
    const data = await api<any>('/api/coding/submit', {
      method: 'POST',
      body: JSON.stringify({ attemptId, questionId: question.id, language, sourceCode: code })
    });
    setSummary(data);
  };

  return (
    <div className="student-coding card">
      <h3>{question.title}</h3>
      <p>{question.description}</p>
      <p><strong>Input:</strong> {question.inputFormat}</p>
      <p><strong>Output:</strong> {question.outputFormat}</p>
      <p><strong>Constraints:</strong> {question.constraints}</p>
      <div>
        <h4>Sample Test Cases</h4>
        {question.sampleTestCases.map((tc) => (
          <pre key={tc.id}>In: {tc.input} → Out: {tc.expectedOutput}</pre>
        ))}
      </div>

      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        {question.allowedLanguages.map((l) => (
          <option key={l} value={l}>{l.toUpperCase()}</option>
        ))}
      </select>

      <CodeEditor language={language} value={code} onChange={setCode} />
      <div className="actions">
        <button type="button" onClick={runCode}>Run</button>
        <button type="button" onClick={submitCode}>Submit</button>
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
