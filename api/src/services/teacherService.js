import { prisma } from '../lib/prisma.js';

const MOCK_PROFILE = {
  id: 'user-teacher-1',
  name: 'John Doe',
  email: 'teacher@seep.com',
  department: 'Computer Science & Engineering',
  subject: 'Data Structures & Software Engineering',
  employeeId: 'FAC-CS101',
  lastLogin: new Date()
};

const MOCK_EXAMS = [
  {
    id: 'exam-demo-1',
    title: 'Manual Proctoring Test (1 MCQ + 1 Coding)',
    subject: 'Computer Science 101',
    department: 'Computer Science',
    durationMinutes: 60,
    scheduleStart: new Date(),
    scheduleEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'ACTIVE',
    mcqCount: 1,
    codingCount: 1,
    totalMarks: 20,
    creatorId: 'user-teacher-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    mcqQuestions: [
      {
        id: 'mcq-1',
        examId: 'exam-demo-1',
        sequenceOrder: 1,
        text: 'Which data structure operates on a LIFO (Last In First Out) basis?',
        options: ['Queue', 'Stack', 'Array', 'Linked List'],
        correctIndex: 1,
        marks: 5
      }
    ],
    codingQuestions: [
      {
        id: 'coding-1',
        examId: 'exam-demo-1',
        sequenceOrder: 1,
        title: 'Two Sum Problem',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
        inputFormat: 'Line 1: Space-separated integers\nLine 2: Target integer',
        outputFormat: 'Space-separated pair of indices',
        constraints: '1 <= nums.length <= 10^4',
        marks: 15,
        timeLimitMs: 2000,
        memoryLimitMB: 128,
        allowedLanguages: ['cpp', 'python', 'javascript', 'java'],
        starterCode: {
          cpp: '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "0 1" << endl;\n  return 0;\n}',
          python: 'def solve():\n    print("0 1")\n\nif __name__ == "__main__":\n    solve()',
          javascript: 'console.log("0 1");'
        },
        testCases: [
          { id: 'tc-1', input: '2 7 11 15\n9', expectedOutput: '0 1', isHidden: false, weight: 1 }
        ]
      }
    ]
  }
];

export async function getTeacherProfile(teacherId) {
  try {
    let user = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { OR: [{ role: 'TEACHER' }, { role: 'ADMIN' }] }
      });
    }
    if (!user) {
      return { ...MOCK_PROFILE, id: teacherId };
    }

    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      department: user.department || 'Computer Science & Engineering',
      subject: 'Data Structures & Software Engineering',
      employeeId: user.regNo || `FAC-${user.id.slice(0, 6).toUpperCase()}`,
      lastLogin: user.updatedAt || new Date()
    };
  } catch (err) {
    console.warn('DB connect error in getTeacherProfile, using mock fallback profile');
    return { ...MOCK_PROFILE, id: teacherId };
  }
}

export async function getTeacherExams(teacherId) {
  try {
    let user = await prisma.user.findUnique({ where: { id: teacherId } });
    const filterId = user ? user.id : teacherId;

    const exams = await prisma.exam.findMany({
      where: {
        OR: [
          { creatorId: filterId },
          { creator: { role: 'TEACHER' } },
          { creator: { role: 'ADMIN' } }
        ]
      },
      include: {
        mcqQuestions: true,
        codingQuestions: { include: { testCases: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return exams.length > 0 ? exams : MOCK_EXAMS;
  } catch (err) {
    console.warn('DB connect error in getTeacherExams, using mock fallback exams');
    return MOCK_EXAMS;
  }
}

export async function getTeacherExamById(examId) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        mcqQuestions: { orderBy: { sequenceOrder: 'asc' } },
        codingQuestions: {
          orderBy: { sequenceOrder: 'asc' },
          include: { testCases: true }
        }
      }
    });
    if (exam) return exam;
  } catch (err) {
    console.warn('DB connect error in getTeacherExamById');
  }
  const mock = MOCK_EXAMS.find(e => e.id === examId) || MOCK_EXAMS[0];
  return mock;
}

