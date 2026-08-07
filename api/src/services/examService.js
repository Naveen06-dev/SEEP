import { prisma } from '../lib/prisma.js';

const DEFAULT_STARTER = {
  c: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n',
  python: '# Write your code here\n'
};

const inMemoryExams = new Map();

export async function createExamWizard(data, creatorId) {
  const { mcqCount = 0, codingCount = 0 } = data;
  if (mcqCount + codingCount <= 0) {
    throw new Error('Total question count must be greater than zero');
  }

  try {
    // Ensure creator user exists in database if database is connected
    let user = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { OR: [{ role: 'TEACHER' }, { role: 'ADMIN' }] }
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: creatorId,
            email: `${creatorId}@seep.platform`,
            passwordHash: 'dummy',
            firstName: 'Teacher',
            lastName: 'Demo',
            role: 'TEACHER'
          }
        });
      }
    }

    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        subject: data.subject,
        department: data.department,
        durationMinutes: data.durationMinutes,
        scheduleStart: data.scheduleStart ? new Date(data.scheduleStart) : null,
        scheduleEnd: data.scheduleEnd ? new Date(data.scheduleEnd) : null,
        negativeMarking: data.negativeMarking ?? false,
        openBook: data.openBook ?? false,
        maxAttempts: data.maxAttempts ?? 1,
        passingPercentage: data.passingPercentage ?? 40,
        mcqCount,
        codingCount,
        status: 'DRAFT',
        creatorId: user.id
      }
    });

    return exam;
  } catch (err) {
    console.error('Error creating exam in database:', err);
    throw err;
  }
}

export async function saveMcqQuestions(examId, questions) {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      if (!inMemoryExams.has(examId)) throw new Error('Exam not found');
    }
    await prisma.mcqQuestion.deleteMany({ where: { examId } });

    let totalMarks = 0;
    const created = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const row = await prisma.mcqQuestion.create({
        data: {
          examId,
          sequenceOrder: i + 1,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          marks: q.marks,
          negativeMarks: q.negativeMarks ?? 0,
          difficulty: q.difficulty,
          topic: q.topic
        }
      });
      totalMarks += q.marks;
      created.push(row);
    }
    return created;
  } catch (err) {
    const mockExam = inMemoryExams.get(examId) || {};
    mockExam.questions = questions;
    inMemoryExams.set(examId, mockExam);
    return questions;
  }
}

export async function saveCodingQuestion(examId, payload) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { codingQuestions: true }
    });
    if (!exam) {
      if (!inMemoryExams.has(examId)) throw new Error('Exam not found');
    }
    if (exam && exam.codingCount === 0) throw new Error('This exam has no coding section');

    const existingCount = exam ? exam.codingQuestions.length : 0;
    const testCases = payload.testCases || [];
    const allowedLanguages = payload.allowedLanguages || ['c', 'java', 'python'];
    const starterCode = payload.starterCode || {};
    for (const lang of allowedLanguages) {
      if (!starterCode[lang]) starterCode[lang] = DEFAULT_STARTER[lang] || '';
    }

    const question = await prisma.codingQuestion.create({
      data: {
        examId,
        sequenceOrder: existingCount + 1,
        title: payload.title,
        description: payload.description,
        inputFormat: payload.inputFormat,
        outputFormat: payload.outputFormat,
        constraints: payload.constraints,
        marks: payload.marks,
        timeLimitMs: payload.timeLimitMs ?? 2000,
        memoryLimitMB: payload.memoryLimitMB ?? 128,
        allowedLanguages,
        starterCode,
        testCases: {
          create: testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? false,
            weight: tc.weight ?? 1
          }))
        }
      },
      include: { testCases: true }
    });
    return question;
  } catch (err) {
    if (err.message && (err.message.includes('Exam not found') || err.message.includes('no coding section'))) {
      throw err;
    }
    const mockExam = inMemoryExams.get(examId) || {};
    if (!mockExam.codingQuestions) mockExam.codingQuestions = [];
    const mockQuestion = { id: `coding-${Date.now()}`, examId, ...payload };
    mockExam.codingQuestions.push(mockQuestion);
    inMemoryExams.set(examId, mockExam);
    return mockQuestion;
  }
}

export async function publishExam(examId) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { mcqQuestions: true, codingQuestions: { include: { testCases: true } } }
    });
    if (!exam) throw new Error('Exam not found');

    for (const cq of exam.codingQuestions) {
      const vis = cq.testCases.filter(t => !t.isHidden).length;
      if (vis === 0 && cq.testCases.length > 0) {
        await prisma.codingTestCase.update({
          where: { id: cq.testCases[0].id },
          data: { isHidden: false }
        });
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
  } catch (err) {
    console.error('Publish exam error:', err);
    throw err;
  }
}

export async function getExamForStudent(examId) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId, status: 'ACTIVE' },
    include: {
      mcqQuestions: { orderBy: { sequenceOrder: 'asc' } },
      codingQuestions: {
        orderBy: { sequenceOrder: 'asc' },
        include: { testCases: { where: { isHidden: false } } }
      }
    }
  });
  if (!exam) return null;

  return {
    ...exam,
    mcqQuestions: exam.mcqQuestions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
      marks: q.marks,
      sequenceOrder: q.sequenceOrder
    })),
    codingQuestions: exam.codingQuestions.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      inputFormat: q.inputFormat,
      outputFormat: q.outputFormat,
      constraints: q.constraints,
      marks: q.marks,
      timeLimitMs: q.timeLimitMs,
      memoryLimitMB: q.memoryLimitMB,
      allowedLanguages: q.allowedLanguages,
      starterCode: q.starterCode,
      sequenceOrder: q.sequenceOrder,
      sampleTestCases: q.testCases.map(tc => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput
      }))
    })),
    hasCodingSection: exam.codingCount > 0
  };
}
