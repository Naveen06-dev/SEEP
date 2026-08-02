import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.post('/:id/start', async (req, res) => {
  try {
    const { studentId } = req.body;
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam || exam.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Exam not available' });
    }

    let attempt = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId } }
    });

    if (attempt?.status === 'MALPRACTICE') {
      return res.status(403).json({ error: 'Malpractice detected. Request retest from teacher.' });
    }
    if (attempt?.status === 'SUBMITTED') {
      return res.status(400).json({ error: 'Exam already submitted' });
    }

    if (!attempt) {
      attempt = await prisma.examAttempt.create({
        data: { examId: exam.id, studentId, status: 'IN_PROGRESS' }
      });
    }

    res.json({ attemptId: attempt.id, examId: exam.id });
  } catch (e) {
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