export async function createExam(teacherId, data) {
  const mcqCount = Number(data.mcqCount) || 0;
  const codingCount = Number(data.codingCount) || 0;
  if (mcqCount + codingCount <= 0) {
    throw new Error('Exam must have at least one MCQ or Coding question');
  }

  try {
    let user = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { OR: [{ role: 'TEACHER' }, { role: 'ADMIN' }] }
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: teacherId,
            email: `${teacherId}@seep.platform`,
            passwordHash: 'dummy',
            firstName: 'Teacher',
            lastName: 'Demo',
            role: 'TEACHER',
            department: data.department || 'Computer Science'
          }
        });
      }
    }

    return await prisma.exam.create({
      data: {
        title: data.title,
        subject: data.subject,
        department: data.department || 'Computer Science',
        durationMinutes: Number(data.durationMinutes) || 60,
        mcqCount,
        codingCount,
        status: 'DRAFT',
        creatorId: user.id
      }
    });
  } catch (err) {
    console.warn('DB connect error in createExam, returning mock exam');
    const mockExam = {
      id: `exam-${Date.now()}`,
      title: data.title,
      subject: data.subject,
      department: data.department || 'Computer Science',
      durationMinutes: Number(data.durationMinutes) || 60,
      mcqCount,
      codingCount,
      status: 'DRAFT',
      creatorId: teacherId,
      createdAt: new Date(),
      updatedAt: new Date(),
      mcqQuestions: [],
      codingQuestions: []
    };
    MOCK_EXAMS.unshift(mockExam);
    return mockExam;
  }
}

export async function saveExamMcqs(examId, questions) {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (exam) {
      await prisma.mcqQuestion.deleteMany({ where: { examId } });

      const created = [];
      let totalMarks = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const options = Array.isArray(q.options)
          ? q.options
          : [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);

        let correctIndex = q.correctIndex;
        if (typeof q.correctAnswer === 'string') {
          const map = { A: 0, B: 1, C: 2, D: 3 };
          correctIndex = map[q.correctAnswer.toUpperCase()] ?? 0;
        }

        const row = await prisma.mcqQuestion.create({
          data: {
            examId,
            sequenceOrder: i + 1,
            text: q.question || q.text,
            options,
            correctIndex: correctIndex ?? 0,
            marks: Number(q.marks) || 1
          }
        });
        totalMarks += row.marks;
        created.push(row);
      }

      await prisma.exam.update({
        where: { id: examId },
        data: { mcqCount: created.length }
      });

      return created;
    }
  } catch (err) {
    console.warn('DB error in saveExamMcqs, storing in mock');
  }

  const mockExam = MOCK_EXAMS.find(e => e.id === examId);
  if (mockExam) {
    mockExam.mcqQuestions = questions;
    mockExam.mcqCount = questions.length;
  }
  return questions;
}

export async function saveExamCoding(examId, payload) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { codingQuestions: true }
    });
    if (exam) {
      const existingCount = exam.codingQuestions.length;
      const testCases = payload.testCases || [];
      const allowedLanguages = payload.allowedLanguages || ['python', 'cpp', 'java', 'c', 'javascript'];
      const starterCode = payload.starterCode || {
        python: '# Write solution here\n',
        cpp: '#include <iostream>\nusing namespace std;\nint main() {\n  return 0;\n}\n',
        java: 'public class Main {\n  public static void main(String[] args) {}\n}\n'
      };

      const question = await prisma.codingQuestion.create({
        data: {
          examId,
          sequenceOrder: existingCount + 1,
          title: payload.title,
          description: payload.description,
          inputFormat: payload.inputFormat || 'Standard Input',
          outputFormat: payload.outputFormat || 'Standard Output',
          constraints: payload.constraints || 'None',
          marks: Number(payload.marks) || 10,
          timeLimitMs: Number(payload.timeLimitMs) || 2000,
          memoryLimitMB: Number(payload.memoryLimitMB) || 128,
          allowedLanguages,
          starterCode,
          testCases: {
            create: testCases.map((tc) => ({
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
              isHidden: Boolean(tc.isHidden),
              weight: Number(tc.weight) || 1
            }))
          }
        },
        include: { testCases: true }
      });

      await prisma.exam.update({
        where: { id: examId },
        data: { codingCount: existingCount + 1 }
      });

      return question;
    }
  } catch (err) {
    console.warn('DB error in saveExamCoding, storing in mock');
  }

  const mockExam = MOCK_EXAMS.find(e => e.id === examId);
  const mockQ = { id: `coding-${Date.now()}`, examId, ...payload };
  if (mockExam) {
    if (!mockExam.codingQuestions) mockExam.codingQuestions = [];
    mockExam.codingQuestions.push(mockQ);
    mockExam.codingCount = mockExam.codingQuestions.length;
  }
  return mockQ;
}

