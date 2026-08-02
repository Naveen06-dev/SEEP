import { useForm, useFieldArray } from 'react-hook-form';
import { McqForm } from '../lib/api';

type Props = {
  count: number;
  onSubmit: (questions: McqForm[]) => void;
};

export function MCQBuilder({ count, onSubmit }: Props) {
  const { register, control, handleSubmit } = useForm<{ questions: McqForm[] }>({
    defaultValues: {
      questions: Array.from({ length: count }, () => ({
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        marks: 1,
        negativeMarks: 0,
        difficulty: 'medium',
        topic: ''
      }))
    }
  });

  const { fields } = useFieldArray({ control, name: 'questions' });

  return (
    <form className="builder" onSubmit={handleSubmit((d) => onSubmit(d.questions))}>
      <h3>MCQ Section ({count} questions)</h3>
      {fields.map((field, qi) => (
        <div key={field.id} className="card">
          <h4>MCQ {qi + 1}</h4>
          <textarea {...register(`questions.${qi}.text` as const)} placeholder="Question text" required />
          {[0, 1, 2, 3].map((oi) => (
            <input key={oi} {...register(`questions.${qi}.options.${oi}` as const)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} required />
          ))}
          <label>
            Correct answer
            <select {...register(`questions.${qi}.correctIndex` as const, { valueAsNumber: true })}>
              {[0, 1, 2, 3].map((i) => (
                <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>
              ))}
            </select>
          </label>
          <input type="number" step="0.5" {...register(`questions.${qi}.marks` as const, { valueAsNumber: true })} placeholder="Marks" />
          <input {...register(`questions.${qi}.topic` as const)} placeholder="Topic" />
        </div>
      ))}
      <button type="submit">Save MCQ Questions</button>
    </form>
  );
}
