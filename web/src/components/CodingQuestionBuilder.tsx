import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CodingForm } from '../lib/api';
import { TestCaseManager } from './TestCaseManager';

const DEFAULT_STARTER = {
  c: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n    }\n}\n',
  python: 'print(input())\n'
};

type Props = {
  index: number;
  onSave: (payload: CodingForm) => Promise<void>;
};

export function CodingQuestionBuilder({ index, onSave }: Props) {
  const [testCases, setTestCases] = useState([
    { input: 'hello', expectedOutput: 'hello', isHidden: false, weight: 1 },
    { input: 'secret', expectedOutput: 'secret', isHidden: true, weight: 2 }
  ]);
  const [langs, setLangs] = useState({ c: true, java: true, python: true });
  const { register, handleSubmit } = useForm<CodingForm>({
    defaultValues: {
      title: '',
      description: '',
      inputFormat: '',
      outputFormat: '',
      constraints: '',
      marks: 10,
      timeLimitMs: 2000,
      memoryLimitMB: 128,
      allowedLanguages: ['c', 'java', 'python'],
      starterCode: DEFAULT_STARTER,
      testCases
    }
  });

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        const visible = testCases.filter((t) => !t.isHidden).length;
        const hidden = testCases.filter((t) => t.isHidden).length;
        if (visible < 1 || hidden < 1) {
          alert('Add at least 1 visible and 1 hidden test case');
          return;
        }
        const allowedLanguages = Object.entries(langs).filter(([, v]) => v).map(([k]) => k);
        await onSave({ ...data, allowedLanguages, starterCode: DEFAULT_STARTER, testCases });
      })}
    >
      <h4>Coding Question {index + 1}</h4>
      <input {...register('title')} placeholder="Problem title" required />
      <textarea {...register('description')} placeholder="Problem description" required />
      <textarea {...register('inputFormat')} placeholder="Input format" required />
      <textarea {...register('outputFormat')} placeholder="Output format" required />
      <textarea {...register('constraints')} placeholder="Constraints" required />
      <input type="number" {...register('marks', { valueAsNumber: true })} placeholder="Marks" />
      <input type="number" {...register('timeLimitMs', { valueAsNumber: true })} placeholder="Time limit (ms)" />
      <input type="number" {...register('memoryLimitMB', { valueAsNumber: true })} placeholder="Memory limit (MB)" />

      <div className="lang-toggle">
        {(['c', 'java', 'python'] as const).map((lang) => (
          <label key={lang}>
            <input
              type="checkbox"
              checked={langs[lang]}
              onChange={(e) => setLangs({ ...langs, [lang]: e.target.checked })}
            />
            {lang.toUpperCase()}
          </label>
        ))}
      </div>

      <TestCaseManager testCases={testCases} onChange={setTestCases} />
      <button type="submit">Save Coding Question</button>
    </form>
  );
}