export async function updateTeacherExam(examId, data) {
  try {
    return await prisma.exam.update({
      where: { id: examId },
      data: {
        title: data.title,
        subject: data.subject,
        department: data.department,
        durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : undefined,
        mcqCount: data.mcqCount !== undefined ? Number(data.mcqCount) : undefined,
        codingCount: data.codingCount !== undefined ? Number(data.codingCount) : undefined
      }
    });
  } catch (err) {
    const mockExam = MOCK_EXAMS.find(e => e.id === examId);
    if (mockExam) {
      Object.assign(mockExam, data);
      return mockExam;
    }
    return { id: examId, ...data };
  }
}

export async function updateQuestion(questionId, type, data) {
  try {
    if (type === 'mcq') {
      const options = Array.isArray(data.options)
        ? data.options
        : [data.optionA, data.optionB, data.optionC, data.optionD].filter(Boolean);

      let correctIndex = data.correctIndex;
      if (typeof data.correctAnswer === 'string') {
        const map = { A: 0, B: 1, C: 2, D: 3 };
        correctIndex = map[data.correctAnswer.toUpperCase()] ?? 0;
      }

      return await prisma.mcqQuestion.update({
        where: { id: questionId },
        data: {
          text: data.question || data.text,
          options,
          correctIndex: correctIndex ?? 0,
          marks: Number(data.marks) || 1
        }
      });
    } else {
      if (data.testCases && Array.isArray(data.testCases)) {
        await prisma.codingTestCase.deleteMany({ where: { codingQuestionId: questionId } });
        await prisma.codingTestCase.createMany({
          data: data.testCases.map((tc) => ({
            codingQuestionId: questionId,
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isHidden: Boolean(tc.isHidden),
            weight: Number(tc.weight) || 1
          }))
        });
      }

      return await prisma.codingQuestion.update({
        where: { id: questionId },
        data: {
          title: data.title,
          description: data.description,
          inputFormat: data.inputFormat,
          outputFormat: data.outputFormat,
          constraints: data.constraints,
          marks: data.marks ? Number(data.marks) : undefined,
          timeLimitMs: data.timeLimitMs ? Number(data.timeLimitMs) : undefined,
          memoryLimitMB: data.memoryLimitMB ? Number(data.memoryLimitMB) : undefined,
          allowedLanguages: data.allowedLanguages
        },
        include: { testCases: true }
      });
    }
  } catch (err) {
    return { id: questionId, ...data };
  }
}

export async function deleteQuestion(questionId, type) {
  try {
    if (type === 'mcq') {
      const q = await prisma.mcqQuestion.findUnique({ where: { id: questionId } });
      if (q) {
        await prisma.mcqQuestion.delete({ where: { id: questionId } });
        await prisma.exam.update({
          where: { id: q.examId },
          data: { mcqCount: { decrement: 1 } }
        });
      }
    } else {
      const q = await prisma.codingQuestion.findUnique({ where: { id: questionId } });
      if (q) {
        await prisma.codingQuestion.delete({ where: { id: questionId } });
        await prisma.exam.update({
          where: { id: q.examId },
          data: { codingCount: { decrement: 1 } }
        });
      }
    }
  } catch (err) {
    console.warn('DB delete error, returning success for mock UI');
  }
  return { success: true };
}

