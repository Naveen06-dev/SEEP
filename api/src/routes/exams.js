import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  createExamWizard,
  saveMcqQuestions,
  saveCodingQuestion,
  publishExam,
  getExamForStudent
} from '../services/examService.js';
import { getCodingAnalytics } from '../services/codingService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        mcqQuestions: true,
        codingQuestions: { include: { testCases: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exams);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const creatorId = req.body.creatorId || req.user?.id;
    if (!creatorId) return res.status(400).json({ error: 'creatorId required' });
    const exam = await createExamWizard(req.body, creatorId);
    res.status(201).json(exam);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  const exam = await prisma.exam.findUnique({
    where: { id: req.params.id },
    include: {
      mcqQuestions: { orderBy: { sequenceOrder: 'asc' } },
      codingQuestions: {
        orderBy: { sequenceOrder: 'asc' },
        include: { testCases: true }
      }
    }
  });
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  res.json(exam);
});

router.put('/:id', async (req, res) => {
  try {
    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        subject: req.body.subject,
        department: req.body.department,
        durationMinutes: req.body.durationMinutes,
        scheduleStart: req.body.scheduleStart ? new Date(req.body.scheduleStart) : undefined,
        scheduleEnd: req.body.scheduleEnd ? new Date(req.body.scheduleEnd) : undefined,
        negativeMarking: req.body.negativeMarking,
        openBook: req.body.openBook,
        maxAttempts: req.body.maxAttempts,
        passingPercentage: req.body.passingPercentage
      }
    });
    res.json(exam);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/mcq', async (req, res) => {
  try {
    const questions = await saveMcqQuestions(req.params.id, req.body.questions);
    res.json({ questions });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const exam = await publishExam(req.params.id);
    res.json(exam);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id/student-view', async (req, res) => {
  const exam = await getExamForStudent(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found or not active' });
  res.json(exam);
});

router.get('/:id/coding-analytics', async (req, res) => {
  const analytics = await getCodingAnalytics(req.params.id);
  res.json({ analytics });
});

export default router;
