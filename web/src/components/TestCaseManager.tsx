import { useFieldArray, useForm } from 'react-hook-form';
import { TestCaseForm } from '../lib/api';

type Props = {
  testCases: TestCaseForm[];
  onChange: (cases: TestCaseForm[]) => void;
};

export function TestCaseManager({ testCases, onChange }: Props) {
  const { register, control, handleSubmit, watch } = useForm<{ cases: TestCaseForm[] }>({
    defaultValues: { cases: testCases.length ? testCases : [
      { input: '', expectedOutput: '', isHidden: false, weight: 1 },
      { input: '', expectedOutput: '', isHidden: true, weight: 2 }
    ]}
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'cases' });

  return (
    <div className="test-case-manager">
      <h4>Test Cases</h4>
      <p className="hint">Require at least 1 visible and 1 hidden test case.</p>
      {fields.map((field, i) => (
        <div key={field.id} className="card nested">
          <textarea {...register(`cases.${i}.input` as const)} placeholder="Input" required />
          <textarea {...register(`cases.${i}.expectedOutput` as const)} placeholder="Expected output" required />
          <label>
            <input type="checkbox" {...register(`cases.${i}.isHidden` as const)} /> Hidden test case
          </label>
          <input type="number" step="0.5" {...register(`cases.${i}.weight` as const, { valueAsNumber: true })} placeholder="Weight" />
          <button type="button" onClick={() => remove(i)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ input: '', expectedOutput: '', isHidden: false, weight: 1 })}>
        Add Test Case
      </button>
      <button type="button" onClick={handleSubmit((d) => onChange(d.cases))}>Apply Test Cases</button>
      <pre className="preview">{JSON.stringify(watch('cases'), null, 2)}</pre>
    </div>
  );
}
