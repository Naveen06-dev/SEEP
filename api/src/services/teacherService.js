import { prisma } from '../lib/prisma.js';

export async function getTeacherProfile(teacherId) {
  let user = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!user) {
    user = await prisma.user.findFirst({
      where: { OR: [{ role: 'TEACHER' }, { role: 'ADMIN' }] }
    });
  }
  if (!user) {
    throw new Error('Teacher profile not found');
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
}

export async function getTeacherExams(teacherId) {
  let user = await prisma.user.findUnique({ where: { id: teacherId } });
  const filterId = user ? user.id : teacherId;

  return prisma.exam.findMany({
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
}

export async function getTeacherExamById(examId) {
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
  if (!exam) throw new Error('Exam not found');
  return exam;
}

export async function createExam(teacherId, data) {
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

  const mcqCount = Number(data.mcqCount) || 0;
  const codingCount = Number(data.codingCount) || 0;
  if (mcqCount + codingCount <= 0) {
    throw new Error('Exam must have at least one MCQ or Coding question');
  }

  return prisma.exam.create({
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
}

export async function saveExamMcqs(examId, questions) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new Error('Exam not found');

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

export async function saveExamCoding(examId, payload) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { codingQuestions: true }
  });
  if (!exam) throw new Error('Exam not found');

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

export async function updateTeacherExam(examId, data) {
  return prisma.exam.update({
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
}

export async function updateQuestion(questionId, type, data) {
  if (type === 'mcq') {
    const options = Array.isArray(data.options)
      ? data.options
      : [data.optionA, data.optionB, data.optionC, data.optionD].filter(Boolean);

    let correctIndex = data.correctIndex;
    if (typeof data.correctAnswer === 'string') {
      const map = { A: 0, B: 1, C: 2, D: 3 };
      correctIndex = map[data.correctAnswer.toUpperCase()] ?? 0;
    }

    return prisma.mcqQuestion.update({
      where: { id: questionId },
      data: {
        text: data.question || data.text,
        options,
        correctIndex: correctIndex ?? 0,
        marks: Number(data.marks) || 1
      }
    });
  } else {
    // Coding question update
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

    return prisma.codingQuestion.update({
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
}

export async function deleteQuestion(questionId, type) {
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
  return { success: true };
}

export async function publishExam(examId) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { mcqQuestions: true, codingQuestions: { include: { testCases: true } } }
  });
  if (!exam) throw new Error('Exam not found');

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

  return prisma.exam.update({
    where: { id: examId },
    data: {
      status: 'ACTIVE',
      mcqCount: exam.mcqQuestions.length,
      codingCount: exam.codingQuestions.length
    }
  });
}

export async function getTeacherResults(teacherId) {
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

  return attempts.map((att) => ({
    id: att.id,
    studentName: att.student ? `${att.student.firstName} ${att.student.lastName || ''}`.trim() : 'Student',
    regNo: att.student?.regNo || att.student?.id?.slice(0, 8) || 'N/A',
    examTitle: att.exam?.title || 'Exam',
    mcqScore: att.mcqScore ?? 0,
    codingScore: att.codingScore ?? 0,
    totalScore: att.totalScore ?? 0,
    status: att.status,
    resultVisible: att.resultVisible,
    startedAt: att.startedAt,
    submittedAt: att.submittedAt
  }));
}

export async function getAttemptDetails(attemptId) {
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
      proctorEvents: true
    }
  });
  if (!attempt) throw new Error('Attempt not found');
  return attempt;
}

export async function setResultVisibility(attemptId, visible) {
  return prisma.examAttempt.update({
    where: { id: attemptId },
    data: { resultVisible: Boolean(visible) }
  });
}
