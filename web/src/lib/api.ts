export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
  } catch (err) {
    // If port 4000 backend isn't listening, retry on main express server port 3000
    res = await fetch(`http://localhost:3000${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data as T;
}

export type ExamDraft = {
  id?: string;
  title: string;
  subject: string;
  department?: string;
  durationMinutes: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  negativeMarking: boolean;
  openBook: boolean;
  maxAttempts: number;
  passingPercentage: number;
  mcqCount: number;
  codingCount: number;
};

export type McqForm = {
  text: string;
  options: string[];
  correctIndex: number;
  marks: number;
  negativeMarks?: number;
  difficulty?: string;
  topic?: string;
};

export type TestCaseForm = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
};

export type CodingForm = {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  marks: number;
  timeLimitMs: number;
  memoryLimitMB: number;
  allowedLanguages: string[];
  starterCode: Record<string, string>;
  testCases: TestCaseForm[];
};
