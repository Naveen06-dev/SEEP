import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ExamDraft, McqForm, CodingForm } from '../lib/api';
import { MCQBuilder } from './MCQBuilder';
import { CodingQuestionBuilder } from './CodingQuestionBuilder';

type Props = { creatorId: string };

export function ExamCreationWizard({ creatorId }: Props) {
  const [examId, setExamId] = useState<string | null>(null);
  const [mcqCount, setMcqCount] = useState(0);
  const [codingCount, setCodingCount] = useState(0);
  const [savedCoding, setSavedCoding] = useState(0);
  const [savedMcq, setSavedMcq] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

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

  const handleCreateExam = handleSubmit(async (data) => {
    try {
      setMcqCount(data.mcqCount || 0);
      setCodingCount(data.codingCount || 0);
      const exam = await api<{ id: string }>('/api/exams', {
        method: 'POST',
        body: JSON.stringify({ ...data, creatorId })
      });
      setExamId(exam.id);
      setIsCreated(true);
    } catch (err: any) {
      alert(err.message || 'Failed to create exam');
    }
  });

  const saveMcq = async (questions: McqForm[]) => {
    if (!examId) return;
    try {
      await api(`/api/exams/${examId}/mcq`, { method: 'POST', body: JSON.stringify({ questions }) });
      setSavedMcq(true);
      alert('MCQ Questions saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save MCQ questions');
    }
  };

  const saveCoding = async (payload: CodingForm) => {
    if (!examId) return;
    try {
      await api('/api/coding/questions', { method: 'POST', body: JSON.stringify({ examId, ...payload }) });
      setSavedCoding((n) => n + 1);
      alert('Coding Question saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save coding question');
    }
  };

  const publish = async () => {
    if (!examId) return;
    try {
      await api(`/api/exams/${examId}/publish`, { method: 'POST' });
      alert('Exam published successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to publish exam');
    }
  };

  return (
    <div className="page wizard">
      <h2>Exam Creation</h2>

      {!isCreated ? (
        <form className="card" onSubmit={handleCreateExam}>
          <h3>Exam Details & Setup</h3>
          <input {...register('title', { required: true })} placeholder="Exam title" />
          <input {...register('subject', { required: true })} placeholder="Subject" />
          <input {...register('department')} placeholder="Department" />
          <input type="number" {...register('durationMinutes', { valueAsNumber: true })} placeholder="Duration (minutes)" />
          
          <label>
            MCQ Question Count
            <input type="number" min="0" {...register('mcqCount', { valueAsNumber: true })} placeholder="MCQ Count" />
          </label>

          <label>
            Coding Question Count
            <input type="number" min="0" {...register('codingCount', { valueAsNumber: true })} placeholder="Coding Count" />
          </label>

          <label><input type="checkbox" {...register('openBook')} /> Open book</label>
          <input type="number" {...register('maxAttempts', { valueAsNumber: true })} placeholder="Max attempts" />
          <input type="number" {...register('passingPercentage', { valueAsNumber: true })} placeholder="Passing %" />
          
          <button type="submit">Create Exam</button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {mcqCount > 0 && (
            <div style={{ border: savedMcq ? '2px solid #22c55e' : 'none', borderRadius: '8px', padding: '0.5rem' }}>
              {savedMcq ? (
                <div className="card" style={{ backgroundColor: '#f0fdf4' }}>
                  <h3 style={{ color: '#15803d' }}>✓ MCQ Section Saved ({mcqCount} questions)</h3>
                  <button type="button" onClick={() => setSavedMcq(false)}>Edit MCQ Questions</button>
                </div>
              ) : (
                <MCQBuilder count={mcqCount} onSubmit={saveMcq} />
              )}
            </div>
          )}

          {codingCount > 0 && (
            <div>
              <h3>Coding Section ({savedCoding}/{codingCount} saved)</h3>
              {savedCoding >= codingCount ? (
                <div className="card" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                  <h3>✓ All {codingCount} Coding Questions Saved</h3>
                </div>
              ) : (
                Array.from({ length: codingCount - savedCoding }, (_, i) => (
                  <CodingQuestionBuilder key={savedCoding + i} index={savedCoding + i} onSave={saveCoding} />
                ))
              )}
            </div>
          )}

          <div className="card">
            <h3>Publish Exam</h3>
            <p>MCQ: {savedMcq ? 'Saved' : `${mcqCount} Pending`} | Coding: {savedCoding}/{codingCount} Saved</p>
            {codingCount === 0 && <p className="hint">No compiler UI will be shown to students.</p>}
            <button type="button" onClick={publish}>Publish Exam</button>
          </div>
        </div>
      )}
    </div>
  );
}

