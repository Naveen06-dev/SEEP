// Shared in-memory store for attempts and results fallback
export const mockAttempts = new Map();

// Helper to seed initial sample attempts if empty
export function initSampleAttempts() {
  if (mockAttempts.size > 0) return;

  mockAttempts.set('res-1', {
    id: 'res-1',
    examId: 'exam-demo-1',
    studentId: 'std-1',
    studentName: 'Alice Smith',
    regNo: 'CS2026001',
    department: 'Computer Science & Engineering',
    examTitle: 'Data Structures & Algorithms Final',
    mcqScore: 10,
    maxMcqMarks: 10,
    codingScore: 15,
    maxCodingMarks: 15,
    totalScore: 25,
    totalMarks: 25,
    percentage: 100,
    status: 'SUBMITTED',
    resultVisible: true,
    malpractice: false,
    malpracticeType: null,
    startedAt: new Date(Date.now() - 3600000),
    submittedAt: new Date(Date.now() - 3000000),
    proctorEvents: []
  });

  mockAttempts.set('res-3', {
    id: 'res-3',
    examId: 'exam-demo-1',
    studentId: 'std-3',
    studentName: 'Charlie Brown',
    regNo: 'IT2026010',
    department: 'Information Technology',
    examTitle: 'Web Technologies Lab Exam',
    mcqScore: 5,
    maxMcqMarks: 20,
    codingScore: 0,
    maxCodingMarks: 15,
    totalScore: 5,
    totalMarks: 35,
    percentage: 14,
    status: 'MALPRACTICE',
    resultVisible: true,
    malpractice: true,
    malpracticeType: 'TAB_SWITCH',
    startedAt: new Date(Date.now() - 14400000),
    submittedAt: new Date(Date.now() - 14200000),
    proctorEvents: [
      { id: 'pe-1', type: 'TAB_SWITCH', metadata: { count: 1 }, createdAt: new Date(Date.now() - 14200000) }
    ]
  });
}

initSampleAttempts();
