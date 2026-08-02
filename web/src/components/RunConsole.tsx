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

type Props = {
  results: RunResult[];
  executionTimeMs?: number;
  memoryKb?: number;
};

export function RunConsole({ results, executionTimeMs, memoryKb }: Props) {
  return (
    <div className="run-console">
      <h4>Run Output (visible test cases only)</h4>
      {executionTimeMs != null && <p>Time: {executionTimeMs}ms | Memory: {memoryKb ?? 0} KB</p>}
      {results.map((r, i) => (
        <div key={i} className={`run-result ${r.passed ? 'pass' : 'fail'}`}>
          <strong>Case {i + 1}</strong> {r.passed ? '✓ Passed' : '✗ Failed'}
          {r.compileError && <pre className="err">Compile: {r.compileError}</pre>}
          {r.runtimeError && <pre className="err">Runtime: {r.runtimeError}</pre>}
          <pre>stdout: {r.stdout}</pre>
          {r.stderr && <pre>stderr: {r.stderr}</pre>}
        </div>
      ))}
    </div>
  );
}
