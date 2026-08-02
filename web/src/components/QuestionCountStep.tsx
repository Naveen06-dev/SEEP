type Props = {
  mcqCount: number;
  codingCount: number;
  onNext: (mcqCount: number, codingCount: number) => void;
};

export function QuestionCountStep({ mcqCount, codingCount, onNext }: Props) {
  return (
    <div className="card">
      <h3>Step 2 — Question Count</h3>
      <p>Specify how many MCQ and coding questions this exam will contain.</p>
      <label>
        Number of MCQ questions
        <input id="mcq-count" type="number" min={0} defaultValue={mcqCount} />
      </label>
      <label>
        Number of Coding questions
        <input id="coding-count" type="number" min={0} defaultValue={codingCount} />
      </label>
      <button
        type="button"
        onClick={() => {
          const mcq = parseInt((document.getElementById('mcq-count') as HTMLInputElement).value, 10) || 0;
          const coding = parseInt((document.getElementById('coding-count') as HTMLInputElement).value, 10) || 0;
          if (mcq + coding <= 0) {
            alert('Total questions must be greater than zero');
            return;
          }
          onNext(mcq, coding);
        }}
      >
        Continue
      </button>
    </div>
  );
}
