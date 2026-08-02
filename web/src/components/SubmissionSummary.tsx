type Props = {
  score: number;
  maxScore: number;
  passedCases: number;
  totalCases: number;
  executionTimeMs?: number;
  memoryKb?: number;
  language: string;
};

export function SubmissionSummary({ score, maxScore, passedCases, totalCases, executionTimeMs, memoryKb, language }: Props) {
  return (
    <div className="submission-summary card">
      <h4>Submission Result</h4>
      <p>Passed: {passedCases} / {totalCases}</p>
      <p>Score: {score} / {maxScore}</p>
      <p>Language: {language}</p>
      <p>Execution time: {executionTimeMs ?? 0} ms</p>
      <p>Memory: {memoryKb ?? 0} KB</p>
      <p className="hint">Hidden test case inputs/outputs are not shown.</p>
    </div>
  );
}