export async function publishExam(examId, userRole = 'TEACHER') {
  const roleUpper = (userRole || 'TEACHER').toUpperCase();
  if (roleUpper !== 'ADMIN') {
    const err = new Error('Access denied: Only Administrators are authorized to publish question papers.');
    err.status = 403;
    throw err;
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { mcqQuestions: true, codingQuestions: { include: { testCases: true } } }
    });
    if (exam) {
      if (exam.codingQuestions.length > 0) {
        for (const cq of exam.codingQuestions) {
          if (!cq.testCases || cq.testCases.length === 0) {
            throw new Error(`Coding question "${cq.title}" requires at least one test case before publishing.`);
          }
          const vis = cq.testCases.filter((t) => !t.isHidden).length;
          if (vis === 0 && cq.testCases.length > 0) {
            await prisma.codingTestCase.update({
              where: { id: cq.testCases[0].id },
              data: { isHidden: false }
            });
          }
        }
      }

      return await prisma.exam.update({
        where: { id: examId },
        data: {
          status: 'ACTIVE',
          mcqCount: exam.mcqQuestions.length,
          codingCount: exam.codingQuestions.length
        }
      });
    }
  } catch (err) {
    if (err.status === 403) throw err;
    if (err.message && err.message.includes('requires at least one test case')) throw err;
    console.warn('DB publish error, setting mock exam to ACTIVE');
  }

  const mockExam = MOCK_EXAMS.find(e => e.id === examId);
  if (mockExam) {
    mockExam.status = 'ACTIVE';
    return mockExam;
  }
  return { id: examId, status: 'ACTIVE' };
}

export async function unpublishExam(examId, userRole = 'ADMIN') {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (exam) {
      return await prisma.exam.update({
        where: { id: examId },
        data: { status: 'DRAFT' }
      });
    }
  } catch (err) {
    console.warn('DB unpublish error, setting mock exam to DRAFT');
  }

  const mockExam = MOCK_EXAMS.find(e => e.id === examId);
  if (mockExam) {
    mockExam.status = 'DRAFT';
    return mockExam;
  }
  return { id: examId, status: 'DRAFT' };
}

import { mockAttempts } from './attemptStore.js';

export async function getTeacherResults(teacherId) {
  let dbResults = [];
  try {
    let user = await prisma.user.findUnique({ where: { id: teacherId } });
    const filterId = user ? user.id : teacherId;

    const exams = await prisma.exam.findMany({
      where: {
        OR: [
          { creatorId: filterId },
          { creator: { role: 'TEACHER' } },
          { creator: { role: 'ADMIN' } }
        ]
      },
      select: { id: true }
    });
    const examIds = exams.map((e) => e.id);

    const attempts = await prisma.examAttempt.findMany({
      where: examIds.length > 0 ? { examId: { in: examIds } } : undefined,
      include: {
        student: true,
        exam: true,
        codingSubmissions: true,
        proctorEvents: true
      },
      orderBy: { startedAt: 'desc' }
    });

    dbResults = attempts.map((att) => ({
      id: att.id,
      studentName: att.student ? `${att.student.firstName} ${att.student.lastName || ''}`.trim() : 'Student',
      regNo: att.student?.regNo || att.student?.id?.slice(0, 8) || 'N/A',
      examTitle: att.exam?.title || 'Exam',
      mcqScore: att.mcqScore ?? 0,
      codingScore: att.codingScore ?? 0,
      totalScore: att.totalScore ?? 0,
      status: att.status,
      malpractice: Boolean(att.malpractice || att.status === 'MALPRACTICE'),
      malpracticeType: att.malpracticeType,
      resultVisible: att.resultVisible,
      startedAt: att.startedAt,
      submittedAt: att.submittedAt,
      proctorEventsCount: att.proctorEvents?.length || 0
    }));
  } catch (err) {
    console.warn('DB connect error in getTeacherResults, using in-memory store');
  }

  // Merge any in-memory mock attempts not already in dbResults
  const dbIds = new Set(dbResults.map((r) => r.id));
  const fallbackList = Array.from(mockAttempts.values())
    .filter((a) => !dbIds.has(a.id))
    .map((att) => ({
      id: att.id,
      studentName: att.studentName || (att.student ? `${att.student.firstName} ${att.student.lastName || ''}`.trim() : 'Student'),
      regNo: att.regNo || att.student?.regNo || 'CS2026001',
      examTitle: att.examTitle || att.exam?.title || 'Examination',
      mcqScore: att.mcqScore ?? 0,
      codingScore: att.codingScore ?? 0,
      totalScore: att.totalScore ?? 0,
      status: att.status,
      malpractice: Boolean(att.malpractice || att.status === 'MALPRACTICE'),
      malpracticeType: att.malpracticeType,
      resultVisible: att.resultVisible !== false,
      startedAt: att.startedAt || new Date(),
      submittedAt: att.submittedAt || new Date(),
      proctorEventsCount: att.proctorEvents?.length || 0
    }));

  return [...dbResults, ...fallbackList];
}

