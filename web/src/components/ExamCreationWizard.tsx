import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ExamDraft, McqForm, CodingForm } from '../lib/api';
import { QuestionCountStep } from './QuestionCountStep';
import { MCQBuilder } from './MCQBuilder';
import { CodingQuestionBuilder } from './CodingQuestionBuilder';

type Props = { creatorId: string };

export function ExamCreationWizard({ creatorId }: Props) {
  const [step, setStep] = useState(1);
  const [examId, setExamId] = useState<string | null>(null);
  const [mcqCount, setMcqCount] = useState(0);
  const [codingCount, setCodingCount] = useState(0);
  const [savedCoding, setSavedCoding] = useState(0);
  const { register, handleSubmit } = useForm<ExamDraft>({
    defaultValues: {
      title: '',
      subject: '',
      department: '',
      durationMinutes: 60,
      negativeMarking: false,
      openBook: false,
      maxAttempts: 1,
      passingPercentage: 40,
      mcqCount: 0,
      codingCount: 0
    }
  });

  const createExam = handleSubmit(async (data) => {
    const exam = await api<{ id: string }>('/api/exams', {
      method: 'POST',
      body: JSON.stringify({ ...data, mcqCount, codingCount, creatorId })
    });
    setExamId(exam.id);
    setStep(2);
  });

  const saveMcq = async (questions: McqForm[]) => {
    if (!examId) return;
    await api(`/api/exams/${examId}/mcq`, { method: 'POST', body: JSON.stringify({ questions }) });
    setStep(codingCount > 0 ? 4 : 5);
  };

  const saveCoding = async (payload: CodingForm) => {
    if (!examId) return;
    await api('/api/coding/questions', { method: 'POST', body: JSON.stringify({ examId, ...payload }) });
    setSavedCoding((n) => n + 1);
  };

  const publish = async () => {
    if (!examId) return;
    await api(`/api/exams/${examId}/publish`, { method: 'POST' });
    alert('Exam published!');
  };

  return (
    <div className="page wizard">
      <h2>Exam Creation Wizard</h2>
      <div className="steps">Step {step} / 5</div>

      {step === 1 && (
        <form className="card" onSubmit={createExam}>
          <h3>Step 1 — Basic Details</h3>
          <input {...register('title', { required: true })} placeholder="Exam title" />
          <input {...register('subject', { required: true })} placeholder="Subject" />
          <input {...register('department')} placeholder="Department" />
          <input type="number" {...register('durationMinutes', { valueAsNumber: true })} placeholder="Duration (minutes)" />
          <input type="datetime-local" {...register('scheduleStart')} />
          <input type="datetime-local" {...register('scheduleEnd')} />
          <label><input type="checkbox" {...register('negativeMarking')} /> Negative marking</label>
          <label><input type="checkbox" {...register('openBook')} /> Open book</label>
          <input type="number" {...register('maxAttempts', { valueAsNumber: true })} placeholder="Max attempts" />
          <input type="number" {...register('passingPercentage', { valueAsNumber: true })} placeholder="Passing %" />
          <button type="submit">Next: Question Count</button>
        </form>
      )}

      {step === 2 && (
        <QuestionCountStep
          mcqCount={mcqCount}
          codingCount={codingCount}
          onNext={(mcq, coding) => {
            setMcqCount(mcq);
            setCodingCount(coding);
            setStep(mcq > 0 ? 3 : coding > 0 ? 4 : 5);
          }}
        />
      )}

      {step === 3 && mcqCount > 0 && <MCQBuilder count={mcqCount} onSubmit={saveMcq} />}

      {step === 4 && codingCount > 0 && examId && (
        <div>
          <h3>Step 4 — Coding Section ({savedCoding}/{codingCount} saved)</h3>
          {Array.from({ length: codingCount - savedCoding }, (_, i) => (
            <CodingQuestionBuilder key={i} index={savedCoding + i} onSave={saveCoding} />
          ))}
          {savedCoding >= codingCount && (
            <button type="button" onClick={() => setStep(5)}>Continue to Publish</button>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <h3>Step 5 — Publish</h3>
          <p>MCQ: {mcqCount} | Coding: {codingCount}</p>
          {codingCount === 0 && <p className="hint">No compiler UI will be shown to students.</p>}
          <button type="button" onClick={publish}>Publish Exam</button>
        </div>
      )}
    </div>
  );
}
