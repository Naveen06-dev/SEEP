import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const studentId = req.headers['x-student-id'] || req.query.studentId;
    const attempts = await prisma.examAttempt.findMany({
      where: studentId ? { OR: [{ studentId }, { student: { role: 'STUDENT' } }] } : undefined,
      include: {
        exam: true,
        student: true
      },
      orderBy: { startedAt: 'desc' }
    });
    res.json(attempts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    let { studentId } = req.body;
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    let student = null;
    if (studentId) {
      student = await prisma.user.findUnique({ where: { id: studentId } });
    }
    if (!student) {
      student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    }
    if (!student) {
      student = await prisma.user.create({
        data: {
          email: `student-${Date.now()}@seep.student`,
          passwordHash: 'auto',
          firstName: 'Student',
          lastName: 'User',
          role: 'STUDENT'
        }
      });
    }

    const validStudentId = student.id;

    let attempt = await prisma.examAttempt.findFirst({
      where: { examId: exam.id, studentId: validStudentId }
    });

    if (attempt?.status === 'MALPRACTICE') {
      return res.status(403).json({ error: 'Malpractice detected. Request retest from teacher.' });
    }

    if (!attempt) {
      attempt = await prisma.examAttempt.create({
        data: { examId: exam.id, studentId: validStudentId, status: 'IN_PROGRESS' }
      });
    }

    res.json({ attemptId: attempt.id, examId: exam.id });
  } catch (e) {
    console.error('Start attempt error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const { mcqAnswers } = req.body;
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: req.params.id },
      include: { exam: { include: { mcqQuestions: true } } }
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    // Calculate MCQ score
    let mcqScore = 0;
    if (mcqAnswers && attempt.exam?.mcqQuestions) {
      for (const q of attempt.exam.mcqQuestions) {
        if (mcqAnswers[q.id] !== undefined && mcqAnswers[q.id] === q.correctIndex) {
          mcqScore += q.marks || 1;
        }
      }
    }

    const updated = await prisma.examAttempt.update({
      where: { id: req.params.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        mcqScore,
        totalScore: mcqScore
      }
    });

    res.json({ success: true, mcqScore, totalScore: updated.totalScore });
  } catch (e) {
    console.error('Submit attempt error:', e);
    res.status(400).json({ error: e.message });
  }
});



router.post('/:id/autosave', async (req, res) => {
  try {
    const { codingQuestionId, language, sourceCode, cursorPosition } = req.body;
    const autosave = await prisma.codingAutosave.upsert({
      where: {
        attemptId_codingQuestionId: {
          attemptId: req.params.id,
          codingQuestionId
        }
      },
      create: {
        attemptId: req.params.id,
        codingQuestionId,
        language,
        sourceCode,
        cursorPosition
      },
      update: { language, sourceCode, cursorPosition, savedAt: new Date() }
    });
    res.json({ savedAt: autosave.savedAt });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id/autosave/:questionId', async (req, res) => {
  const autosave = await prisma.codingAutosave.findUnique({
    where: {
      attemptId_codingQuestionId: {
        attemptId: req.params.id,
        codingQuestionId: req.params.questionId
      }
    }
  });
  res.json(autosave || null);
});

router.post('/:id/proctor', async (req, res) => {
  try {
    const { studentId, type, metadata } = req.body;
    const event = await prisma.proctorEvent.create({
      data: {
        attemptId: req.params.id,
        studentId,
        type,
        metadata: metadata || {}
      }
    });

    const terminateTypes = ['TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_PASTE', 'EXTENSION_DETECTED'];
    if (terminateTypes.includes(type)) {
      await prisma.examAttempt.update({
        where: { id: req.params.id },
        data: {
          status: 'MALPRACTICE',
          malpractice: true,
          malpracticeType: type,
          submittedAt: new Date()
        }
      });
    }

    res.json({ event, terminated: terminateTypes.includes(type) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