export async function getAttemptDetails(attemptId) {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        exam: {
          include: {
            mcqQuestions: true,
            codingQuestions: { include: { testCases: true } }
          }
        },
        mcqAnswers: true,
        codingSubmissions: { include: { codingQuestion: true } },
        proctorEvents: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (attempt) {
      const mcqs = attempt.exam?.mcqQuestions || [];
      const answersMap = new Map((attempt.mcqAnswers || []).map((a) => [a.mcqQuestionId, a.selectedIndex]));

      const questionBreakdown = mcqs.map((q, idx) => {
        const selected = answersMap.get(q.id);
        const options = Array.isArray(q.options)
          ? q.options
          : typeof q.options === 'string'
          ? JSON.parse(q.options)
          : [];
        const isPassed = selected !== undefined && selected !== null && selected === q.correctIndex;
        return {
          id: q.id,
          sequence: idx + 1,
          question: q.text,
          options,
          selectedIndex: selected ?? null,
          selectedAnswer: selected !== undefined && options[selected] ? options[selected] : 'Not Answered',
          correctIndex: q.correctIndex,
          correctAnswer: options[q.correctIndex] || '',
          marks: q.marks || 1,
          score: isPassed ? (q.marks || 1) : 0,
          passed: isPassed
        };
      });

      const codingQuestions = attempt.exam?.codingQuestions || [];
      const codingBreakdown = codingQuestions.map((cq) => {
        const subs = (attempt.codingSubmissions || []).filter((s) => s.codingQuestionId === cq.id);
        let bestSub = null;
        for (const s of subs) {
          if (!bestSub || s.score > bestSub.score) {
            bestSub = s;
          }
        }
        return {
          id: cq.id,
          title: cq.title,
          maxMarks: cq.marks || 15,
          score: bestSub ? bestSub.score : 0,
          status: bestSub ? bestSub.status : 'NOT_ATTEMPTED',
          passedCases: bestSub ? bestSub.passedCases : 0,
          totalCases: bestSub ? bestSub.totalCases : (cq.testCases?.length || 0),
          language: bestSub?.language || null,
          sourceCode: bestSub?.sourceCode || null
        };
      });

      const maxMcqMarks = mcqs.reduce((s, q) => s + (q.marks || 1), 0);
      const maxCodingMarks = codingQuestions.reduce((s, q) => s + (q.marks || 15), 0);
      const totalMarks = (attempt.exam?.totalMarks && attempt.exam.totalMarks > 0) ? attempt.exam.totalMarks : (maxMcqMarks + maxCodingMarks);

      return {
        id: attempt.id,
        examId: attempt.examId,
        examTitle: attempt.exam?.title || 'Exam',
        subject: attempt.exam?.subject || 'Assessment',
        department: attempt.student?.department || attempt.exam?.department || 'Computer Science',
        studentId: attempt.studentId,
        studentName: attempt.student ? `${attempt.student.firstName} ${attempt.student.lastName || ''}`.trim() : 'Student',
        email: attempt.student?.email || 'N/A',
        regNo: attempt.student?.regNo || 'N/A',
        status: attempt.status,
        malpractice: Boolean(attempt.malpractice || attempt.status === 'MALPRACTICE'),
        malpracticeType: attempt.malpracticeType,
        mcqScore: attempt.mcqScore ?? 0,
        maxMcqMarks,
        codingScore: attempt.codingScore ?? 0,
        maxCodingMarks,
        totalScore: attempt.totalScore ?? 0,
        totalMarks,
        percentage: totalMarks > 0 ? Math.round(((attempt.totalScore ?? 0) / totalMarks) * 100) : 0,
        resultVisible: Boolean(attempt.resultVisible),
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        questionBreakdown,
        codingBreakdown,
        proctorEvents: (attempt.proctorEvents || []).map((pe) => ({
          id: pe.id,
          type: pe.type,
          metadata: pe.metadata,
          createdAt: pe.createdAt
        }))
      };
    }
  } catch (err) {
    console.warn('DB connect error in getAttemptDetails:', err.message);
  }

  // Fallback to in-memory store
  const mockAtt = Array.from(mockAttempts.values()).find((a) => a.id === attemptId) || mockAttempts.get(attemptId);
  if (mockAtt) {
    const demoExam = MOCK_EXAMS[0];
    const mcqs = demoExam.mcqQuestions || [];
    const questionBreakdown = mcqs.map((q, idx) => {
      const selected = mockAtt.mcqAnswers ? mockAtt.mcqAnswers[q.id] : 1;
      const isPassed = selected === q.correctIndex;
      return {
        id: q.id,
        sequence: idx + 1,
        question: q.text,
        options: q.options,
        selectedIndex: selected,
        selectedAnswer: q.options[selected] || 'Not Answered',
        correctIndex: q.correctIndex,
        correctAnswer: q.options[q.correctIndex] || '',
        marks: q.marks || 5,
        score: isPassed ? (q.marks || 5) : 0,
        passed: isPassed
      };
    });

    return {
      id: mockAtt.id,
      examId: mockAtt.examId || demoExam.id,
      examTitle: mockAtt.examTitle || demoExam.title,
      subject: demoExam.subject,
      department: mockAtt.department || 'Computer Science & Engineering',
      studentId: mockAtt.studentId || 'std-1',
      studentName: mockAtt.studentName || 'Student Candidate',
      email: mockAtt.email || 'student@seep.com',
      regNo: mockAtt.regNo || 'CS2026001',
      status: mockAtt.status || 'SUBMITTED',
      malpractice: Boolean(mockAtt.malpractice || mockAtt.status === 'MALPRACTICE'),
      malpracticeType: mockAtt.malpracticeType || (mockAtt.status === 'MALPRACTICE' ? 'PROCTORING_VIOLATION' : null),
      mcqScore: mockAtt.mcqScore ?? 5,
      maxMcqMarks: mockAtt.maxMcqMarks ?? 5,
      codingScore: mockAtt.codingScore ?? 0,
      maxCodingMarks: mockAtt.maxCodingMarks ?? 15,
      totalScore: mockAtt.totalScore ?? 5,
      totalMarks: mockAtt.totalMarks ?? 20,
      percentage: mockAtt.percentage ?? 25,
      resultVisible: mockAtt.resultVisible !== false,
      startedAt: mockAtt.startedAt || new Date(),
      submittedAt: mockAtt.submittedAt || new Date(),
      questionBreakdown,
      codingBreakdown: [
        {
          id: 'coding-1',
          title: 'Two Sum Problem',
          maxMarks: 15,
          score: mockAtt.codingScore ?? 0,
          status: (mockAtt.codingScore && mockAtt.codingScore > 0) ? 'ACCEPTED' : (mockAtt.status === 'MALPRACTICE' ? 'TERMINATED' : 'NOT_ATTEMPTED'),
          passedCases: mockAtt.codingScore ? 1 : 0,
          totalCases: 1,
          language: 'javascript'
        }
      ],
      proctorEvents: mockAtt.proctorEvents || (mockAtt.malpractice ? [
        { id: 'pe-demo', type: mockAtt.malpracticeType || 'TAB_SWITCH', metadata: { count: 1 }, createdAt: mockAtt.submittedAt || new Date() }
      ] : [])
    };
  }

  // Generic fallback if not found anywhere
  return {
    id: attemptId,
    examId: 'exam-demo-1',
    examTitle: 'Assessment Test',
    subject: 'Computer Science',
    department: 'Computer Science & Engineering',
    studentId: 'student-1',
    studentName: 'Alice Smith',
    email: 'alice@seep.com',
    regNo: 'CS2026001',
    status: 'SUBMITTED',
    malpractice: false,
    malpracticeType: null,
    mcqScore: 10,
    maxMcqMarks: 10,
    codingScore: 15,
    maxCodingMarks: 15,
    totalScore: 25,
    totalMarks: 25,
    percentage: 100,
    resultVisible: true,
    startedAt: new Date(Date.now() - 3600000),
    submittedAt: new Date(),
    questionBreakdown: [],
    codingBreakdown: [],
    proctorEvents: []
  };
}

export async function setResultVisibility(attemptId, visible) {
  try {
    return await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { resultVisible: Boolean(visible) }
    });
  } catch (err) {
    const att = mockAttempts.get(attemptId) || Array.from(mockAttempts.values()).find((a) => a.id === attemptId);
    if (att) {
      att.resultVisible = Boolean(visible);
    }
    return { id: attemptId, resultVisible: Boolean(visible) };
  }
}


