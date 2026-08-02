import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

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
  const examId = examIdProp || params.examId || 'demo';
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    if (examId === 'demo') return;
    api<{ analytics: AnalyticsRow[] }>(`/api/exams/${examId}/coding-analytics`)
      .then((d) => setRows(d.analytics))
      .catch(() => setRows([]));
  }, [examId]);

  if (examId === 'demo') {
    return (
      <div className="page card">
        <h3>Coding Analytics</h3>
        <p>Publish an exam with coding questions, then open /teacher/analytics/:examId</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h3>Teacher Coding Analytics</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Question</th>
            <th>Avg Score</th>
            <th>Pass %</th>
            <th>Avg Time</th>
            <th>Avg Memory</th>
            <th>Top Language</th>
            <th>Submissions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.questionId}>
              <td>{r.title}</td>
              <td>{r.averageScore}</td>
              <td>{r.passPercentage}%</td>
              <td>{r.averageExecutionTimeMs} ms</td>
              <td>{r.averageMemoryKb} KB</td>
              <td>{r.mostCommonLanguage}</td>
              <td>{r.submissionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
