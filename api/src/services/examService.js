import { prisma } from '../lib/prisma.js';

const DEFAULT_STARTER = {
  c: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n',
  python: '# Write your code here\n'
};

export async function createExamWizard(data, creatorId) {
  const { mcqCount = 0, codingCount = 0 } = data;
  if (mcqCount + codingCount <= 0) {
    throw new Error('Total question count must be greater than zero');
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
      creatorId
    }
  });

  return exam;
}

export async function saveMcqQuestions(examId, questions) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new Error('Exam not found');
  if (questions.length !== exam.mcqCount) {
    throw new Error(`Expected ${exam.mcqCount} MCQ questions, received ${questions.length}`);
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

  if (exam.codingCount === 0) {
    await prisma.exam.update({ where: { id: examId }, data: { totalMarks } });
  }

  return created;
}

export async function saveCodingQuestion(examId, payload) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { codingQuestions: true }
  });
  if (!exam) throw new Error('Exam not found');
  if (exam.codingCount === 0) throw new Error('This exam has no coding section');

  const existingCount = exam.codingQuestions.length;
  if (existingCount >= exam.codingCount) {
    throw new Error(`Maximum ${exam.codingCount} coding questions allowed`);
  }

  const testCases = payload.testCases || [];
  const visible = testCases.filter(t => !t.isHidden);
  const hidden = testCases.filter(t => t.isHidden);
  if (visible.length < 1) throw new Error('At least 1 visible test case required');
  if (hidden.length < 1) throw new Error('At least 1 hidden test case required');

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

  const allCoding = await prisma.codingQuestion.findMany({ where: { examId } });
  const mcqMarks = await prisma.mcqQuestion.aggregate({ where: { examId }, _sum: { marks: true } });
  const codingMarks = allCoding.reduce((s, q) => s + q.marks, 0);
  await prisma.exam.update({
    where: { id: examId },
    data: { totalMarks: (mcqMarks._sum.marks || 0) + codingMarks }
  });

  return question;
}

export async function publishExam(examId) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { mcqQuestions: true, codingQuestions: { include: { testCases: true } } }
  });
  if (!exam) throw new Error('Exam not found');

  if (exam.mcqQuestions.length !== exam.mcqCount) {
    throw new Error(`Complete all ${exam.mcqCount} MCQ questions before publishing`);
  }
  if (exam.codingCount > 0) {
    if (exam.codingQuestions.length !== exam.codingCount) {
      throw new Error(`Complete all ${exam.codingCount} coding questions before publishing`);
    }
    for (const cq of exam.codingQuestions) {
      const vis = cq.testCases.filter(t => !t.isHidden).length;
      const hid = cq.testCases.filter(t => t.isHidden).length;
      if (vis < 1 || hid < 1) throw new Error(`Question "${cq.title}" needs visible and hidden test cases`);
    }
  }

  return prisma.exam.update({ where: { id: examId }, data: { status: 'ACTIVE' } });
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
